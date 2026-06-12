/**
 * The M12 perception seam — ALL AI target enumeration flows through here, so
 * future stealth skills / concealment magic (M16/M17) can filter what an actor
 * can perceive without touching the scoring framework. Today: full map
 * knowledge — every living opposing entity, sorted by id for determinism.
 */
import type { EntityId } from "../../shared/ids";
import type { Entity, GameState } from "../types";

export function perceivableTargets(state: GameState, actorId: EntityId): Entity[] {
  const actor = state.entities[actorId];
  if (!actor) return [];
  return Object.values(state.entities)
    .filter((e) => e.team !== actor.team && !e.downed)
    .sort((a, b) => a.id.localeCompare(b.id));
}
