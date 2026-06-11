import type {
  AssetId,
  BattleMapId,
  DistrictId,
  EncounterId,
  LevelId,
  PackId,
  SiteId,
  TilesetId,
} from "../../shared/ids";
import type { District } from "../district/types";
import type { EncounterTemplate } from "../world/encounters";
import type { WorldGraph } from "../world/types";

/** One vertical slice of a district interior (tower floor, dungeon depth). */
export interface DistrictLevel {
  id: LevelId;
  label: string;
}

/** Authored or generated district plus its strategic interior graph. */
export interface PackDistrict {
  district: District;
  interiorGraph: WorldGraph;
  /** Ordered outermost → innermost. Single-level districts list exactly one. */
  levels: DistrictLevel[];
}

/** Render style for one battle-map tile kind. Colors are data ("#rrggbb"); only the renderer paints. */
export interface BattleTileStyle {
  fill: string;
  /** Impassable in combat (walls, water, chasms). */
  blocked?: boolean;
  /** Extruded mesh height in tile units for walls/props; 0 or absent → flat floor. */
  raised?: number;
  /** Optional secondary tone (prop tops, water shimmer). */
  accent?: string;
}

export interface BattleTileset {
  id: TilesetId;
  label: string;
  /** Scene clear color behind the grid. */
  background?: string;
  /** Must include "floor". */
  kinds: Record<string, BattleTileStyle>;
}

/** Character-grid battle map layout; rows of legend characters. */
export interface BattleMapDefinition {
  id: BattleMapId;
  tilesetId: TilesetId;
  width: number;
  height: number;
  rows: string[];
  legend: Record<string, string>;
  partySpawns: { x: number; y: number }[];
  /** Optional per-encounter enemy placement override (index-aligned with template enemies). */
  enemySpawns?: { x: number; y: number }[];
}

/** Strategic-map artwork references — asset IDs only, resolved via the manifest by the renderer. */
export interface PackArt {
  worldMap: AssetId;
  districtMaps: Record<DistrictId, Record<LevelId, AssetId>>;
}

/**
 * A content pack: swappable scenario data + presentation refs.
 * The core validates and plays it; it never resolves asset IDs to files.
 */
export interface ContentPack {
  id: PackId;
  label: string;
  description?: string;
  worldGraph: WorldGraph;
  districts: Record<DistrictId, PackDistrict>;
  encounters: Record<EncounterId, EncounterTemplate>;
  battleMaps: Record<BattleMapId, BattleMapDefinition>;
  tilesets: Record<TilesetId, BattleTileset>;
  /** Optional per-site ambient prose (narrator falls back to a generic line). */
  ambience?: Record<SiteId, string>;
  art: PackArt;
}
