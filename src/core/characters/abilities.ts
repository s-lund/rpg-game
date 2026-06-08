import { M2_SUBSET, type AbilityId } from "./subset";

export const ABILITY_POINT_BUY = M2_SUBSET.abilityPointBuy;

/** rules/srd/ability-scores.md — modifier = floor((score - 10) / 2) */
export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/** Points spent above base (negative spend = points returned). */
export function abilityPointsSpent(abilities: Record<AbilityId, number>): number {
  const base = ABILITY_POINT_BUY.baseScore;
  return M2_SUBSET.abilities.reduce(
    (total, id) => total + (abilities[id as AbilityId] - base),
    0,
  );
}

export function abilityPointsRemaining(abilities: Record<AbilityId, number>): number {
  return ABILITY_POINT_BUY.pointPool - abilityPointsSpent(abilities);
}

export function proficiencyBonus(
  rank: "untrained" | "trained" | "expert" | "master" | "legendary",
  level: number,
  table: Record<typeof rank, number>,
): number {
  return level + table[rank];
}

export function sortedAbilityEntries(
  abilities: Record<AbilityId, number>,
): Array<[AbilityId, number]> {
  return (Object.entries(abilities) as Array<[AbilityId, number]>).sort(([a], [b]) =>
    a.localeCompare(b),
  );
}
