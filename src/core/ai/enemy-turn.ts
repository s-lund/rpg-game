/**
 * Enemy-turn entry point — the M1 signature the renderer wires against,
 * delegating to the M12 utility-scoring framework (ai/choose.ts). The greedy
 * strike-or-step policy this replaced lives on only as git history.
 */
import type { EntityId } from "../../shared/ids";
import type { Action } from "../actions/types";
import type { GameState } from "../types";
import { chooseAiAction } from "./choose";

export function chooseEnemyAction(state: GameState, actorId: EntityId): Action | null {
  const actor = state.entities[actorId];
  if (!actor || actor.downed || actor.team !== "enemy") return null;
  return chooseAiAction(state, actorId);
}
