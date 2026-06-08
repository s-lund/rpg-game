import type { EntityId } from "../../shared/ids";
import type { GameState } from "../types";

export function manhattanDistance(ax: number, ay: number, bx: number, by: number): number {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

export function isInBounds(state: GameState, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < state.map.width && y < state.map.height;
}

export function isTileOccupied(state: GameState, x: number, y: number, except?: EntityId): boolean {
  for (const entity of Object.values(state.entities)) {
    if (entity.downed) continue;
    if (entity.id === except) continue;
    if (entity.x === x && entity.y === y) return true;
  }
  return false;
}

export function isAdjacent(ax: number, ay: number, bx: number, by: number): boolean {
  return manhattanDistance(ax, ay, bx, by) === 1;
}
