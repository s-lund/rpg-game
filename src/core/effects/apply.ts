import type { EntityId } from "../../shared/ids";
import type { AnyEffect } from "./types";
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
  return {
    ...entity,
    conditions: [...entity.conditions],
    activeConditions: entity.activeConditions.map((c) => ({
      ...c,
      ...(c.damage ? { damage: { ...c.damage } } : {}),
    })),
    knownSpells: [...entity.knownSpells],
    saves: { ...entity.saves },
    ...(entity.resistances ? { resistances: { ...entity.resistances } } : {}),
    ...(entity.weaknesses ? { weaknesses: { ...entity.weaknesses } } : {}),
    ...(entity.spellSlots ? { spellSlots: entity.spellSlots.map((slot) => ({ ...slot })) } : {}),
  };
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

function buildEvent(effect: AnyEffect, state: GameState, ctx: ApplyContext): GameEvent {
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
      if (effect.saveResolution) {
        payload.save_resolution = effect.saveResolution;
      }
      if (effect.damageAdjustment) {
        payload.damage_adjustment = effect.damageAdjustment;
      }
      if (effect.persistentTick) {
        payload.persistent_tick = effect.persistentTick;
      }
      return {
        ...base,
        type: "DamageDealt",
        payload,
      };
    }
    case "SpendSpellSlot": {
      const entity = state.entities[effect.entityId]!;
      const slot = entity.spellSlots?.find((s) => s.id === effect.slotId);
      const remaining = (entity.spellSlots ?? []).filter(
        (s) => !s.expended && s.id !== effect.slotId,
      ).length;
      return {
        ...base,
        type: "SpellSlotSpent",
        payload: {
          entity_id: effect.entityId,
          slot_id: effect.slotId,
          spell_id: slot?.preparedSpellId ?? null,
          rank: slot?.rank ?? null,
          remaining,
          from_effect: effect.effectId,
        },
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
          ...(effect.value !== undefined ? { value: effect.value } : {}),
          ...(effect.damageType !== undefined ? { damage_type: effect.damageType } : {}),
          ...(effect.damage !== undefined ? { damage: effect.damage } : {}),
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
          ...(effect.damageType !== undefined ? { damage_type: effect.damageType } : {}),
        },
      };
    case "TickCondition": {
      const target = state.entities[effect.targetId]!;
      const current = target.activeConditions.find((c) => c.id === effect.condition);
      const valueAfter = Math.max(0, (current?.value ?? 0) - effect.amount);
      return {
        ...base,
        type: "ConditionTicked",
        payload: {
          target_id: effect.targetId,
          condition: effect.condition,
          amount: effect.amount,
          value_after: valueAfter,
          from_effect: effect.effectId,
        },
      };
    }
    case "SpendReaction":
      return {
        ...base,
        type: "ReactionSpent",
        payload: {
          entity_id: effect.entityId,
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

function avgDamage(damage?: { count: number; sides: number; modifier: number }): number {
  if (!damage) return 0;
  return damage.count * ((damage.sides + 1) / 2) + damage.modifier;
}

/** Entity.conditions is the frozen M1 bare-id view over activeConditions. */
function syncConditionMirror(entity: Entity): void {
  const ids: Entity["conditions"] = [];
  for (const condition of entity.activeConditions) {
    if (!ids.includes(condition.id)) ids.push(condition.id);
  }
  entity.conditions = ids;
}

function reduce(effect: AnyEffect, draft: GameState): void {
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
      if (effect.condition === "persistent_damage") {
        // Different types stack; same type keeps the higher (average) damage.
        const existing = target.activeConditions.find(
          (c) => c.id === "persistent_damage" && c.damageType === effect.damageType,
        );
        if (existing) {
          if (avgDamage(effect.damage) > avgDamage(existing.damage)) {
            existing.damage = effect.damage ? { ...effect.damage } : undefined;
          }
        } else {
          target.activeConditions.push({
            id: effect.condition,
            ...(effect.damageType !== undefined ? { damageType: effect.damageType } : {}),
            ...(effect.damage !== undefined ? { damage: { ...effect.damage } } : {}),
          });
        }
      } else {
        // Redundant condition: keep the higher value (PF2e), never stack.
        const existing = target.activeConditions.find((c) => c.id === effect.condition);
        if (existing) {
          if ((effect.value ?? 0) > (existing.value ?? 0)) {
            existing.value = effect.value;
          }
        } else {
          target.activeConditions.push({
            id: effect.condition,
            ...(effect.value !== undefined ? { value: effect.value } : {}),
          });
        }
      }
      syncConditionMirror(target);
      break;
    }
    case "RemoveCondition": {
      const target = draft.entities[effect.targetId]!;
      target.activeConditions = target.activeConditions.filter((c) => {
        if (c.id !== effect.condition) return true;
        if (effect.condition === "persistent_damage" && effect.damageType !== undefined) {
          return c.damageType !== effect.damageType;
        }
        return false;
      });
      syncConditionMirror(target);
      break;
    }
    case "TickCondition": {
      const target = draft.entities[effect.targetId]!;
      const current = target.activeConditions.find((c) => c.id === effect.condition);
      if (current) {
        const valueAfter = Math.max(0, (current.value ?? 0) - effect.amount);
        if (valueAfter > 0) {
          current.value = valueAfter;
        } else {
          target.activeConditions = target.activeConditions.filter((c) => c !== current);
        }
        syncConditionMirror(target);
      }
      break;
    }
    case "SpendReaction": {
      const entity = draft.entities[effect.entityId]!;
      entity.reactionAvailable = false;
      break;
    }
    case "SpendSpellSlot": {
      const entity = draft.entities[effect.entityId]!;
      const slot = entity.spellSlots?.find((s) => s.id === effect.slotId);
      if (slot) {
        slot.expended = true;
      }
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
      // Turn start refreshes the reaction (rules/srd/reactive-strike.md); the
      // stunned/slowed action reduction rides as follow-up effects in EndTurn.
      entity.reactionAvailable = true;
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

export function apply(effect: AnyEffect, state: GameState, ctx: ApplyContext): ApplyResult {
  const event = buildEvent(effect, state, ctx);
  const next = cloneState(state);
  reduce(effect, next);
  next.eventLog = [...next.eventLog, event];
  return { state: next, events: [event] };
}

export function applyAll(
  effects: AnyEffect[],
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
