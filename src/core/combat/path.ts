/** Combat-grid route check for Step (M9) — BFS like the strategic pathfinding.ts. */
import type { EntityId } from "../../shared/ids";
import type { GameState } from "../types";
import { isInBounds, isTileBlocked } from "./grid";

/**
 * Tiles holding a living enemy block the route; allies can be moved through
 * but not stopped on. Exported so the M12 AI prices movement with the exact
 * passability the resolver uses.
 */
export function isTilePassable(state: GameState, actorId: EntityId, x: number, y: number): boolean {
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

export interface ReachableStepTarget {
  x: number;
  y: number;
  /** Shortest route after the start; its length is the AP cost (same rule as findStepPath). */
  path: { x: number; y: number }[];
}

/**
 * Every tile the actor could Step to within `maxLength` AP — the same BFS and
 * passability as findStepPath, so the M12 AI enumerates exactly the moves the
 * resolver would accept. Tiles an ally stands on are routable but not landable
 * and are excluded. Sorted by (y, x) for deterministic candidate order.
 */
export function reachableStepTargets(
  state: GameState,
  actorId: EntityId,
  maxLength: number,
): ReachableStepTarget[] {
  const actor = state.entities[actorId];
  if (!actor || maxLength < 1) return [];

  const key = (tx: number, ty: number) => `${tx},${ty}`;
  const visited = new Set<string>([key(actor.x, actor.y)]);
  const reachable: ReachableStepTarget[] = [];
  let frontier: ReachableStepTarget[] = [{ x: actor.x, y: actor.y, path: [] }];

  for (let depth = 1; depth <= maxLength; depth++) {
    const next: ReachableStepTarget[] = [];
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
        const target = { x: nx, y: ny, path: [...node.path, { x: nx, y: ny }] };
        next.push(target);
        if (!isTileOccupiedByAlly(state, actorId, nx, ny)) {
          reachable.push(target);
        }
      }
    }
    frontier = next;
  }

  return reachable.sort((a, b) => a.y - b.y || a.x - b.x);
}

function isTileOccupiedByAlly(state: GameState, actorId: EntityId, x: number, y: number): boolean {
  for (const entity of Object.values(state.entities)) {
    if (entity.downed || entity.id === actorId) continue;
    if (entity.x === x && entity.y === y) return true;
  }
  return false;
}
