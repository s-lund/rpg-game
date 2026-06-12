/**
 * Move family — Step candidates over every BFS-reachable tile within current
 * AP (same passability and cost rules as the resolver via reachableStepTargets
 * / findStepPath). A move is valued by the best attack it enables with the
 * REMAINING AP (kiting, cover-then-shoot, flank-then-strike), or — when it
 * enables none — by true pathfinding distance closed toward the focus target,
 * so the AI advances on unreachable targets instead of idling. Provoking along
 * the path is priced with the resolver's own trigger predicate.
 */
import type { EntityId } from "../../../shared/ids";
import type { Entity, GameState } from "../../types";
import { canMove } from "../../combat/conditions";
import { manhattanDistance } from "../../combat/grid";
import { isTilePassable, reachableStepTargets } from "../../combat/path";
import { moveReactionTriggers } from "../../combat/reactions";
import type { ActionFamily } from "../context";
import { bestAttackScoreFrom, expectedReactionDamage } from "../score";

const NEIGHBORS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

/**
 * BFS distance from every reachable tile to adjacency with `goal`, using the
 * actor's passability rules. dist 0 = already adjacent to the goal.
 */
function distanceField(state: GameState, actorId: EntityId, goal: Entity): Map<string, number> {
  const key = (x: number, y: number) => `${x},${y}`;
  const dist = new Map<string, number>();
  let frontier: { x: number; y: number }[] = [];

  for (const [dx, dy] of NEIGHBORS) {
    const x = goal.x + dx;
    const y = goal.y + dy;
    if (isTilePassable(state, actorId, x, y)) {
      dist.set(key(x, y), 0);
      frontier.push({ x, y });
    }
  }

  let depth = 1;
  while (frontier.length > 0) {
    const next: { x: number; y: number }[] = [];
    for (const node of frontier) {
      for (const [dx, dy] of NEIGHBORS) {
        const x = node.x + dx;
        const y = node.y + dy;
        if (dist.has(key(x, y))) continue;
        if (!isTilePassable(state, actorId, x, y)) continue;
        dist.set(key(x, y), depth);
        next.push({ x, y });
      }
    }
    frontier = next;
    depth++;
  }
  return dist;
}

/** Field distance with a manhattan fallback for tiles the BFS could not reach. */
function distanceAt(
  field: Map<string, number>,
  x: number,
  y: number,
  goal: Entity,
): number {
  return field.get(`${x},${y}`) ?? manhattanDistance(x, y, goal.x, goal.y);
}

export const moveFamily: ActionFamily = {
  family: "move",
  candidates(ctx) {
    const { actor, state, weights } = ctx;
    if (actor.actionPoints < 1 || !canMove(actor)) return [];

    const reachable = reachableStepTargets(state, actor.id, actor.actionPoints);
    if (reachable.length === 0) return [];

    const focus = ctx.focusTarget;
    const field = focus ? distanceField(state, actor.id, focus) : null;
    const distNow = focus && field ? distanceAt(field, actor.x, actor.y, focus) : 0;

    const assessed = reachable.map((tile) => {
      const fullPath = [{ x: actor.x, y: actor.y }, ...tile.path];
      const triggers = moveReactionTriggers(state, actor.id, fullPath);
      const consumed: ReadonlySet<EntityId> = new Set(triggers.map((t) => t.reactor.id));
      const aooCost =
        weights.aooRisk * expectedReactionDamage(ctx, triggers.map((t) => t.reactor));
      const apLeft = actor.actionPoints - tile.path.length;
      return { tile, aooCost, followup: bestAttackScoreFrom(ctx, tile.x, tile.y, apLeft, consumed) };
    });

    // Approach is the can't-fight-yet gradient (don't idle on unreachable
    // targets); it must never outbid an attack the actor could take this turn
    // — from where it stands or from any reachable tile.
    const noConsumed: ReadonlySet<EntityId> = new Set();
    const canFightThisTurn =
      bestAttackScoreFrom(ctx, actor.x, actor.y, actor.actionPoints, noConsumed) > 0 ||
      assessed.some((a) => a.followup > 0);

    return assessed.map(({ tile, aooCost, followup }) => {
      let score = followup - aooCost;
      if (!canFightThisTurn && focus && field) {
        score += weights.approach * (distNow - distanceAt(field, tile.x, tile.y, focus));
      }

      return {
        family: "move",
        score,
        endTile: { x: tile.x, y: tile.y },
        action: {
          kind: "Step" as const,
          actionId: `${ctx.actionIdBase}_move_${tile.x}_${tile.y}`,
          actorId: actor.id,
          x: tile.x,
          y: tile.y,
        },
      };
    });
  },
};
