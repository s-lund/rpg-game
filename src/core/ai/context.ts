/**
 * Shared per-decision context for the M12 utility-scoring AI. Built once per
 * chooseAiAction call; every generator/scorer reads from it. Pure data derived
 * from GameState — no hidden state, no RNG.
 */
import type { EntityId } from "../../shared/ids";
import type { Action } from "../actions/types";
import type { Entity, GameState } from "../types";
import type { Tile } from "../combat/cone";
import { perceivableTargets } from "./perception";
import { effectiveWeights, resolveAiProfile, type AiProfile, type AiWeights } from "./profile";

export interface AiCandidate {
  action: Action;
  family: string;
  /** Family score; choose() adds the end-tile position value on top. */
  score: number;
  /** The tile the actor occupies after this action (current tile for stationary actions). */
  endTile: Tile;
}

/** One generator + one scorer per action family, registered in ai/registry.ts. */
export interface ActionFamily {
  family: string;
  candidates(ctx: AiContext): AiCandidate[];
}

export interface AiContext {
  state: GameState;
  actor: Entity;
  profile: AiProfile;
  /** Profile weights with the retreat switch applied for the actor's HP. */
  weights: AiWeights;
  /** Living opposing entities through the perception seam (sorted by id). */
  targets: Entity[];
  /** Living same-team entities including the actor (sorted by id). */
  allies: Entity[];
  /** Standing creatures' tiles EXCLUDING the actor — occupancy input for cover math at any hypothetical actor tile. */
  occupiedOthers: Tile[];
  /** Perceivable opposing entities that threaten at range (cover-seeking input). */
  rangedThreats: Entity[];
  /** Perceivable opposing melee-armed entities (zone-avoidance input). */
  meleeThreats: Entity[];
  /** Lowest-HP perceivable target — approach/focus anchor. Null only when no targets live. */
  focusTarget: Entity | null;
  /** Highest current HP among targets — normalizes the focus-fire component. */
  maxTargetHp: number;
  /** Deterministic action-id prefix: pure function of state (event-log length). */
  actionIdBase: string;
}

export function buildAiContext(state: GameState, actorId: EntityId, profileId?: string): AiContext | null {
  const actor = state.entities[actorId];
  if (!actor || actor.downed) return null;

  const profile = resolveAiProfile(profileId ?? actor.aiProfileId);
  const targets = perceivableTargets(state, actorId);
  const allies = Object.values(state.entities)
    .filter((e) => e.team === actor.team && !e.downed)
    .sort((a, b) => a.id.localeCompare(b.id));
  const occupiedOthers = Object.values(state.entities)
    .filter((e) => !e.downed && e.id !== actorId)
    .map((e) => ({ x: e.x, y: e.y }));

  const focusTarget = targets.reduce<Entity | null>(
    (best, t) => (!best || t.hp < best.hp ? t : best),
    null,
  );

  return {
    state,
    actor,
    profile,
    weights: effectiveWeights(profile, actor.maxHp > 0 ? actor.hp / actor.maxHp : 1),
    targets,
    allies,
    occupiedOthers,
    rangedThreats: targets.filter((t) => t.strikeRange > 1 || t.knownSpells.length > 0),
    meleeThreats: targets.filter((t) => t.strikeRange === 1),
    focusTarget,
    maxTargetHp: targets.reduce((max, t) => Math.max(max, t.hp), 0),
    actionIdBase: `act_ai_${actorId}_${state.eventLog.length}`,
  };
}
