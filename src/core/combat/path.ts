/** Combat-grid route check for Step (M9) — BFS like the strategic pathfinding.ts. */
import type { EntityId } from "../../shared/ids";
import type { GameState } from "../types";
import { isInBounds, isTileBlocked } from "./grid";

/** Tiles holding a living enemy block the route; allies can be moved through but not stopped on. */
function isTilePassable(state: GameState, actorId: EntityId, x: number, y: number): boolean {
  if (!isInBounds(state, x, y)) return false;
  if (isTileBlocked(state, x, y)) return false;
  const actor = state.entities[actorId];
  for (const entity of Object.values(state.entities)) {
    if (entity.downed || entity.id === actorId) continue;
    if (entity.x !== x || entity.y !== y) continue;
    if (entity.team !== actor?.team) return false;
  }
  return true;
}

/**
 * Shortest 4-neighbor route from the actor to (x, y), at most maxLength moves.
 * Returns the tiles after the start (its length = AP cost), or null if no route.
 */
export function findStepPath(
  state: GameState,
  actorId: EntityId,
  x: number,
  y: number,
  maxLength: number,
): { x: number; y: number }[] | null {
  const actor = state.entities[actorId];
  if (!actor) return null;
  if (actor.x === x && actor.y === y) return null;

  const key = (tx: number, ty: number) => `${tx},${ty}`;
  const visited = new Set<string>([key(actor.x, actor.y)]);
  let frontier: { x: number; y: number; path: { x: number; y: number }[] }[] = [
    { x: actor.x, y: actor.y, path: [] },
  ];

  for (let depth = 1; depth <= maxLength; depth++) {
    const next: typeof frontier = [];
    for (const node of frontier) {
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const nx = node.x + dx;
        const ny = node.y + dy;
        if (visited.has(key(nx, ny))) continue;
        if (!isTilePassable(state, actorId, nx, ny)) continue;
        visited.add(key(nx, ny));
        const path = [...node.path, { x: nx, y: ny }];
        if (nx === x && ny === y) return path;
        next.push({ x: nx, y: ny, path });
      }
    }
    frontier = next;
  }

  return null;
}
