import type { EntityId } from "../../shared/ids";
import type { Action } from "./types";
import type { AnyEffect } from "../effects/types";
import type { DamageType, Entity, GameState, SaveKind } from "../types";
import type { Rng } from "../rng";
import { attackHits } from "../combat/attack";
import { effectiveAc, isFlanking } from "../combat/flanking";
import { canTargetAlly, canTargetEnemy, isInRange } from "../combat/range";
import { isAdjacent, isInBounds, isTileBlocked, isTileOccupied } from "../combat/grid";
import { findStepPath } from "../combat/path";
import { coneTiles } from "../combat/cone";
import { adjustDamage } from "../combat/damage";
import { basicSaveDamage, rollSave } from "../combat/save";
import {
  PERSISTENT_DAMAGE_FLAT_CHECK_DC,
  attackRollPenalty,
  canMove,
  conditionValue,
  dcPenalty,
  hasCondition,
  persistentDamageEntries,
  savePenalty,
  turnStartActions,
} from "../combat/conditions";
import { coneSpellDef, damageSpellDef, healSpellDef, spellRank } from "../characters/subset";
import type { SpellId } from "../characters/subset";

export interface ResolveResult {
  effects: AnyEffect[];
  events?: never;
}

function rollDice(rng: Rng, count: number, sides: number): number[] {
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    rolls.push(rng.integer(1, sides));
  }
  return rolls;
}

function sumDice(rolls: number[], modifier: number): number {
  return Math.max(0, rolls.reduce((sum, roll) => sum + roll, 0) + modifier);
}

function weaponLabel(count: number, sides: number, modifier: number): string {
  const mod = modifier >= 0 ? `+${modifier}` : `${modifier}`;
  return `${count}d${sides}${mod}`;
}

export function resolveAction(action: Action, state: GameState, rng: Rng): ResolveResult {
  switch (action.kind) {
    case "Step":
      return resolveStep(action, state, rng);
    case "Strike":
      return resolveStrike(action, state, rng);
    case "CastSpell":
      return resolveCastSpell(action, state, rng);
    case "CastHeal":
      return resolveCastHeal(action, state, rng);
    case "CastConeSpell":
      return resolveCastConeSpell(action, state, rng);
    case "Stand":
      return resolveStand(action, state);
    case "EndTurn":
      return resolveEndTurn(action, state, rng);
  }
}

/**
 * Slot enforcement is opt-in (rules/srd/spell-slots.md): entities without a
 * spellSlots pool cast unrestricted (frozen M7 contracts). Cantrips never
 * consume slots. Font slots are spent before regular ones.
 */
function findSlotToSpend(actor: Entity, spellId: SpellId): { slotId: string } | "none" | null {
  if (!actor.spellSlots || spellRank(spellId) === 0) return null;
  const candidates = actor.spellSlots.filter(
    (slot) => !slot.expended && slot.preparedSpellId === spellId,
  );
  if (candidates.length === 0) return "none";
  const font = candidates.find((slot) => slot.fontOnly);
  return { slotId: (font ?? candidates[0]!).id };
}

/**
 * Reactive Strike triggers along a move path (rules/srd/reactive-strike.md,
 * HOUSE RULE: every melee-armed combatant threatens). The trigger is leaving
 * the reactor's reach: position i adjacent to the reactor, position i+1 not.
 * Returns each ready reactor's first trigger, ordered by path position.
 */
function findReactionTriggers(
  state: GameState,
  moverId: EntityId,
  fullPath: { x: number; y: number }[],
): { reactor: Entity; triggerIndex: number }[] {
  const mover = state.entities[moverId]!;
  const triggers: { reactor: Entity; triggerIndex: number }[] = [];

  for (const reactor of Object.values(state.entities)) {
    if (reactor.id === moverId || reactor.team === mover.team) continue;
    if (reactor.downed || !reactor.reactionAvailable) continue;
    if (reactor.strikeRange !== 1) continue; // melee weapon holders only

    for (let i = 0; i + 1 < fullPath.length; i++) {
      const at = fullPath[i]!;
      const next = fullPath[i + 1]!;
      if (
        isAdjacent(reactor.x, reactor.y, at.x, at.y) &&
        !isAdjacent(reactor.x, reactor.y, next.x, next.y)
      ) {
        triggers.push({ reactor, triggerIndex: i });
        break; // one reaction per reactor
      }
    }
  }

  return triggers.sort(
    (a, b) => a.triggerIndex - b.triggerIndex || a.reactor.id.localeCompare(b.reactor.id),
  );
}

/**
 * A Reactive Strike: a normal melee Strike against the mover at its trigger
 * square — same attack/damage/adjustment math as resolveStrike, no flanking
 * (the reactor strikes alone, mid-move). Returns the effects and whether the
 * mover went down (which stops the move at the trigger square).
 */
function reactionStrikeEffects(
  state: GameState,
  reactor: Entity,
  mover: Entity,
  moverHp: number,
  rng: Rng,
  actionId: string,
): { effects: AnyEffect[]; moverHpAfter: number } {
  const effects: AnyEffect[] = [
    {
      kind: "SpendReaction",
      effectId: `${actionId}_react_${reactor.id}`,
      entityId: reactor.id,
    },
  ];

  const d20Natural = rng.d20();
  const effectiveBonus = reactor.attackBonus - attackRollPenalty(reactor);
  const attackTotal = d20Natural + effectiveBonus;
  const targetAc = effectiveAc(state, mover.id);
  const wLabel = weaponLabel(reactor.damage.count, reactor.damage.sides, reactor.damage.modifier);
  const hit = attackHits(d20Natural, attackTotal, targetAc);
  const reactionBy = { reactorId: reactor.id, reactorLabel: reactor.label };

  if (!hit) {
    effects.push({
      kind: "Damage",
      effectId: `${actionId}_aoo_miss_${reactor.id}`,
      targetId: mover.id,
      amount: 0,
      damageType: reactor.damageType,
      attackResolution: {
        hit: false,
        d20Natural,
        attackBonus: effectiveBonus,
        attackTotal,
        targetAc,
        flanking: false,
        weaponLabel: wLabel,
        reactionBy,
      },
    });
    return { effects, moverHpAfter: moverHp };
  }

  const damageRolls = rollDice(rng, reactor.damage.count, reactor.damage.sides);
  let damage = sumDice(damageRolls, reactor.damage.modifier);
  const adjustment = adjustDamage(mover, damage, reactor.damageType);
  if (adjustment) {
    damage = adjustment.final;
  }

  effects.push({
    kind: "Damage",
    effectId: `${actionId}_aoo_dmg_${reactor.id}`,
    targetId: mover.id,
    amount: damage,
    damageType: reactor.damageType,
    attackResolution: {
      hit: true,
      d20Natural,
      attackBonus: effectiveBonus,
      attackTotal,
      targetAc,
      flanking: false,
      weaponLabel: wLabel,
      damageRolls,
      damageModifier: reactor.damage.modifier,
      reactionBy,
    },
    ...(adjustment ? { damageAdjustment: adjustment } : {}),
  });

  const moverHpAfter = Math.max(0, moverHp - damage);
  if (moverHpAfter === 0) {
    effects.push({
      kind: "EntityDowned",
      effectId: `${actionId}_aoo_down_${reactor.id}`,
      entityId: mover.id,
    });
  } else if (reactor.onHitCondition) {
    // Reactive Strike is a normal Strike — on-hit conditions ride it too.
    effects.push(
      applyConditionEffect(`${actionId}_aoo_cond_${reactor.id}`, mover.id, reactor.onHitCondition),
    );
  }

  return { effects, moverHpAfter };
}

function applyConditionEffect(
  effectId: string,
  targetId: EntityId,
  onHit: NonNullable<Entity["onHitCondition"]>,
): AnyEffect {
  return {
    kind: "ApplyCondition",
    effectId,
    targetId,
    condition: onHit.condition,
    ...(onHit.value !== undefined ? { value: onHit.value } : {}),
    ...(onHit.damageType !== undefined ? { damageType: onHit.damageType } : {}),
    ...(onHit.damage !== undefined ? { damage: { ...onHit.damage } } : {}),
  };
}

function resolveStep(
  action: Extract<Action, { kind: "Step" }>,
  state: GameState,
  rng: Rng,
): ResolveResult {
  const actor = state.entities[action.actorId];
  if (!actor || actor.downed) {
    return { effects: [] };
  }
  if (state.combat.activeActorId !== action.actorId) {
    return { effects: [] };
  }
  if (state.combat.phase !== "active") {
    return { effects: [] };
  }
  // Prone allows only Stand (rules/srd/conditions-m10.md).
  if (!canMove(actor)) {
    return { effects: [] };
  }

  if (!isInBounds(state, action.x, action.y)) {
    return { effects: [] };
  }
  if (isTileBlocked(state, action.x, action.y)) {
    return { effects: [] };
  }
  if (isTileOccupied(state, action.x, action.y, action.actorId)) {
    return { effects: [] };
  }
  // Path-aware (M9): a passable route within AP must exist; cost = route length.
  const path = findStepPath(state, action.actorId, action.x, action.y, actor.actionPoints);
  if (!path || path.length < 1) {
    return { effects: [] };
  }

  const effects: AnyEffect[] = [
    {
      kind: "SpendActionPoints",
      effectId: `${action.actionId}_ap`,
      entityId: action.actorId,
      amount: path.length,
    },
  ];

  // Reactive Strikes interrupt at the square where the mover leaves reach;
  // a downed mover stops there, otherwise the move completes (RAW: a move
  // trigger is not disrupted by the Strike).
  const fullPath = [{ x: actor.x, y: actor.y }, ...path];
  const triggers = findReactionTriggers(state, action.actorId, fullPath);
  let moverHp = actor.hp;
  for (const { reactor, triggerIndex } of triggers) {
    const triggerPos = fullPath[triggerIndex]!;
    const reaction = reactionStrikeEffects(state, reactor, actor, moverHp, rng, action.actionId);
    effects.push(...reaction.effects);
    moverHp = reaction.moverHpAfter;

    if (moverHp === 0) {
      effects.push({
        kind: "MoveTo",
        effectId: `${action.actionId}_move`,
        entityId: action.actorId,
        x: triggerPos.x,
        y: triggerPos.y,
      });
      return { effects };
    }
  }

  effects.push({
    kind: "MoveTo",
    effectId: `${action.actionId}_move`,
    entityId: action.actorId,
    x: action.x,
    y: action.y,
  });
  return { effects };
}

/** Stand (1 action) ends prone (rules/srd/conditions-m10.md). */
function resolveStand(
  action: Extract<Action, { kind: "Stand" }>,
  state: GameState,
): ResolveResult {
  const actor = state.entities[action.actorId];
  if (!actor || actor.downed) {
    return { effects: [] };
  }
  if (state.combat.activeActorId !== action.actorId) {
    return { effects: [] };
  }
  if (state.combat.phase !== "active") {
    return { effects: [] };
  }
  if (!hasCondition(actor, "prone")) {
    return { effects: [] };
  }
  if (actor.actionPoints < 1) {
    return { effects: [] };
  }

  return {
    effects: [
      {
        kind: "SpendActionPoints",
        effectId: `${action.actionId}_ap`,
        entityId: action.actorId,
        amount: 1,
      },
      {
        kind: "RemoveCondition",
        effectId: `${action.actionId}_stand`,
        targetId: action.actorId,
        condition: "prone",
      },
    ],
  };
}

function resolveStrike(
  action: Extract<Action, { kind: "Strike" }>,
  state: GameState,
  rng: Rng,
): ResolveResult {
  const actor = state.entities[action.actorId];
  const target = state.entities[action.targetId];
  if (!actor || !target || actor.downed || target.downed) {
    return { effects: [] };
  }
  if (state.combat.activeActorId !== action.actorId) {
    return { effects: [] };
  }
  if (state.combat.phase !== "active") {
    return { effects: [] };
  }
  if (actor.actionPoints < 1) {
    return { effects: [] };
  }
  if (actor.strikeRange < 1) {
    return { effects: [] };
  }
  if (!canTargetEnemy(state, action.actorId, action.targetId, actor.strikeRange)) {
    return { effects: [] };
  }

  const effects: AnyEffect[] = [
    {
      kind: "SpendActionPoints",
      effectId: `${action.actionId}_ap`,
      entityId: action.actorId,
      amount: 1,
    },
  ];

  const adjacent = isInRange(actor, target.x, target.y, 1);
  const flanking = adjacent && isFlanking(state, action.actorId, action.targetId);
  if (flanking && !target.conditions.includes("flat_footed")) {
    effects.push({
      kind: "ApplyCondition",
      effectId: `${action.actionId}_flat`,
      targetId: action.targetId,
      condition: "flat_footed",
    });
  }

  const d20Natural = rng.d20();
  const effectiveBonus = actor.attackBonus - attackRollPenalty(actor);
  const attackTotal = d20Natural + effectiveBonus;
  const targetAc = effectiveAc(
    flanking && !target.conditions.includes("flat_footed")
      ? {
          ...state,
          entities: {
            ...state.entities,
            [action.targetId]: {
              ...target,
              conditions: [...target.conditions, "flat_footed"],
            },
          },
        }
      : state,
    action.targetId,
  );

  const wLabel = weaponLabel(actor.damage.count, actor.damage.sides, actor.damage.modifier);
  const hit = attackHits(d20Natural, attackTotal, targetAc);
  const damageType = actor.damageType;

  if (hit) {
    const damageRolls = rollDice(rng, actor.damage.count, actor.damage.sides);
    let sneakRolls: number[] | undefined;
    let damage = sumDice(damageRolls, actor.damage.modifier);
    if (flanking && actor.classId === "rogue") {
      sneakRolls = rollDice(rng, 1, 6);
      damage += sneakRolls.reduce((sum, roll) => sum + roll, 0);
    }

    const adjustment = adjustDamage(target, damage, damageType);
    if (adjustment) {
      damage = adjustment.final;
    }

    effects.push({
      kind: "Damage",
      effectId: `${action.actionId}_dmg`,
      targetId: action.targetId,
      amount: damage,
      damageType,
      attackResolution: {
        hit: true,
        d20Natural,
        attackBonus: effectiveBonus,
        attackTotal,
        targetAc,
        flanking,
        weaponLabel: wLabel,
        damageRolls,
        damageModifier: actor.damage.modifier,
        sneakRolls,
      },
      ...(adjustment ? { damageAdjustment: adjustment } : {}),
    });

    const hpAfter = Math.max(0, target.hp - damage);
    if (hpAfter === 0) {
      effects.push({
        kind: "EntityDowned",
        effectId: `${action.actionId}_down`,
        entityId: action.targetId,
      });
    } else if (actor.onHitCondition) {
      // Content-driven rider (M10): e.g. bruiser slam knocks prone.
      effects.push(
        applyConditionEffect(`${action.actionId}_cond`, action.targetId, actor.onHitCondition),
      );
    }
  } else {
    effects.push({
      kind: "Damage",
      effectId: `${action.actionId}_miss`,
      targetId: action.targetId,
      amount: 0,
      damageType,
      attackResolution: {
        hit: false,
        d20Natural,
        attackBonus: effectiveBonus,
        attackTotal,
        targetAc,
        flanking,
        weaponLabel: wLabel,
      },
    });
  }

  return { effects };
}

function resolveCastSpell(
  action: Extract<Action, { kind: "CastSpell" }>,
  state: GameState,
  rng: Rng,
): ResolveResult {
  const actor = state.entities[action.actorId];
  const target = state.entities[action.targetId];
  if (!actor || !target || actor.downed || target.downed) {
    return { effects: [] };
  }
  if (state.combat.activeActorId !== action.actorId) {
    return { effects: [] };
  }
  if (state.combat.phase !== "active") {
    return { effects: [] };
  }
  if (!actor.knownSpells.includes(action.spellId)) {
    return { effects: [] };
  }

  if (action.spellId !== "ray_of_frost") {
    return { effects: [] };
  }
  const spell = damageSpellDef(action.spellId);
  if (actor.actionPoints < spell.actionCost) {
    return { effects: [] };
  }
  if (!canTargetEnemy(state, action.actorId, action.targetId, spell.rangeTiles)) {
    return { effects: [] };
  }

  const effects: AnyEffect[] = [
    {
      kind: "SpendActionPoints",
      effectId: `${action.actionId}_ap`,
      entityId: action.actorId,
      amount: spell.actionCost,
    },
  ];

  const d20Natural = rng.d20();
  const effectiveSpellBonus = actor.spellAttackBonus - attackRollPenalty(actor);
  const attackTotal = d20Natural + effectiveSpellBonus;
  const targetAc = effectiveAc(state, action.targetId);
  const wLabel = weaponLabel(spell.damage.count, spell.damage.sides, 0);
  const hit = attackHits(d20Natural, attackTotal, targetAc);
  const damageType = spell.damageType as DamageType;

  if (hit) {
    const damageRolls = rollDice(rng, spell.damage.count, spell.damage.sides);
    let damage = sumDice(damageRolls, 0);

    const adjustment = adjustDamage(target, damage, damageType);
    if (adjustment) {
      damage = adjustment.final;
    }

    effects.push({
      kind: "Damage",
      effectId: `${action.actionId}_dmg`,
      targetId: action.targetId,
      amount: damage,
      damageType,
      attackResolution: {
        hit: true,
        d20Natural,
        attackBonus: effectiveSpellBonus,
        attackTotal,
        targetAc,
        flanking: false,
        weaponLabel: `${spell.label}: ${wLabel}`,
        damageRolls,
        damageModifier: 0,
      },
      ...(adjustment ? { damageAdjustment: adjustment } : {}),
    });

    const hpAfter = Math.max(0, target.hp - damage);
    if (hpAfter === 0) {
      effects.push({
        kind: "EntityDowned",
        effectId: `${action.actionId}_down`,
        entityId: action.targetId,
      });
    }
  } else {
    effects.push({
      kind: "Damage",
      effectId: `${action.actionId}_miss`,
      targetId: action.targetId,
      amount: 0,
      damageType,
      attackResolution: {
        hit: false,
        d20Natural,
        attackBonus: effectiveSpellBonus,
        attackTotal,
        targetAc,
        flanking: false,
        weaponLabel: `${spell.label}: ${wLabel}`,
      },
    });
  }

  return { effects };
}

function resolveCastHeal(
  action: Extract<Action, { kind: "CastHeal" }>,
  state: GameState,
  rng: Rng,
): ResolveResult {
  const actor = state.entities[action.actorId];
  const target = state.entities[action.targetId];
  if (!actor || !target || actor.downed) {
    return { effects: [] };
  }
  if (state.combat.activeActorId !== action.actorId) {
    return { effects: [] };
  }
  if (state.combat.phase !== "active") {
    return { effects: [] };
  }
  if (!actor.knownSpells.includes(action.spellId)) {
    return { effects: [] };
  }

  if (action.spellId !== "heal_ranged") {
    return { effects: [] };
  }
  const spell = healSpellDef(action.spellId);
  if (actor.actionPoints < spell.actionCost) {
    return { effects: [] };
  }
  if (!canTargetAlly(state, action.actorId, action.targetId, spell.rangeTiles)) {
    return { effects: [] };
  }
  if (!target.downed && target.hp >= target.maxHp) {
    return { effects: [] };
  }

  // Heal is a rank-1 leveled spell from M9 on — slot enforcement is opt-in.
  const slot = findSlotToSpend(actor, action.spellId);
  if (slot === "none") {
    return { effects: [] };
  }

  const healRolls = rollDice(rng, spell.heal.count, spell.heal.sides);
  const rolled = sumDice(healRolls, spell.heal.flatBonus);
  const amount = Math.min(rolled, target.maxHp - target.hp);

  return {
    effects: [
      {
        kind: "SpendActionPoints",
        effectId: `${action.actionId}_ap`,
        entityId: action.actorId,
        amount: spell.actionCost,
      },
      ...(slot
        ? [
            {
              kind: "SpendSpellSlot",
              effectId: `${action.actionId}_slot`,
              entityId: action.actorId,
              slotId: slot.slotId,
            } satisfies AnyEffect,
          ]
        : []),
      {
        kind: "Heal",
        effectId: `${action.actionId}_heal`,
        targetId: action.targetId,
        amount,
        healResolution: {
          spellLabel: spell.label,
          healRolls,
          flatBonus: spell.heal.flatBonus,
        },
      },
    ],
  };
}

/** Breathe Fire — cone, basic Reflex save, friendly fire per RAW (rules/srd/spell-breathe-fire.md). */
function resolveCastConeSpell(
  action: Extract<Action, { kind: "CastConeSpell" }>,
  state: GameState,
  rng: Rng,
): ResolveResult {
  const actor = state.entities[action.actorId];
  if (!actor || actor.downed) {
    return { effects: [] };
  }
  if (state.combat.activeActorId !== action.actorId) {
    return { effects: [] };
  }
  if (state.combat.phase !== "active") {
    return { effects: [] };
  }
  if (!actor.knownSpells.includes(action.spellId)) {
    return { effects: [] };
  }
  if (action.spellId !== "breathe_fire") {
    return { effects: [] };
  }

  const spell = coneSpellDef(action.spellId);
  if (actor.actionPoints < spell.actionCost) {
    return { effects: [] };
  }

  const tiles = coneTiles(actor.x, actor.y, action.targetX, action.targetY, spell.coneLengthTiles);
  if (!tiles.some((t) => t.x === action.targetX && t.y === action.targetY)) {
    return { effects: [] };
  }

  const slot = findSlotToSpend(actor, action.spellId);
  if (slot === "none") {
    return { effects: [] };
  }

  const effects: AnyEffect[] = [
    {
      kind: "SpendActionPoints",
      effectId: `${action.actionId}_ap`,
      entityId: action.actorId,
      amount: spell.actionCost,
    },
  ];
  if (slot) {
    effects.push({
      kind: "SpendSpellSlot",
      effectId: `${action.actionId}_slot`,
      entityId: action.actorId,
      slotId: slot.slotId,
    });
  }

  // One damage roll for all targets; each creature in the area saves on its own.
  const damageRolls = rollDice(rng, spell.damage.count, spell.damage.sides);
  const baseDamage = sumDice(damageRolls, 0);
  const damageType = spell.damageType as DamageType;
  const saveKind = spell.save as SaveKind;

  const targets = state.combat.turnOrder
    .map((id) => state.entities[id])
    .filter((entity): entity is Entity => Boolean(entity))
    .filter((entity) => !entity.downed && entity.id !== actor.id)
    .filter((entity) => tiles.some((t) => t.x === entity.x && t.y === entity.y));

  // Frightened lowers the caster's DC and each target's save (conditions-m10.md).
  const effectiveDc = actor.spellDc - dcPenalty(actor);
  for (const target of targets) {
    const effectiveSave = target.saves[saveKind] - savePenalty(target);
    const save = rollSave(rng, effectiveSave, effectiveDc);
    const outcomeDamage = basicSaveDamage(baseDamage, save.outcome);
    const adjustment = adjustDamage(target, outcomeDamage, damageType);
    const finalDamage = adjustment?.final ?? outcomeDamage;

    effects.push({
      kind: "Damage",
      effectId: `${action.actionId}_dmg_${target.id}`,
      targetId: target.id,
      amount: finalDamage,
      damageType,
      saveResolution: {
        saveKind,
        d20Natural: save.d20Natural,
        saveModifier: effectiveSave,
        saveTotal: save.saveTotal,
        dc: effectiveDc,
        outcome: save.outcome,
        spellLabel: spell.label,
        damageRolls,
        baseDamage,
        outcomeDamage,
      },
      ...(adjustment ? { damageAdjustment: adjustment } : {}),
    });

    if (finalDamage >= target.hp) {
      effects.push({
        kind: "EntityDowned",
        effectId: `${action.actionId}_down_${target.id}`,
        entityId: target.id,
      });
    }
  }

  return { effects };
}

function nextLivingActor(state: GameState, currentId: EntityId): EntityId | null {
  const order = state.combat.turnOrder;
  const start = order.indexOf(currentId);
  if (start === -1) return null;

  for (let offset = 1; offset <= order.length; offset++) {
    const id = order[(start + offset) % order.length]!;
    const entity = state.entities[id];
    if (entity && !entity.downed) return id;
  }
  return null;
}

function checkCombatEnd(state: GameState): AnyEffect | null {
  const partyAlive = Object.values(state.entities).some((e) => e.team === "party" && !e.downed);
  const enemiesAlive = Object.values(state.entities).some((e) => e.team === "enemy" && !e.downed);

  if (!partyAlive) {
    return { kind: "CombatEnded", effectId: "eff_combat_defeat", outcome: "defeat" };
  }
  if (!enemiesAlive) {
    return { kind: "CombatEnded", effectId: "eff_combat_victory", outcome: "victory" };
  }
  return null;
}

/**
 * End-of-turn sequence (rules/srd/conditions-m10.md):
 *  1. The ender takes each persistent damage tick, then a DC 15 flat check
 *     per entry to recover. Tick damage is a normal Damage effect — M9
 *     weakness/resistance adjustment applies, which is RAW.
 *  2. Frightened decreases by 1.
 *  3. The next actor's turn starts; stunned/slowed reduce the actions
 *     regained as a SpendActionPoints follow-up, and stunned pays itself
 *     down via TickCondition.
 */
function resolveEndTurn(
  action: Extract<Action, { kind: "EndTurn" }>,
  state: GameState,
  rng: Rng,
): ResolveResult {
  if (state.combat.activeActorId !== action.actorId) {
    return { effects: [] };
  }
  if (state.combat.phase !== "active") {
    return { effects: [] };
  }

  const effects: AnyEffect[] = [];
  const ender = state.entities[action.actorId];
  let enderHp = ender?.hp ?? 0;

  if (ender && !ender.downed) {
    for (const entry of persistentDamageEntries(ender)) {
      if (!entry.damage || !entry.damageType || enderHp === 0) continue;
      const damageRolls = rollDice(rng, entry.damage.count, entry.damage.sides);
      let damage = sumDice(damageRolls, entry.damage.modifier);
      const adjustment = adjustDamage(ender, damage, entry.damageType);
      if (adjustment) {
        damage = adjustment.final;
      }

      const flatCheckRoll = rng.d20();
      const recovered = flatCheckRoll >= PERSISTENT_DAMAGE_FLAT_CHECK_DC;

      effects.push({
        kind: "Damage",
        effectId: `${action.actionId}_persist_${entry.damageType}`,
        targetId: ender.id,
        amount: damage,
        damageType: entry.damageType,
        persistentTick: {
          damageType: entry.damageType,
          flatCheckRoll,
          flatCheckDc: PERSISTENT_DAMAGE_FLAT_CHECK_DC,
          recovered,
        },
      });

      enderHp = Math.max(0, enderHp - damage);
      if (enderHp === 0) {
        effects.push({
          kind: "EntityDowned",
          effectId: `${action.actionId}_persist_down`,
          entityId: ender.id,
        });
      } else if (recovered) {
        effects.push({
          kind: "RemoveCondition",
          effectId: `${action.actionId}_persist_end_${entry.damageType}`,
          targetId: ender.id,
          condition: "persistent_damage",
          damageType: entry.damageType,
        });
      }
    }

    if (enderHp > 0 && conditionValue(ender, "frightened") > 0) {
      effects.push({
        kind: "TickCondition",
        effectId: `${action.actionId}_fright_tick`,
        targetId: ender.id,
        condition: "frightened",
        amount: 1,
      });
    }
  }

  const nextActor = nextLivingActor(state, action.actorId);
  const enderDownedByTicks = ender && !ender.downed && enderHp === 0;
  if (!nextActor || (enderDownedByTicks && nextActor === action.actorId)) {
    // No one else can act; postActionEffects ends the combat from final state.
    const end = checkCombatEnd(state);
    if (end && effects.length === 0) return { effects: [end] };
    return { effects };
  }

  effects.push({
    kind: "SetActiveActor",
    effectId: `${action.actionId}_next`,
    entityId: nextActor,
  });

  // Stunned/slowed action accounting for the actor whose turn now begins.
  const next = state.entities[nextActor];
  if (next) {
    const accounting = turnStartActions(next);
    if (accounting.lost > 0) {
      effects.push({
        kind: "SpendActionPoints",
        effectId: `${action.actionId}_start_lost`,
        entityId: nextActor,
        amount: accounting.lost,
      });
    }
    if (accounting.stunnedSpent > 0) {
      effects.push({
        kind: "TickCondition",
        effectId: `${action.actionId}_stun_tick`,
        targetId: nextActor,
        condition: "stunned",
        amount: accounting.stunnedSpent,
      });
    }
  }

  return { effects };
}

export function postActionEffects(state: GameState): AnyEffect[] {
  const end = checkCombatEnd(state);
  return end ? [end] : [];
}
