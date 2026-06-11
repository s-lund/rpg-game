import type { EntityId } from "../shared/ids";
import type { Action } from "./actions/types";
import { postActionEffects, resolveAction } from "./actions/resolve";
import { apply, applyAll } from "./effects/apply";
import type { Effect } from "./effects/types";
import type { Rng } from "./rng";
import { createDefaultRng } from "./rng";
import type { GameEvent, GameState } from "./types";

export interface Session {
  state: GameState;
  nextSeq: number;
}

export function dispatch(
  session: Session,
  action: Action,
  rng: Rng = createDefaultRng(),
): Session {
  const { effects: resolved } = resolveAction(action, session.state, rng);
  if (resolved.length === 0) {
    return session;
  }

  const turn = session.state.combat.round;
  const applied = applyAll(resolved, session.state, {
    seqStart: session.nextSeq,
    turn,
    actorId: action.actorId,
    actionId: action.actionId,
  });

  let state = applied.state;
  let nextSeq = session.nextSeq + applied.events.length;

  const trailing = postActionEffects(state);
  if (trailing.length > 0) {
    const tail = applyAll(trailing, state, {
      seqStart: nextSeq,
      turn,
      actorId: action.actorId,
      actionId: action.actionId,
    });
    state = tail.state;
    nextSeq += tail.events.length;
  }

  return { state, nextSeq };
}

function cloneInitialState(initial: GameState): GameState {
  return {
    ...initial,
    entities: Object.fromEntries(
      Object.entries(initial.entities).map(([id, e]) => [id, { ...e, conditions: [...e.conditions] }]),
    ) as GameState["entities"],
    combat: { ...initial.combat, turnOrder: [...initial.combat.turnOrder] },
    eventLog: [],
  };
}

export function replayEvents(
  initial: GameState,
  events: GameEvent[],
): { state: GameState } {
  let state = cloneInitialState(initial);
  const replayedLog: GameEvent[] = [];

  for (const event of events) {
    const effect = effectFromEvent(event);
    if (!effect) continue;

    const result = apply(effect, state, {
      seq: event.seq,
      turn: event.turn,
      actorId: event.actorId,
      actionId: event.derivedFrom,
    });
    replayedLog.push(event);
    state = { ...result.state, eventLog: replayedLog };
  }

  return { state };
}

function effectFromEvent(event: GameEvent): Effect | null {
  const fromEffect = String(event.payload.from_effect ?? "");

  switch (event.type) {
    case "Moved":
      return {
        kind: "MoveTo",
        effectId: fromEffect,
        entityId: event.payload.entity_id as EntityId,
        x: event.payload.to_x as number,
        y: event.payload.to_y as number,
      };
    case "DamageDealt":
      return {
        kind: "Damage",
        effectId: fromEffect,
        targetId: event.payload.target_id as EntityId,
        amount: event.payload.amount as number,
        damageType: event.payload.damage_type as import("./types").DamageType,
      };
    case "Healed":
      return {
        kind: "Heal",
        effectId: fromEffect,
        targetId: event.payload.target_id as EntityId,
        amount: event.payload.amount as number,
      };
    case "ConditionApplied":
      return {
        kind: "ApplyCondition",
        effectId: fromEffect,
        targetId: event.payload.target_id as EntityId,
        condition: event.payload.condition as "flat_footed",
      };
    case "ConditionRemoved":
      return {
        kind: "RemoveCondition",
        effectId: fromEffect,
        targetId: event.payload.target_id as EntityId,
        condition: event.payload.condition as "flat_footed",
      };
    case "ActionPointsSpent":
      return {
        kind: "SpendActionPoints",
        effectId: fromEffect,
        entityId: event.payload.entity_id as EntityId,
        amount: event.payload.amount as number,
      };
    case "TurnStarted":
      return {
        kind: "SetActiveActor",
        effectId: fromEffect,
        entityId: event.payload.entity_id as EntityId,
      };
    case "EntityDowned":
      return {
        kind: "EntityDowned",
        effectId: fromEffect,
        entityId: event.payload.entity_id as EntityId,
      };
    case "CombatEnded":
      return {
        kind: "CombatEnded",
        effectId: fromEffect,
        outcome: event.payload.outcome as "victory" | "defeat",
      };
    default:
      return null;
  }
}
