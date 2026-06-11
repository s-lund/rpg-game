import type { EntityId } from "../shared/ids";
import type { SpellId } from "./characters/subset";

export type ClassId = "fighter" | "rogue" | "wizard" | "cleric";

export type Team = "party" | "enemy";

export type ConditionId = "flat_footed";

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
  flanking: boolean;
  weaponLabel: string;
  damageRolls?: number[];
  damageModifier?: number;
  sneakRolls?: number[];
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
  actionPoints: number;
  maxActionPoints: number;
  downed: boolean;
}

export interface CombatMeta {
  phase: "active" | "victory" | "defeat";
  round: number;
  activeActorId: EntityId | null;
  turnOrder: EntityId[];
}

export interface MapGrid {
  width: number;
  height: number;
  /** Impassable tiles (walls, water, chasms) from the battle map; absent → all tiles open. */
  blocked?: { x: number; y: number }[];
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
}

export interface InitialStateConfig {
  width: number;
  height: number;
  party: EntityBlueprint[];
  enemies: EntityBlueprint[];
  blockedTiles?: { x: number; y: number }[];
}
