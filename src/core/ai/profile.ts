/**
 * M12 AI profile schema — the data surface Phase B authors archetype
 * personalities against. A profile is pure data: weights per scorer component
 * plus an optional retreat threshold. Entities reference profiles by id
 * (Entity.aiProfileId); unknown/absent ids resolve to the punishing baseline.
 */

export interface AiWeights {
  /** Per point of expected damage dealt (capped at the target's remaining HP). */
  expectedDamage: number;
  /** Per unit of kill probability — finishing a target outweighs spreading damage. */
  killSecure: number;
  /** Scales the lowest-effective-HP preference (0..1 per target, lowest HP highest). */
  focusFire: number;
  /** Per point of expected healing on the chosen ally. */
  expectedHealing: number;
  /** Per point of expected Reactive Strike damage taken when an action provokes. */
  aooRisk: number;
  /** Per point of cover safety (AC bonus, or better when fully out of sight) per enemy ranged threat, at the end tile. */
  coverSeek: number;
  /** Per opposing melee-armed entity whose reach contains the end tile. */
  meleeZoneAvoid: number;
  /** Per tile of true (BFS) distance closed toward the focus target — applies only when the move enables no attack. */
  approach: number;
  /** Flat bonus when an attack option this turn would flank (on top of the off-guard AC drop already in its EV). */
  flank: number;
  /** Flat value of removing prone via Stand. */
  standUp: number;
}

/**
 * Optional wounded-behavior switch: below `hpFraction` of max HP the profile's
 * approach weight is multiplied by `approachMultiplier` (negative = pull back)
 * and coverSeek by `coverSeekMultiplier`. The baseline plays to win and does
 * not retreat; skirmisher/wounded archetypes set this in Phase B.
 */
export interface AiRetreat {
  hpFraction: number;
  approachMultiplier: number;
  coverSeekMultiplier: number;
}

export interface AiProfile {
  id: string;
  label: string;
  weights: AiWeights;
  retreat?: AiRetreat;
}

/**
 * The punishing default (M12 decision (a): uniform, play to win). Tuned
 * against the frozen behavior contract in tests/contract/ai-behavior.test.ts —
 * retune only with those properties green.
 */
export const BASELINE_PROFILE: AiProfile = {
  id: "baseline",
  label: "Punishing baseline",
  weights: {
    expectedDamage: 1,
    killSecure: 4,
    focusFire: 1,
    expectedHealing: 1,
    aooRisk: 0.3,
    coverSeek: 0.75,
    meleeZoneAvoid: 1.25,
    approach: 1,
    flank: 0.75,
    standUp: 3,
  },
};

/** Profile registry — Phase B adds archetype profiles here (data only). */
export const AI_PROFILES: Record<string, AiProfile> = {
  [BASELINE_PROFILE.id]: BASELINE_PROFILE,
};

export function resolveAiProfile(id?: string): AiProfile {
  return (id && AI_PROFILES[id]) || BASELINE_PROFILE;
}

/** Weights with the retreat switch applied for the actor's current HP fraction. */
export function effectiveWeights(profile: AiProfile, hpFraction: number): AiWeights {
  const { retreat } = profile;
  if (!retreat || hpFraction >= retreat.hpFraction) {
    return profile.weights;
  }
  return {
    ...profile.weights,
    approach: profile.weights.approach * retreat.approachMultiplier,
    coverSeek: profile.weights.coverSeek * retreat.coverSeekMultiplier,
  };
}
