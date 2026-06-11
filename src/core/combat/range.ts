import { manhattanDistance, isAdjacent } from "./grid";
import type { Entity, GameState } from "../types";

export function tileDistance(ax: number, ay: number, bx: number, by: number): number {
  return manhattanDistance(ax, ay, bx, by);
}

export function isInRange(
  actor: Entity,
  targetX: number,
  targetY: number,
  maxRange: number,
): boolean {
  const distance = tileDistance(actor.x, actor.y, targetX, targetY);
  if (maxRange <= 1) {
    return isAdjacent(actor.x, actor.y, targetX, targetY);
  }
  return distance >= 1 && distance <= maxRange;
}

export function canTargetEnemy(state: GameState, actorId: string, targetId: string, maxRange: number): boolean {
  const actor = state.entities[actorId as keyof typeof state.entities];
  const target = state.entities[targetId as keyof typeof state.entities];
  if (!actor || !target || actor.downed || target.downed) return false;
  if (actor.team === target.team) return false;
  return isInRange(actor, target.x, target.y, maxRange);
}

export function canTargetAlly(state: GameState, actorId: string, targetId: string, maxRange: number): boolean {
  const actor = state.entities[actorId as keyof typeof state.entities];
  const target = state.entities[targetId as keyof typeof state.entities];
  if (!actor || !target || actor.downed) return false;
  if (actor.team !== target.team) return false;
  // PF2e Heal: willing living creature includes self (always in range).
  if (actor.id === target.id) return target.hp < target.maxHp;
  if (target.downed) {
    return isInRange(actor, target.x, target.y, maxRange);
  }
  return isInRange(actor, target.x, target.y, maxRange);
}
