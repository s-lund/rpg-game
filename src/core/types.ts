import type { EntityId } from "../shared/ids";

export type ClassId = "fighter" | "rogue";

export type Team = "party" | "enemy";

export type ConditionId = "flat_footed";

export type DamageType = "slashing" | "piercing";

export type CombatOutcome = "victory" | "defeat";

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
  damage: { count: number; sides: number; modifier: number };
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
  ac: number;
  attackBonus?: number;
  damage?: { count: number; sides: number; modifier: number };
}

export interface InitialStateConfig {
  width: number;
  height: number;
  party: EntityBlueprint[];
  enemies: EntityBlueprint[];
}
