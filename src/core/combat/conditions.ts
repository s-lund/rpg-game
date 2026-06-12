/**
 * Condition math (rules/srd/conditions-m10.md) — the single source the
 * resolver, the end-of-turn ticks, AND the hover inspector all read from.
 */
import type { ActiveCondition, ConditionId, Entity } from "../types";

export const PERSISTENT_DAMAGE_FLAT_CHECK_DC = 15;

export function conditionValue(entity: Entity, id: ConditionId): number {
  const condition = entity.activeConditions.find((c) => c.id === id);
  return condition?.value ?? 0;
}

export function hasCondition(entity: Entity, id: ConditionId): boolean {
  return entity.conditions.includes(id);
}

export function persistentDamageEntries(entity: Entity): ActiveCondition[] {
  return entity.activeConditions.filter((c) => c.id === "persistent_damage");
}

/**
 * Penalty to the entity's own attack rolls: frightened (status penalty to all
 * checks) plus −2 circumstance while prone.
 */
export function attackRollPenalty(entity: Entity): number {
  return conditionValue(entity, "frightened") + (hasCondition(entity, "prone") ? 2 : 0);
}

/**
 * Penalty to the entity's AC. Frightened lowers all DCs (AC is a DC); being
 * off-guard — flat_footed, or prone which grants it — is −2 circumstance,
 * applied once (circumstance penalties don't stack).
 */
export function acPenalty(entity: Entity): number {
  const offGuard = hasCondition(entity, "flat_footed") || hasCondition(entity, "prone") ? 2 : 0;
  return conditionValue(entity, "frightened") + offGuard;
}

/** Penalty to the entity's saving throws (frightened: all checks). */
export function savePenalty(entity: Entity): number {
  return conditionValue(entity, "frightened");
}

/** Penalty to the entity's spell DC (frightened: all DCs). */
export function dcPenalty(entity: Entity): number {
  return conditionValue(entity, "frightened");
}

/** Prone allows only Stand (Crawl is out of M10 scope) — Step is rejected. */
export function canMove(entity: Entity): boolean {
  return !hasCondition(entity, "prone");
}

export interface TurnStartActions {
  /** Action points actually regained this turn. */
  regained: number;
  /** Total actions lost (stunned and slowed overlap, stunned counts first). */
  lost: number;
  /** How much the stunned value pays down this turn. */
  stunnedSpent: number;
}

/**
 * Stunned/slowed action accounting at turn start. Stunned overrides slowed:
 * actions lost to stunned count toward those lost to slowed, so the total
 * lost is max(stunned loss, slowed value) — per the SRD example (stunned 1 +
 * slowed 2 → lose 2, one of them paid by stunned).
 */
export function turnStartActions(entity: Entity): TurnStartActions {
  const max = entity.maxActionPoints;
  const stunnedSpent = Math.min(conditionValue(entity, "stunned"), max);
  const slowedLoss = Math.min(conditionValue(entity, "slowed"), max);
  const lost = Math.max(stunnedSpent, slowedLoss);
  return { regained: max - lost, lost, stunnedSpent };
}
