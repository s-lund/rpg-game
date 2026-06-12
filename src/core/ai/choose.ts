/**
 * M12 utility-scoring chooser: enumerate → score → pick. A pure function of
 * state — no RNG, no hidden state; replay never needs AI events because the
 * same state always yields the same action (deterministic ids included).
 *
 * Tie-breaking (documented order): the FIRST candidate at the maximum total
 * wins, and candidate order is registry order (strike, cast, move, stand,
 * end-turn — ai/registry.ts) then each family's internal order (targets and
 * allies ascending by entity id; move tiles by (y, x); cone aims by target
 * id). Equal-value attack-vs-reposition ties therefore resolve to attacking.
 */
import type { EntityId } from "../../shared/ids";
import type { Action } from "../actions/types";
import type { GameState } from "../types";
import { buildAiContext, type AiCandidate } from "./context";
import { ACTION_FAMILIES } from "./registry";
import { positionValue } from "./score";

export interface ScoredAiCandidate extends AiCandidate {
  /** Family score plus end-tile position value — what the chooser compares. */
  total: number;
}

/**
 * All candidates the families generate for the active actor, with totals —
 * exported for the behavior contract (every candidate must dry-resolve to a
 * non-empty effect list) and future inspector/debug surfaces.
 */
export function enumerateAiCandidates(
  state: GameState,
  actorId: EntityId,
  profileId?: string,
): ScoredAiCandidate[] {
  const ctx = buildAiContext(state, actorId, profileId);
  if (!ctx) return [];
  const candidates: ScoredAiCandidate[] = [];
  for (const family of ACTION_FAMILIES) {
    for (const candidate of family.candidates(ctx)) {
      candidates.push({ ...candidate, total: candidate.score + positionValue(ctx, candidate.endTile) });
    }
  }
  return candidates;
}

/**
 * Choose the best action for any actor (either team — the framework is
 * symmetric; AI-vs-AI fights drive heroes through this too). Returns null when
 * the actor cannot act (wrong phase, not active, downed, missing).
 */
export function chooseAiAction(
  state: GameState,
  actorId: EntityId,
  profileId?: string,
): Action | null {
  if (state.combat.phase !== "active") return null;
  if (state.combat.activeActorId !== actorId) return null;

  let best: ScoredAiCandidate | null = null;
  for (const candidate of enumerateAiCandidates(state, actorId, profileId)) {
    if (!best || candidate.total > best.total) {
      best = candidate;
    }
  }
  return best?.action ?? null;
}
