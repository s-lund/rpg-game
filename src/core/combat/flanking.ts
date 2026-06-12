import type { EntityId } from "../../shared/ids";
import type { GameState } from "../types";
import { isAdjacent } from "./grid";
import { acPenalty } from "./conditions";

function areOppositeSides(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  tx: number,
  ty: number,
): boolean {
  const dxA = ax - tx;
  const dyA = ay - ty;
  const dxB = bx - tx;
  const dyB = by - ty;

  if (dxA === 0 && dxB === 0 && dyA !== 0 && dyB !== 0) {
    return Math.sign(dyA) !== Math.sign(dyB);
  }
  if (dyA === 0 && dyB === 0 && dxA !== 0 && dxB !== 0) {
    return Math.sign(dxA) !== Math.sign(dxB);
  }
  return false;
}

/** PF2e-style opposite-side flanking on a square grid. */
export function isFlanking(state: GameState, attackerId: EntityId, targetId: EntityId): boolean {
  const attacker = state.entities[attackerId];
  const target = state.entities[targetId];
  if (!attacker || !target || attacker.downed || target.downed) return false;
  if (!isAdjacent(attacker.x, attacker.y, target.x, target.y)) return false;

  const attackerTeam = attacker.team;

  for (const ally of Object.values(state.entities)) {
    if (ally.id === attackerId) continue;
    if (ally.team !== attackerTeam) continue;
    if (ally.downed) continue;
    if (!isAdjacent(ally.x, ally.y, target.x, target.y)) continue;
    if (areOppositeSides(ally.x, ally.y, attacker.x, attacker.y, target.x, target.y)) {
      return true;
    }
  }

  return false;
}

export function effectiveAc(state: GameState, targetId: EntityId): number {
  const target = state.entities[targetId]!;
  // acPenalty: off-guard (flat_footed / prone) −2 circumstance, frightened status.
  return target.ac - acPenalty(target);
}
