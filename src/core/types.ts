import type { EntityId } from "../shared/ids";
import type { SpellId } from "./characters/subset";

export type ClassId = "fighter" | "rogue" | "wizard" | "cleric";

export type Team = "party" | "enemy";

export type ConditionId = "flat_footed";

export type DamageType = "slashing" | "piercing" | "cold" | "positive";

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
}

export interface InitialStateConfig {
  width: number;
  height: number;
  party: EntityBlueprint[];
  enemies: EntityBlueprint[];
  blockedTiles?: { x: number; y: number }[];
}
