import type { AreaId, DistrictId, EncounterId, ExitId } from "../../shared/ids";
import type { EncounterTemplate } from "../world/encounters";
import type { WorldGraph } from "../world/types";

export interface Area {
  id: AreaId;
  label: string;
  tier: number;
}

export interface AreaEdge {
  from: AreaId;
  to: AreaId;
  via: ExitId;
  bidirectional: boolean;
}

export type TileKind = "floor" | "wall" | "door" | "spawn" | "cover" | `exit_${string}`;

export interface TileExit {
  x: number;
  y: number;
  leadsTo: AreaId;
}

export interface TileGrid {
  areaId: AreaId;
  width: number;
  height: number;
  tiles: TileKind[];
  exits: Record<ExitId, TileExit>;
}

export interface District {
  id: DistrictId;
  label: string;
  entranceAreaId: AreaId;
  areas: Area[];
  edges: AreaEdge[];
  tileGrids: Record<AreaId, TileGrid>;
}

export interface DistrictBrief {
  name: string;
  areaCount: number;
  minTier: number;
  maxTier: number;
  mapWidth: number;
  mapHeight: number;
}

export interface DistrictPackage {
  district: District;
  /** Strategic scale — district entry points on the world map. */
  worldGraph: WorldGraph;
  /** Interior scale — areas within a district (minor locations). */
  interiorGraph: WorldGraph;
  encounters: Record<EncounterId, EncounterTemplate>;
}
