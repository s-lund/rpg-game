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

function rollDamage(rng: Rng, count: number, sides: number, modifier: number): number {
  let total = modifier;
  for (let i = 0; i < count; i++) {
    total += rng.integer(1, sides);
  }
  return Math.max(0, total);
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

  const attackRoll = rng.d20() + actor.attackBonus;
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

  if (attackRoll >= targetAc) {
    let damage = rollDamage(
      rng,
      actor.damage.count,
      actor.damage.sides,
      actor.damage.modifier,
    );
    if (flanking && actor.classId === "rogue") {
      damage += rollDamage(rng, 1, 6, 0);
    }

    effects.push({
      kind: "Damage",
      effectId: `${action.actionId}_dmg`,
      targetId: action.targetId,
      amount: damage,
      damageType: "slashing",
    });

    const hpAfter = Math.max(0, target.hp - damage);
    if (hpAfter === 0) {
      effects.push({
        kind: "EntityDowned",
        effectId: `${action.actionId}_down`,
        entityId: action.targetId,
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
