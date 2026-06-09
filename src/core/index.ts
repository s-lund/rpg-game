/** Pure rules core — no three.js or DOM imports. */

export type { BeatId, SiteId } from "../shared/ids";

export const CORE_VERSION = "0.1.0-m5";

export type { Action } from "./actions/types";
export { resolveAction, postActionEffects } from "./actions/resolve";

export type { Effect } from "./effects/types";
export { ALL_EFFECT_KINDS } from "./effects/types";
export { apply, applyAll } from "./effects/apply";
export type { ApplyContext, ApplyResult } from "./effects/apply";

export { dispatch, replayEvents } from "./engine";
export type { Session } from "./engine";

export { createInitialState } from "./state";
export { M1_DEMO_CONFIG, M2_DEMO_ENEMIES, M2_MAP_HEIGHT, M2_MAP_WIDTH } from "./scenarios/m1-demo";
export { M3_DEMO_GRAPH } from "./scenarios/m3-demo";
export { M4_DEMO_ENCOUNTERS, type EncounterTemplate } from "./world/encounters";

export type {
  WorldSite,
  WorldEdge,
  WorldGraph,
  CampaignState,
  TravelResult,
} from "./world/types";
export {
  validateWorldGraph,
  validateWorldGraphEncounters,
  getNeighbors,
  loadWorldGraph,
} from "./world/validate";
export { applyCampaignEffect } from "./world/campaign-apply";
export type { CampaignEffect, CampaignApplyContext, CampaignApplyResult } from "./world/campaign-apply";
export { createCampaignState, canTravelTo, travelTo, triggerStoryBeat } from "./world/travel";
export { formatEventLine, formatBeat, formatEvents } from "./narrator/format";
export { formatCombatLogBatch } from "./narrator/combat-log";
export { formatSiteAmbience } from "./narrator/sites";
export type { NarrationContext } from "./narrator/types";
export { serializeCampaign, deserializeCampaign } from "./world/serialize";
export { buildEncounterForSite, applyCombatResultToCampaign } from "./world/transition";

export type { CharacterDraft, PartyDraft, ValidationResult } from "./characters/types";
export type { AbilityId, ClassId as CharacterClassId, SkillId } from "./characters/subset";
export {
  ABILITY_IDS,
  M2_SUBSET,
  fighterRules,
  rogueRules,
} from "./characters/subset";
export {
  abilityModifier,
  abilityPointsRemaining,
  abilityPointsSpent,
  ABILITY_POINT_BUY,
} from "./characters/abilities";
export { validateCharacter, validateParty, createDefaultParty } from "./characters/validate";
export { deriveEntityBlueprint, derivePartyBlueprints, buildEncounterConfig } from "./characters/derive";
export { serializeParty, deserializeParty } from "./characters/serialize";

export { isFlanking, effectiveAc } from "./combat/flanking";
export { manhattanDistance, isAdjacent, isInBounds, isTileOccupied } from "./combat/grid";

export type { Rng } from "./rng";
export { createDefaultRng, createSeededRng } from "./rng";

export type {
  GameState,
  GameEvent,
  Entity,
  CombatMeta,
  ConditionId,
  ClassId,
  InitialStateConfig,
  AttackResolution,
} from "./types";
