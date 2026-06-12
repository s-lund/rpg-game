/**
 * Reactive Strike trigger predicates — rules/srd/reactive-strike.md (M12 scope).
 *
 * Single source for WHO reacts to WHAT: the resolver consumes these to build
 * reaction effects, the AI consumes the same predicates to price provoking
 * (AoO economy). HOUSE RULE: every melee-armed combatant threatens; one
 * reaction per round. Triggers (full RAW, symmetric): leaving reach during a
 * move; ranged attacks in reach; manipulate actions in reach; move actions in
 * reach (Stand — the game's Step move is exempt per rules/srd/step.md).
 */
import type { EntityId } from "../../shared/ids";
import { spellHasTrait, type SpellId } from "../characters/subset";
import type { Entity, GameState } from "../types";
import { isAdjacent } from "./grid";

/** Can this entity currently make a Reactive Strike at all? */
export function canReact(reactor: Entity): boolean {
  return !reactor.downed && reactor.reactionAvailable && reactor.strikeRange === 1;
}

/**
 * Opposing melee-armed reactors with their reaction up that have the actor
 * within reach right now — the reactors for the in-reach triggers (ranged
 * attack, manipulate, Stand). Sorted by id for deterministic resolution order.
 */
export function meleeReactorsInReach(state: GameState, actorId: EntityId): Entity[] {
  const actor = state.entities[actorId];
  if (!actor) return [];
  return Object.values(state.entities)
    .filter((reactor) => reactor.id !== actorId && reactor.team !== actor.team)
    .filter((reactor) => canReact(reactor))
    .filter((reactor) => isAdjacent(reactor.x, reactor.y, actor.x, actor.y))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Reactive Strike triggers along a move path (M10, unchanged): the trigger is
 * leaving the reactor's reach — position i adjacent, position i+1 not.
 * Returns each ready reactor's first trigger, ordered by path position.
 */
export function moveReactionTriggers(
  state: GameState,
  moverId: EntityId,
  fullPath: { x: number; y: number }[],
): { reactor: Entity; triggerIndex: number }[] {
  const mover = state.entities[moverId]!;
  const triggers: { reactor: Entity; triggerIndex: number }[] = [];

  for (const reactor of Object.values(state.entities)) {
    if (reactor.id === moverId || reactor.team === mover.team) continue;
    if (!canReact(reactor)) continue;

    for (let i = 0; i + 1 < fullPath.length; i++) {
      const at = fullPath[i]!;
      const next = fullPath[i + 1]!;
      if (
        isAdjacent(reactor.x, reactor.y, at.x, at.y) &&
        !isAdjacent(reactor.x, reactor.y, next.x, next.y)
      ) {
        triggers.push({ reactor, triggerIndex: i });
        break; // one reaction per reactor
      }
    }
  }

  return triggers.sort(
    (a, b) => a.triggerIndex - b.triggerIndex || a.reactor.id.localeCompare(b.reactor.id),
  );
}

/** Casting this spell is a manipulate action (data: m12-subset spells.*.traits). */
export function isManipulateSpell(spellId: SpellId): boolean {
  return spellHasTrait(spellId, "manipulate");
}
