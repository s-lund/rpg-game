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

/**
 * Skirmisher (M12 Phase B brief a): kite to cover and shoot the squishiest
 * reachable hero. coverSeek and meleeZoneAvoid well above baseline so it keeps
 * out of melee and behind props; focusFire up so it piles onto the softest
 * target; aooRisk up a touch so it disengages early rather than eating a
 * Reactive Strike. Retreats and clings harder to cover below 40% HP.
 */
export const SKIRMISHER_PROFILE: AiProfile = {
  id: "skirmisher",
  label: "Kiting skirmisher",
  weights: {
    expectedDamage: 1,
    killSecure: 4,
    focusFire: 2,
    expectedHealing: 1,
    aooRisk: 0.6,
    coverSeek: 2,
    meleeZoneAvoid: 3,
    approach: 1,
    flank: 0.75,
    standUp: 3,
  },
  retreat: { hpFraction: 0.4, approachMultiplier: -1, coverSeekMultiplier: 2 },
};

/**
 * Bruiser (M12 Phase B brief b): body-block chokepoints and zone with
 * Reactive Strikes. meleeZoneAvoid below 0 — standing in a hero's reach IS the
 * job, so a tile adjacent to a hero scores a bonus, not a penalty; aooRisk low
 * (provoking is acceptable); approach/flank/killSecure up to charge in and
 * finish. coverSeek low so cover never pulls it off the chokepoint. No retreat:
 * bruisers die forward.
 */
export const BRUISER_PROFILE: AiProfile = {
  id: "bruiser",
  label: "Chokepoint bruiser",
  weights: {
    expectedDamage: 1,
    killSecure: 6,
    focusFire: 1,
    expectedHealing: 1,
    aooRisk: 0.1,
    coverSeek: 0.25,
    meleeZoneAvoid: -1,
    approach: 2,
    flank: 1.5,
    standUp: 3,
  },
};

/**
 * Caster (M12 Phase B brief c): a backline ranged spellcaster. Scoped honestly
 * to the existing spell subset — no new spell mechanics (real debuff spells are
 * M17). High aooRisk + meleeZoneAvoid + coverSeek keep it out of reach and
 * behind cover; expectedDamage/focusFire up so it rays the softest target;
 * approach low so it edges forward only when nothing is in range. Pair with an
 * archetype that knows a castable subset spell (e.g. ray_of_frost) — the cast
 * family generates and prices the candidates.
 */
export const CASTER_PROFILE: AiProfile = {
  id: "caster",
  label: "Backline caster",
  weights: {
    expectedDamage: 1.5,
    killSecure: 4,
    focusFire: 1.5,
    expectedHealing: 1,
    aooRisk: 1,
    coverSeek: 2.5,
    meleeZoneAvoid: 3,
    approach: 0.5,
    flank: 0.75,
    standUp: 3,
  },
};

/**
 * Wounded (M12 Phase B brief d): baseline play until hurt, then pull back
 * behind cover. A PROFILE assignable to any archetype (content uses it where
 * the fiction fits — e.g. marsh stalkers). Below half HP, approach flips
 * strongly negative (disengage) and coverSeek is amplified (cling to cover).
 */
export const WOUNDED_PROFILE: AiProfile = {
  id: "wounded",
  label: "Wounded (pulls back)",
  weights: { ...BASELINE_PROFILE.weights },
  retreat: { hpFraction: 0.5, approachMultiplier: -1.5, coverSeekMultiplier: 2.5 },
};

/** Profile registry — Phase B adds archetype profiles here (data only). */
export const AI_PROFILES: Record<string, AiProfile> = {
  [BASELINE_PROFILE.id]: BASELINE_PROFILE,
  [SKIRMISHER_PROFILE.id]: SKIRMISHER_PROFILE,
  [BRUISER_PROFILE.id]: BRUISER_PROFILE,
  [CASTER_PROFILE.id]: CASTER_PROFILE,
  [WOUNDED_PROFILE.id]: WOUNDED_PROFILE,
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
