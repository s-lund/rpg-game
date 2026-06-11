import type {
  AreaId,
  DistrictId,
  EncounterId,
  ExitId,
  LevelId,
  SiteId,
} from "../shared/ids";
import type {
  Area,
  AreaEdge,
  District,
  DistrictLevel,
  PackDistrict,
  SiteKind,
  TileGrid,
  WorldEdge,
  WorldGraph,
  WorldSite,
} from "../core/index";

export type ExitSide = "north" | "south" | "east" | "west";

export interface AreaSpec {
  id: AreaId;
  label: string;
  tier: number;
  /** Required when the district declares more than one level. */
  levelId?: LevelId;
  /** Default "combat" — combat areas need an encounterId. */
  siteKind?: SiteKind;
  encounterId?: EncounterId;
  /** Strategic position on the district map (percent of map area). */
  mapX: number;
  mapY: number;
}

export interface ConnectionSpec {
  a: AreaId;
  b: AreaId;
  /** Side of area `a` the exit sits on; the reverse exit uses `sideB`. */
  sideA: ExitSide;
  sideB: ExitSide;
}

export interface DistrictSpec {
  id: DistrictId;
  label: string;
  levels: DistrictLevel[];
  areas: AreaSpec[];
  connections: ConnectionSpec[];
  gridWidth?: number;
  gridHeight?: number;
}

function exitIdFor(side: ExitSide): ExitId {
  return `exit_${side}`;
}

function exitPosition(side: ExitSide, width: number, height: number): { x: number; y: number } {
  switch (side) {
    case "north":
      return { x: Math.floor(width / 2), y: 0 };
    case "south":
      return { x: Math.floor(width / 2), y: height - 1 };
    case "east":
      return { x: width - 1, y: Math.floor(height / 2) };
    case "west":
      return { x: 0, y: Math.floor(height / 2) };
  }
}

function buildGrid(
  areaId: AreaId,
  width: number,
  height: number,
  exitSpecs: { side: ExitSide; leadsTo: AreaId }[],
): TileGrid {
  const tiles: TileGrid["tiles"] = Array.from({ length: width * height }, () => "floor");
  for (let x = 0; x < width; x++) {
    tiles[x] = "wall";
    tiles[(height - 1) * width + x] = "wall";
  }
  for (let y = 0; y < height; y++) {
    tiles[y * width] = "wall";
    tiles[y * width + (width - 1)] = "wall";
  }

  const spawnX = Math.floor(width / 2);
  const spawnY = Math.floor(height / 2);
  tiles[spawnY * width + spawnX] = "spawn";

  // Deterministic light cover; positions chosen to stay clear of border and spawn.
  const coverSpots = [
    { x: 3, y: 3 },
    { x: width - 4, y: height - 4 },
  ];
  for (const spot of coverSpots) {
    const idx = spot.y * width + spot.x;
    if (tiles[idx] === "floor") {
      tiles[idx] = "cover";
    }
  }

  const exits: TileGrid["exits"] = {};
  for (const spec of exitSpecs) {
    const via = exitIdFor(spec.side);
    const pos = exitPosition(spec.side, width, height);
    tiles[pos.y * width + pos.x] = via;
    exits[via] = { x: pos.x, y: pos.y, leadsTo: spec.leadsTo };
  }

  return { areaId, width, height, tiles, exits };
}

export function siteIdForArea(areaId: AreaId): SiteId {
  return `site_${areaId.replace(/^area_/, "")}`;
}

/**
 * Authoring helper: turns area specs + connections into a full PackDistrict
 * (areas, paired edges, tile grids with matching exits, interior strategic graph).
 * The first area is the entrance.
 */
export function buildPackDistrict(spec: DistrictSpec): PackDistrict {
  const width = spec.gridWidth ?? 12;
  const height = spec.gridHeight ?? 10;

  if (spec.areas.length === 0) {
    throw new Error(`district ${spec.id} needs at least one area`);
  }

  const usedSides = new Map<AreaId, Set<ExitSide>>();
  const exitSpecsByArea = new Map<AreaId, { side: ExitSide; leadsTo: AreaId }[]>();
  const edges: AreaEdge[] = [];

  const claimSide = (areaId: AreaId, side: ExitSide, leadsTo: AreaId): void => {
    const sides = usedSides.get(areaId) ?? new Set<ExitSide>();
    if (sides.has(side)) {
      throw new Error(`district ${spec.id}: area ${areaId} already has an exit on ${side}`);
    }
    sides.add(side);
    usedSides.set(areaId, sides);
    const list = exitSpecsByArea.get(areaId) ?? [];
    list.push({ side, leadsTo });
    exitSpecsByArea.set(areaId, list);
  };

  for (const conn of spec.connections) {
    claimSide(conn.a, conn.sideA, conn.b);
    claimSide(conn.b, conn.sideB, conn.a);
    edges.push({ from: conn.a, to: conn.b, via: exitIdFor(conn.sideA), bidirectional: true });
    edges.push({ from: conn.b, to: conn.a, via: exitIdFor(conn.sideB), bidirectional: true });
  }

  const areas: Area[] = spec.areas.map((a) => ({ id: a.id, label: a.label, tier: a.tier }));
  const tileGrids: Record<AreaId, TileGrid> = {};
  for (const area of spec.areas) {
    tileGrids[area.id] = buildGrid(area.id, width, height, exitSpecsByArea.get(area.id) ?? []);
  }

  const district: District = {
    id: spec.id,
    label: spec.label,
    entranceAreaId: spec.areas[0]!.id,
    areas,
    edges,
    tileGrids,
  };

  const sites: WorldSite[] = spec.areas.map((a) => {
    const kind = a.siteKind ?? "combat";
    return {
      id: siteIdForArea(a.id),
      label: a.label,
      tier: a.tier,
      areaId: a.id,
      siteKind: kind,
      ...(kind === "combat" && a.encounterId ? { encounterId: a.encounterId } : {}),
      ...(a.levelId ? { levelId: a.levelId } : {}),
      mapX: a.mapX,
      mapY: a.mapY,
    };
  });

  const worldEdges: WorldEdge[] = spec.connections.map((conn) => ({
    from: siteIdForArea(conn.a),
    to: siteIdForArea(conn.b),
    bidirectional: true,
  }));

  const interiorGraph: WorldGraph = {
    id: `graph_interior_${spec.id}`,
    sites,
    edges: worldEdges,
    startSiteId: siteIdForArea(spec.areas[0]!.id),
  };

  return { district, interiorGraph, levels: spec.levels };
}
