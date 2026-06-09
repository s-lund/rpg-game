import type { EntityId } from "../../shared/ids";
import type { Action } from "./types";
import type { Effect } from "../effects/types";
import type { GameState } from "../types";
import type { Rng } from "../rng";
import { effectiveAc, isFlanking } from "../combat/flanking";
import { isAdjacent, isInBounds, isTileOccupied, manhattanDistance } from "../combat/grid";

export interface ResolveResult {
  effects: Effect[];
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
    case "EndTurn":
      return resolveEndTurn(action, state);
  }
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

  const distance = manhattanDistance(actor.x, actor.y, action.x, action.y);
  if (distance < 1 || distance > actor.actionPoints) {
    return { effects: [] };
  }
  if (!isInBounds(state, action.x, action.y)) {
    return { effects: [] };
  }
  if (isTileOccupied(state, action.x, action.y, action.actorId)) {
    return { effects: [] };
  }

  return {
    effects: [
      {
        kind: "SpendActionPoints",
        effectId: `${action.actionId}_ap`,
        entityId: action.actorId,
        amount: distance,
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
  if (!isAdjacent(actor.x, actor.y, target.x, target.y)) {
    return { effects: [] };
  }

  const effects: Effect[] = [
    {
      kind: "SpendActionPoints",
      effectId: `${action.actionId}_ap`,
      entityId: action.actorId,
      amount: 1,
    },
  ];

  const flanking = isFlanking(state, action.actorId, action.targetId);
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
  const hit = attackTotal >= targetAc;

  if (hit) {
    const damageRolls = rollDice(rng, actor.damage.count, actor.damage.sides);
    let sneakRolls: number[] | undefined;
    let damage = sumDice(damageRolls, actor.damage.modifier);
    if (flanking && actor.classId === "rogue") {
      sneakRolls = rollDice(rng, 1, 6);
      damage += sneakRolls.reduce((sum, roll) => sum + roll, 0);
    }

    effects.push({
      kind: "Damage",
      effectId: `${action.actionId}_dmg`,
      targetId: action.targetId,
      amount: damage,
      damageType: "slashing",
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
      damageType: "slashing",
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

function checkCombatEnd(state: GameState): Effect | null {
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

export function postActionEffects(state: GameState): Effect[] {
  const end = checkCombatEnd(state);
  return end ? [end] : [];
}
