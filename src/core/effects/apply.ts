import type { EntityId } from "../../shared/ids";
import type { Effect } from "./types";
import type { Entity, GameEvent, GameState } from "../types";

export interface ApplyContext {
  seq: number;
  turn: number;
  actorId: EntityId;
  actionId: string;
}

export interface ApplyResult {
  state: GameState;
  events: GameEvent[];
}

function cloneEntity(entity: Entity): Entity {
  return { ...entity, conditions: [...entity.conditions], knownSpells: [...entity.knownSpells] };
}

function cloneState(state: GameState): GameState {
  const entities: GameState["entities"] = {};
  for (const [id, entity] of Object.entries(state.entities)) {
    entities[id as EntityId] = cloneEntity(entity);
  }
  return {
    map: { ...state.map },
    entities,
    combat: {
      ...state.combat,
      turnOrder: [...state.combat.turnOrder],
    },
    eventLog: [...state.eventLog],
  };
}

function buildEvent(effect: Effect, state: GameState, ctx: ApplyContext): GameEvent {
  const base = {
    seq: ctx.seq,
    turn: ctx.turn,
    actorId: ctx.actorId,
    derivedFrom: ctx.actionId,
  };

  switch (effect.kind) {
    case "MoveTo": {
      const entity = state.entities[effect.entityId]!;
      return {
        ...base,
        type: "Moved",
        payload: {
          entity_id: effect.entityId,
          from_x: entity.x,
          from_y: entity.y,
          to_x: effect.x,
          to_y: effect.y,
          from_effect: effect.effectId,
        },
      };
    }
    case "Damage": {
      const target = state.entities[effect.targetId]!;
      const payload: Record<string, unknown> = {
        target_id: effect.targetId,
        amount: effect.amount,
        damage_type: effect.damageType,
        hp_after: Math.max(0, target.hp - effect.amount),
        from_effect: effect.effectId,
      };
      if (effect.attackResolution) {
        payload.attack_resolution = effect.attackResolution;
      }
      return {
        ...base,
        type: "DamageDealt",
        payload,
      };
    }
    case "Heal": {
      const target = state.entities[effect.targetId]!;
      const payload: Record<string, unknown> = {
        target_id: effect.targetId,
        amount: effect.amount,
        hp_after: Math.min(target.maxHp, target.hp + effect.amount),
        from_effect: effect.effectId,
      };
      if (effect.healResolution) {
        payload.heal_resolution = effect.healResolution;
      }
      return {
        ...base,
        type: "Healed",
        payload,
      };
    }
    case "ApplyCondition":
      return {
        ...base,
        type: "ConditionApplied",
        payload: {
          target_id: effect.targetId,
          condition: effect.condition,
          from_effect: effect.effectId,
        },
      };
    case "RemoveCondition":
      return {
        ...base,
        type: "ConditionRemoved",
        payload: {
          target_id: effect.targetId,
          condition: effect.condition,
          from_effect: effect.effectId,
        },
      };
    case "SpendActionPoints": {
      const entity = state.entities[effect.entityId]!;
      return {
        ...base,
        type: "ActionPointsSpent",
        payload: {
          entity_id: effect.entityId,
          amount: effect.amount,
          remaining: Math.max(0, entity.actionPoints - effect.amount),
          from_effect: effect.effectId,
        },
      };
    }
    case "SetActiveActor":
      return {
        ...base,
        type: "TurnStarted",
        payload: {
          entity_id: effect.entityId,
          from_effect: effect.effectId,
        },
      };
    case "EntityDowned":
      return {
        ...base,
        type: "EntityDowned",
        payload: {
          entity_id: effect.entityId,
          from_effect: effect.effectId,
        },
      };
    case "CombatEnded":
      return {
        ...base,
        type: "CombatEnded",
        payload: {
          outcome: effect.outcome,
          from_effect: effect.effectId,
        },
      };
  }
}

function reduce(effect: Effect, draft: GameState): void {
  switch (effect.kind) {
    case "MoveTo": {
      const entity = draft.entities[effect.entityId]!;
      entity.x = effect.x;
      entity.y = effect.y;
      break;
    }
    case "Damage": {
      const target = draft.entities[effect.targetId]!;
      target.hp = Math.max(0, target.hp - effect.amount);
      break;
    }
    case "Heal": {
      const target = draft.entities[effect.targetId]!;
      target.hp = Math.min(target.maxHp, target.hp + effect.amount);
      if (target.hp > 0) {
        target.downed = false;
        target.actionPoints = target.maxActionPoints;
      }
      break;
    }
    case "ApplyCondition": {
      const target = draft.entities[effect.targetId]!;
      if (!target.conditions.includes(effect.condition)) {
        target.conditions.push(effect.condition);
      }
      break;
    }
    case "RemoveCondition": {
      const target = draft.entities[effect.targetId]!;
      target.conditions = target.conditions.filter((c) => c !== effect.condition);
      break;
    }
    case "SpendActionPoints": {
      const entity = draft.entities[effect.entityId]!;
      entity.actionPoints = Math.max(0, entity.actionPoints - effect.amount);
      break;
    }
    case "SetActiveActor": {
      draft.combat.activeActorId = effect.entityId;
      const entity = draft.entities[effect.entityId]!;
      entity.actionPoints = entity.maxActionPoints;
      break;
    }
    case "EntityDowned": {
      const entity = draft.entities[effect.entityId]!;
      entity.downed = true;
      entity.hp = 0;
      break;
    }
    case "CombatEnded": {
      draft.combat.phase = effect.outcome === "victory" ? "victory" : "defeat";
      draft.combat.activeActorId = null;
      break;
    }
  }
}

export function apply(effect: Effect, state: GameState, ctx: ApplyContext): ApplyResult {
  const event = buildEvent(effect, state, ctx);
  const next = cloneState(state);
  reduce(effect, next);
  next.eventLog = [...next.eventLog, event];
  return { state: next, events: [event] };
}

export function applyAll(
  effects: Effect[],
  state: GameState,
  ctx: { seqStart: number; turn: number; actorId: EntityId; actionId: string },
): ApplyResult {
  let current = state;
  const events: GameEvent[] = [];
  let seq = ctx.seqStart;

  for (const effect of effects) {
    const result = apply(effect, current, {
      seq,
      turn: ctx.turn,
      actorId: ctx.actorId,
      actionId: ctx.actionId,
    });
    current = result.state;
    events.push(...result.events);
    seq += 1;
  }

  return { state: current, events };
}
