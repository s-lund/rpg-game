import type { EntityId } from "../../shared/ids";
import type { Action } from "../actions/types";
import { canTargetEnemy } from "../combat/range";
import { isInBounds, isTileOccupied, manhattanDistance } from "../combat/grid";
import type { Entity, GameState } from "../types";

function livingParty(state: GameState): Entity[] {
  return Object.values(state.entities).filter((e) => e.team === "party" && !e.downed);
}

function nearestPartyMember(state: GameState, actor: Entity): Entity | null {
  const party = livingParty(state);
  if (party.length === 0) return null;
  return party.reduce((best, candidate) => {
    const bestDist = manhattanDistance(actor.x, actor.y, best.x, best.y);
    const candDist = manhattanDistance(actor.x, actor.y, candidate.x, candidate.y);
    return candDist < bestDist ? candidate : best;
  });
}

function stepTowardTarget(state: GameState, actor: Entity, target: Entity): Action | null {
  if (actor.actionPoints < 1) return null;

  const currentDist = manhattanDistance(actor.x, actor.y, target.x, target.y);
  let best: { x: number; y: number; dist: number } | null = null;

  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      if (Math.abs(dx) + Math.abs(dy) !== 1) continue;
      const x = actor.x + dx;
      const y = actor.y + dy;
      if (!isInBounds(state, x, y)) continue;
      if (isTileOccupied(state, x, y, actor.id)) continue;
      const dist = manhattanDistance(x, y, target.x, target.y);
      if (dist >= currentDist) continue;
      if (!best || dist < best.dist) {
        best = { x, y, dist };
      }
    }
  }

  if (!best) return null;

  return {
    kind: "Step",
    actionId: `act_enemy_step_${actor.id}_${Date.now()}`,
    actorId: actor.id,
    x: best.x,
    y: best.y,
  };
}

/** Greedy enemy policy: strike in range, else step closer, else end turn. */
export function chooseEnemyAction(state: GameState, actorId: EntityId): Action | null {
  if (state.combat.phase !== "active") return null;

  const actor = state.entities[actorId];
  if (!actor || actor.downed || actor.team !== "enemy") return null;
  if (state.combat.activeActorId !== actorId) return null;

  const target = nearestPartyMember(state, actor);
  if (!target) {
    return {
      kind: "EndTurn",
      actionId: `act_enemy_end_${actor.id}_${Date.now()}`,
      actorId: actor.id,
    };
  }

  const strikeRange = actor.strikeRange > 0 ? actor.strikeRange : 1;
  if (
    actor.actionPoints >= 1 &&
    actor.attackBonus > 0 &&
    canTargetEnemy(state, actorId, target.id, strikeRange)
  ) {
    return {
      kind: "Strike",
      actionId: `act_enemy_strike_${actor.id}_${Date.now()}`,
      actorId: actor.id,
      targetId: target.id,
    };
  }

  const step = stepTowardTarget(state, actor, target);
  if (step) return step;

  return {
    kind: "EndTurn",
    actionId: `act_enemy_end_${actor.id}_${Date.now()}`,
    actorId: actor.id,
  };
}
