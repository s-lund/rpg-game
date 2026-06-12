import type { EntityId } from "../shared/ids";
import type { SpellId } from "./characters/subset";

export type ClassId = "fighter" | "rogue" | "wizard" | "cleric";

export type Team = "party" | "enemy";

export type ConditionId =
  | "flat_footed"
  | "frightened"
  | "prone"
  | "stunned"
  | "slowed"
  | "persistent_damage";

/**
 * Full condition record (rules/srd/conditions-m10.md). Entity.conditions stays
 * the M1-frozen bare-id mirror; this carries the value/type detail. Persistent
 * damage is keyed by (id, damageType) — different types stack, same type keeps
 * the higher roll.
 */
export interface ActiveCondition {
  id: ConditionId;
  /** Frightened / stunned / slowed value. */
  value?: number;
  /** Persistent damage type. */
  damageType?: DamageType;
  /** Persistent damage dice, rolled anew each tick. */
  damage?: { count: number; sides: number; modifier: number };
}

export type DamageType = "slashing" | "piercing" | "cold" | "positive" | "fire";

export type SaveKind = "fortitude" | "reflex" | "will";

/** rules/srd/saving-throws.md — four-tier degrees of success. */
export type SaveOutcome = "critSuccess" | "success" | "failure" | "critFailure";

export type CombatOutcome = "victory" | "defeat";

/** Roll breakdown attached to strike/spell damage effects and DamageDealt events. */
export interface AttackResolution {
  hit: boolean;
  d20Natural: number;
  attackBonus: number;
  attackTotal: number;
  targetAc: number;
  /** Circumstance bonus from cover (M11); effective AC = targetAc + coverAcBonus. */
  coverAcBonus?: number;
  flanking: boolean;
  weaponLabel: string;
  damageRolls?: number[];
  damageModifier?: number;
  sneakRolls?: number[];
  /** Set when this strike is a Reactive Strike (AoO) — surfaces the reactor. */
  reactionBy?: { reactorId: EntityId; reactorLabel: string };
}

export interface HealResolution {
  spellLabel: string;
  healRolls: number[];
  flatBonus: number;
}

/** Basic-save breakdown attached to save-spell damage effects (rules/srd/saving-throws.md). */
export interface SaveResolution {
  saveKind: SaveKind;
  d20Natural: number;
  saveModifier: number;
  /** Reflex cover bonus vs area effects (M11 standard cover +2). */
  coverBonus?: number;
  saveTotal: number;
  dc: number;
  outcome: SaveOutcome;
  spellLabel: string;
  damageRolls: number[];
  /** Listed damage before the save outcome multiplier. */
  baseDamage: number;
  /** Damage after the outcome multiplier, before weakness/resistance. */
  outcomeDamage: number;
}

/** Weakness/resistance adjustment on a Damage effect (rules/srd/resistance-weakness.md). */
export interface DamageAdjustment {
  /** Damage before weakness/resistance. */
  before: number;
  weakness?: { damageType: DamageType; value: number };
  resistance?: { damageType: DamageType; value: number };
  final: number;
}

/** A prepared spell slot — the spell is locked in at preparation (rules/srd/spell-slots.md). */
export interface SpellSlot {
  id: string;
  rank: number;
  preparedSpellId: SpellId;
  expended: boolean;
  /** Divine font slot — usable only for its prepared font spell. */
  fontOnly?: boolean;
}

export interface Entity {
  id: EntityId;
  label: string;
  classId?: ClassId;
  team: Team;
  x: number;
  y: number;
  maxHp: number;
  hp: number;
  ac: number;
  attackBonus: number;
  spellAttackBonus: number;
  damage: { count: number; sides: number; modifier: number };
  damageType: DamageType;
  strikeRange: number;
  knownSpells: SpellId[];
  /** Save modifiers: proficiency + ability for heroes, flat values for foes. */
  saves: Record<SaveKind, number>;
  /** DC for this entity's save-targeting spells (10 + proficiency + ability). */
  spellDc: number;
  resistances?: Partial<Record<DamageType, number>>;
  weaknesses?: Partial<Record<DamageType, number>>;
  /** Prepared spell slots. Absent → leveled spells cast unrestricted (opt-in enforcement). */
  spellSlots?: SpellSlot[];
  conditions: ConditionId[];
  /** Detail records behind the conditions mirror (rules/srd/conditions-m10.md). */
  activeConditions: ActiveCondition[];
  /** One reaction per round, refreshed at the entity's turn start (rules/srd/reactive-strike.md). */
  reactionAvailable: boolean;
  /** Content-driven condition this entity's hits inflict (e.g. bruiser slam → prone). */
  onHitCondition?: {
    condition: ConditionId;
    value?: number;
    damageType?: DamageType;
    damage?: { count: number; sides: number; modifier: number };
  };
  actionPoints: number;
  maxActionPoints: number;
  downed: boolean;
}

/** Recorded initiative roll — stored on initial state so replay needs no events. */
export interface InitiativeRoll {
  d20: number;
  modifier: number;
  total: number;
}

export interface CombatMeta {
  phase: "active" | "victory" | "defeat";
  round: number;
  activeActorId: EntityId | null;
  turnOrder: EntityId[];
  /** Initiative rolls behind turnOrder (rules/srd/initiative.md). Absent → legacy fixed order. */
  initiative?: Record<EntityId, InitiativeRoll>;
}

export interface MapGrid {
  width: number;
  height: number;
  /** Impassable tiles (walls, water, chasms) from the battle map; absent → all tiles open. */
  blocked?: { x: number; y: number }[];
  /**
   * M11 per-tile cover semantics (rules/srd/cover.md): "wall" tiles block line
   * of effect via corner sampling; "raised" props grant standard cover and never
   * block targeting. Flat hazards (water, chasms) are omitted — impassable but
   * no cover. Absent (legacy maps) → every `blocked` tile is treated as a wall.
   */
  cover?: { x: number; y: number; kind: "wall" | "raised" }[];
}

export interface GameState {
  map: MapGrid;
  entities: Record<EntityId, Entity>;
  combat: CombatMeta;
  eventLog: GameEvent[];
}

export interface GameEvent {
  seq: number;
  turn: number;
  actorId: EntityId;
  type: string;
  payload: Record<string, unknown>;
  derivedFrom: string;
}

export interface EntityBlueprint {
  id: EntityId;
  label: string;
  classId?: ClassId;
  x: number;
  y: number;
  maxHp: number;
  /** When set, combat starts at this HP instead of maxHp. */
  currentHp?: number;
  ac: number;
  attackBonus?: number;
  spellAttackBonus?: number;
  damage?: { count: number; sides: number; modifier: number };
  damageType?: DamageType;
  strikeRange?: number;
  knownSpells?: SpellId[];
  saves?: Record<SaveKind, number>;
  spellDc?: number;
  resistances?: Partial<Record<DamageType, number>>;
  weaknesses?: Partial<Record<DamageType, number>>;
  spellSlots?: SpellSlot[];
  /** Perception-based initiative modifier (rules/srd/initiative.md). Default 0. */
  initiativeModifier?: number;
  onHitCondition?: Entity["onHitCondition"];
}

export interface InitialStateConfig {
  width: number;
  height: number;
  party: EntityBlueprint[];
  enemies: EntityBlueprint[];
  blockedTiles?: { x: number; y: number }[];
  /** M11 per-tile cover from battle maps; omitted on legacy encounters. */
  coverTiles?: { x: number; y: number; kind: "wall" | "raised" }[];
  /**
   * Seeded RNG for initiative. Provided → turnOrder is the rolled initiative
   * order and the rolls are stored on combat.initiative. Absent → legacy
   * party-then-enemies order (frozen M1–M9 tests construct states this way).
   */
  rng?: import("./rng").Rng;
}
