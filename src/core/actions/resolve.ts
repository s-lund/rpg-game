import type { EntityId } from "../../shared/ids";
import type { Action } from "./types";
import type { AnyEffect } from "../effects/types";
import type { DamageType, Entity, GameState, SaveKind } from "../types";
import type { Rng } from "../rng";
import { attackHits } from "../combat/attack";
import { effectiveAc, isFlanking } from "../combat/flanking";
import { canTargetAlly, canTargetEnemy, isInRange } from "../combat/range";
import { isInBounds, isTileBlocked, isTileOccupied } from "../combat/grid";
import { findStepPath } from "../combat/path";
import { coneTiles } from "../combat/cone";
import { adjustDamage } from "../combat/damage";
import { basicSaveDamage, rollSave } from "../combat/save";
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
      return resolveStep(action, state);
    case "Strike":
      return resolveStrike(action, state, rng);
    case "CastSpell":
      return resolveCastSpell(action, state, rng);
    case "CastHeal":
      return resolveCastHeal(action, state, rng);
    case "CastConeSpell":
      return resolveCastConeSpell(action, state, rng);
    case "EndTurn":
      return resolveEndTurn(action, state);
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

function resolveStep(
  action: Extract<Action, { kind: "Step" }>,
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

  return {
    effects: [
      {
        kind: "SpendActionPoints",
        effectId: `${action.actionId}_ap`,
        entityId: action.actorId,
        amount: path.length,
      },
      {
        kind: "MoveTo",
        effectId: `${action.actionId}_move`,
        entityId: action.actorId,
        x: action.x,
        y: action.y,
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
  const attackTotal = d20Natural + actor.attackBonus;
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
        attackBonus: actor.attackBonus,
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
        attackBonus: actor.attackBonus,
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
  const attackTotal = d20Natural + actor.spellAttackBonus;
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
        attackBonus: actor.spellAttackBonus,
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
        attackBonus: actor.spellAttackBonus,
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

  for (const target of targets) {
    const save = rollSave(rng, target.saves[saveKind], actor.spellDc);
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
        saveModifier: target.saves[saveKind],
        saveTotal: save.saveTotal,
        dc: actor.spellDc,
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

function resolveEndTurn(
  action: Extract<Action, { kind: "EndTurn" }>,
  state: GameState,
): ResolveResult {
  if (state.combat.activeActorId !== action.actorId) {
    return { effects: [] };
  }
  if (state.combat.phase !== "active") {
    return { effects: [] };
  }

  const nextActor = nextLivingActor(state, action.actorId);
  if (!nextActor) {
    const end = checkCombatEnd(state);
    return end ? { effects: [end] } : { effects: [] };
  }

  return {
    effects: [
      {
        kind: "SetActiveActor",
        effectId: `${action.actionId}_next`,
        entityId: nextActor,
      },
    ],
  };
}

export function postActionEffects(state: GameState): AnyEffect[] {
  const end = checkCombatEnd(state);
  return end ? [end] : [];
}
