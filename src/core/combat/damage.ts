/** Weakness/resistance damage adjustment — rules/srd/resistance-weakness.md. */
import type { DamageAdjustment, DamageType, Entity } from "../types";

/**
 * Weakness first, then resistance (min 0). An amount of 0 means no damage is
 * taken, so weakness does not trigger. Returns null when nothing applies.
 */
export function adjustDamage(
  target: Pick<Entity, "resistances" | "weaknesses">,
  amount: number,
  damageType: DamageType,
): DamageAdjustment | null {
  if (amount <= 0) return null;

  const weaknessValue = target.weaknesses?.[damageType] ?? 0;
  const resistanceValue = target.resistances?.[damageType] ?? 0;
  if (weaknessValue <= 0 && resistanceValue <= 0) return null;

  let final = amount;
  const adjustment: DamageAdjustment = { before: amount, final: amount };
  if (weaknessValue > 0) {
    final += weaknessValue;
    adjustment.weakness = { damageType, value: weaknessValue };
  }
  if (resistanceValue > 0) {
    final = Math.max(0, final - resistanceValue);
    adjustment.resistance = { damageType, value: resistanceValue };
  }
  adjustment.final = final;
  return adjustment;
}

export function adjustedAmount(
  target: Pick<Entity, "resistances" | "weaknesses">,
  amount: number,
  damageType: DamageType,
): number {
  return adjustDamage(target, amount, damageType)?.final ?? amount;
}
