/** Shared attack-roll math for strikes and spell attacks. */

export function attackHits(d20Natural: number, attackTotal: number, targetAc: number): boolean {
  if (d20Natural === 1) return false;
  if (d20Natural === 20) return true;
  return attackTotal >= targetAc;
}

/** Estimated hit chance 0–100 from attack bonus vs AC (d20 uniform). */
export function estimateHitPercent(attackBonus: number, targetAc: number): number {
  const needed = targetAc - attackBonus;
  if (needed <= 1) return 95;
  if (needed > 20) return 5;
  const successes = 21 - needed;
  return Math.round((successes / 20) * 100);
}

export function damageBand(count: number, sides: number, modifier: number): { min: number; max: number } {
  return {
    min: Math.max(0, count + modifier),
    max: Math.max(0, count * sides + modifier),
  };
}
