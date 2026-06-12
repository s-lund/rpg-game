/** Saving-throw math — rules/srd/saving-throws.md. */
import type { Rng } from "../rng";
import type { SaveOutcome } from "../types";

/** Degrees of success: ±10 from DC for criticals; natural 20/1 shift one step. */
export function degreeOfSuccess(d20Natural: number, total: number, dc: number): SaveOutcome {
  let degree: number;
  if (total >= dc + 10) degree = 3;
  else if (total >= dc) degree = 2;
  else if (total > dc - 10) degree = 1;
  else degree = 0;

  if (d20Natural === 20) degree = Math.min(3, degree + 1);
  if (d20Natural === 1) degree = Math.max(0, degree - 1);

  return (["critFailure", "failure", "success", "critSuccess"] as const)[degree]!;
}

/** Basic save: crit success none, success half (rounded down), failure full, crit failure double. */
export function basicSaveDamage(baseDamage: number, outcome: SaveOutcome): number {
  switch (outcome) {
    case "critSuccess":
      return 0;
    case "success":
      return Math.floor(baseDamage / 2);
    case "failure":
      return baseDamage;
    case "critFailure":
      return baseDamage * 2;
  }
}

export interface SaveRoll {
  d20Natural: number;
  saveTotal: number;
  outcome: SaveOutcome;
}

export function rollSave(rng: Rng, saveModifier: number, dc: number): SaveRoll {
  const d20Natural = rng.d20();
  const saveTotal = d20Natural + saveModifier;
  return { d20Natural, saveTotal, outcome: degreeOfSuccess(d20Natural, saveTotal, dc) };
}

/**
 * Mean basic-save damage multiplier over a uniform d20 (crit success ×0,
 * success ×0.5, failure ×1, crit failure ×2) — the shared expected-value
 * helper the M12 AI scorers use for save-based spells.
 */
export function expectedBasicSaveFactor(saveModifier: number, dc: number): number {
  let total = 0;
  for (let face = 1; face <= 20; face++) {
    total += basicSaveDamage(2, degreeOfSuccess(face, face + saveModifier, dc)) / 2;
  }
  return total / 20;
}

/** Chance (5–95%) the save lands on success or better — for the hover inspector. */
export function estimateSavePercent(saveModifier: number, dc: number): number {
  const needed = dc - saveModifier;
  let successes = 0;
  for (let face = 1; face <= 20; face++) {
    const outcome = degreeOfSuccess(face, face + saveModifier, dc);
    if (outcome === "success" || outcome === "critSuccess") successes++;
  }
  if (needed <= 1) return 95;
  return Math.max(5, Math.min(95, Math.round((successes / 20) * 100)));
}
