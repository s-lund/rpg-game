import type { EntityId } from "../../shared/ids";
import type { AttackResolution, CombatOutcome, ConditionId, DamageType, HealResolution } from "../types";

export type Effect =
  | {
      kind: "MoveTo";
      effectId: string;
      entityId: EntityId;
      x: number;
      y: number;
    }
  | {
      kind: "Damage";
      effectId: string;
      targetId: EntityId;
      amount: number;
      damageType: DamageType;
      attackResolution?: AttackResolution;
    }
  | {
      kind: "Heal";
      effectId: string;
      targetId: EntityId;
      amount: number;
      healResolution?: HealResolution;
    }
  | {
      kind: "ApplyCondition";
      effectId: string;
      targetId: EntityId;
      condition: ConditionId;
    }
  | {
      kind: "RemoveCondition";
      effectId: string;
      targetId: EntityId;
      condition: ConditionId;
    }
  | {
      kind: "SpendActionPoints";
      effectId: string;
      entityId: EntityId;
      amount: number;
    }
  | {
      kind: "SetActiveActor";
      effectId: string;
      entityId: EntityId;
    }
  | {
      kind: "EntityDowned";
      effectId: string;
      entityId: EntityId;
    }
  | {
      kind: "CombatEnded";
      effectId: string;
      outcome: CombatOutcome;
    };

export const ALL_EFFECT_KINDS = [
  "MoveTo",
  "Damage",
  "Heal",
  "ApplyCondition",
  "RemoveCondition",
  "SpendActionPoints",
  "SetActiveActor",
  "EntityDowned",
  "CombatEnded",
] as const satisfies readonly Effect["kind"][];
