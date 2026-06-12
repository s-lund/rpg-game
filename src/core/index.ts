/** Pure rules core — no three.js or DOM imports. */

export type {
  AreaId,
  BattleMapId,
  BeatId,
  DistrictId,
  ExitId,
  LevelId,
  PackId,
  SiteId,
  TilesetId,
} from "../shared/ids";

export const CORE_VERSION = "0.1.0-m10";

export type { Action } from "./actions/types";
export { resolveAction, postActionEffects } from "./actions/resolve";

export type {
  Effect,
  AnyEffect,
  SpellSlotEffect,
  TickConditionEffect,
  SpendReactionEffect,
  PersistentTick,
} from "./effects/types";
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
  MapLayer,
  SiteControl,
  SiteKind,
  TravelResult,
} from "./world/types";
export {
  enterDistrict,
  exitDistrictToWorld,
  moveInDistrict,
  travelWithinDistrict,
  validateExitDistrict,
  activeInteriorSiteId,
  normalizeDistrictFields,
} from "./world/district-presence";
export {
  getInteriorNeighbors,
  isDistrictEntrance,
  exitLabelForNeighbor,
  areaIdForSite,
} from "./district/navigate";
export {
  resolveSiteKind,
  siteHasCombatEncounter,
  shouldFightOnArrival,
} from "./world/site-kinds";
export {
  findTravelPath,
  getTravelDestinations,
  canReachSite,
  isSitePassable,
} from "./world/pathfinding";
export type {
  Area,
  AreaEdge,
  District,
  DistrictBrief,
  DistrictPackage,
  TileGrid,
  TileKind,
} from "./district/types";
export {
  validateAreaGraph,
  validateTileGrid,
  validateDistrict,
  MIN_SPAWN,
  MAX_SPAWN,
  MIN_COVER,
  MAX_COVER,
} from "./district/validate";
export { loadDistrict } from "./district/load";
export {
  generateDistrictFromBrief,
  DEFAULT_DISTRICT_BRIEF,
} from "./district/generate";
export {
  getSiteControl,
  isSiteHeld,
  countHeldSites,
  markSiteHeld,
} from "./world/reclamation";
export {
  validateWorldGraph,
  validateWorldGraphEncounters,
  getNeighbors,
  loadWorldGraph,
} from "./world/validate";
export { applyCampaignEffect } from "./world/campaign-apply";
export type { CampaignEffect, CampaignApplyContext, CampaignApplyResult } from "./world/campaign-apply";
export {
  createCampaignState,
  canTravelTo,
  travelTo,
  triggerStoryBeat,
  prepareSpellSlotsAtHaven,
} from "./world/travel";
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
  M12_SUBSET,
  M9_SUBSET,
  M7_SUBSET,
  M2_SUBSET,
  SAVE_ABILITIES,
  fighterRules,
  rogueRules,
  wizardRules,
  clericRules,
  spellDef,
  coneSpellDef,
  spellRank,
  spellTraits,
  spellHasTrait,
  type SpellId,
} from "./characters/subset";
export {
  abilityModifier,
  abilityPointsRemaining,
  abilityPointsSpent,
  ABILITY_POINT_BUY,
} from "./characters/abilities";
export { validateCharacter, validateParty, createDefaultParty } from "./characters/validate";
export {
  deriveEntityBlueprint,
  derivePartyBlueprints,
  buildEncounterConfig,
  defaultPreparedSlots,
} from "./characters/derive";
export { serializeParty, deserializeParty } from "./characters/serialize";

export type {
  ContentPack,
  PackDistrict,
  DistrictLevel,
  BattleMapDefinition,
  BattleTileset,
  BattleTileStyle,
  PackArt,
} from "./pack/types";
export {
  validateContentPack,
  loadContentPack,
  findPackGraph,
} from "./pack/validate";
export {
  validateBattleMap,
  resolveBattleMap,
  MIN_BATTLE_DIM,
  MAX_BATTLE_DIM,
  type ResolvedBattleMap,
  type ResolvedBattleTile,
} from "./pack/battle-map";
export {
  buildPackEncounter,
  resolveEncounterBattleMap,
  type PackEncounterResult,
} from "./pack/encounter";

export { isFlanking, effectiveAc } from "./combat/flanking";
export {
  manhattanDistance,
  isAdjacent,
  isInBounds,
  isTileBlocked,
  isTileOccupied,
} from "./combat/grid";
export { tileDistance, isInRange, canTargetEnemy, canTargetAlly } from "./combat/range";
export { inspectTarget, type TargetInspection, type InspectActionKind } from "./combat/inspect";
export { attackHits, estimateHitPercent, damageBand } from "./combat/attack";
export {
  degreeOfSuccess,
  basicSaveDamage,
  rollSave,
  estimateSavePercent,
  expectedBasicSaveFactor,
} from "./combat/save";
export {
  PERSISTENT_DAMAGE_FLAT_CHECK_DC,
  conditionValue,
  hasCondition,
  persistentDamageEntries,
  attackRollPenalty,
  acPenalty,
  savePenalty,
  dcPenalty,
  canMove,
  turnStartActions,
  type TurnStartActions,
} from "./combat/conditions";
export { adjustDamage, adjustedAmount } from "./combat/damage";
export { coneTiles, coneDirection, isTileInCone } from "./combat/cone";
export {
  WALL_RAISED_THRESHOLD,
  coverKindFromTileStyle,
  tileCoverKind,
  hasLineOfEffect,
  evaluateCover,
  coverAcBonus,
  coverReflexVsAreaBonus,
  clipTilesByLineOfEffect,
  coneTilesWithLineOfEffect,
  type TileCoverKind,
  type CoverTier,
  type CoverSource,
  type CoverResult,
} from "./combat/los";
export {
  findStepPath,
  isTilePassable,
  reachableStepTargets,
  type ReachableStepTarget,
} from "./combat/path";
export {
  canReact,
  meleeReactorsInReach,
  moveReactionTriggers,
  isManipulateSpell,
} from "./combat/reactions";
export { chooseEnemyAction } from "./ai/enemy-turn";
export { chooseAiAction, enumerateAiCandidates, type ScoredAiCandidate } from "./ai/choose";
export { perceivableTargets } from "./ai/perception";
export {
  AI_PROFILES,
  BASELINE_PROFILE,
  resolveAiProfile,
  type AiProfile,
  type AiRetreat,
  type AiWeights,
} from "./ai/profile";
export type { ActionFamily, AiCandidate, AiContext } from "./ai/context";

export type { Rng } from "./rng";
export { createDefaultRng, createSeededRng } from "./rng";

export type {
  GameState,
  GameEvent,
  Entity,
  EntityBlueprint,
  CombatMeta,
  ConditionId,
  ActiveCondition,
  InitiativeRoll,
  ClassId,
  InitialStateConfig,
  AttackResolution,
  HealResolution,
  SaveResolution,
  DamageAdjustment,
  SpellSlot,
  DamageType,
  SaveKind,
  SaveOutcome,
} from "./types";
