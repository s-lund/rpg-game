import type { EntityId } from "../../shared/ids";
import type {
  AttackResolution,
  CombatOutcome,
  ConditionId,
  DamageAdjustment,
  DamageType,
  HealResolution,
  SaveResolution,
} from "../types";

/**
 * The M1-frozen effect union. The frozen pipeline contract test switches
 * exhaustively over `Effect["kind"]`, so kinds added after the freeze extend
 * `AnyEffect` below instead — each with its own contract test.
 */
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
      /** Final damage after save outcome and weakness/resistance. */
      amount: number;
      damageType: DamageType;
      attackResolution?: AttackResolution;
      saveResolution?: SaveResolution;
      damageAdjustment?: DamageAdjustment;
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

/** Spend a prepared spell slot (M9) — rides the same pipeline as every Effect. */
export interface SpellSlotEffect {
  kind: "SpendSpellSlot";
  effectId: string;
  entityId: EntityId;
  slotId: string;
}

/** Every effect the pipeline accepts: the frozen M1 union plus post-freeze kinds. */
export type AnyEffect = Effect | SpellSlotEffect;

/**
 * Effect kinds enumerated by the frozen M1 pipeline contract test. Post-freeze
 * kinds (see AnyEffect) are NOT appended here — each ships its own contract
 * test covering the same one-effect-one-event guarantees instead.
 */
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
