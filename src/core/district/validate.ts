import type { AreaId, ExitId } from "../../shared/ids";
import type { ValidationResult } from "../characters/types";
import type { Area, AreaEdge, District, TileGrid, TileKind } from "./types";

export const MIN_SPAWN = 1;
export const MAX_SPAWN = 4;
export const MIN_COVER = 0;
export const MAX_COVER = 8;
export const MIN_GRID_DIM = 8;
export const MAX_GRID_DIM = 32;

function countTiles(tiles: TileKind[], kind: TileKind): number {
  return tiles.filter((t) => t === kind).length;
}

function collectReachableAreas(edges: AreaEdge[], start: AreaId): Set<AreaId> {
  const visited = new Set<AreaId>([start]);
  const queue: AreaId[] = [start];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of edges) {
      if (edge.from === current && !visited.has(edge.to)) {
        visited.add(edge.to);
        queue.push(edge.to);
      }
      if (edge.bidirectional && edge.to === current && !visited.has(edge.from)) {
        visited.add(edge.from);
        queue.push(edge.from);
      }
    }
  }

  return visited;
}

function bfsDistances(
  areas: Area[],
  edges: AreaEdge[],
  entrance: AreaId,
): Map<AreaId, number> {
  const distances = new Map<AreaId, number>();
  for (const area of areas) {
    distances.set(area.id, Number.POSITIVE_INFINITY);
  }
  distances.set(entrance, 0);

  const queue: AreaId[] = [entrance];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDist = distances.get(current)!;
    for (const edge of edges) {
      if (edge.from === current) {
        const next = edge.to;
        if (distances.get(next)! > currentDist + 1) {
          distances.set(next, currentDist + 1);
          queue.push(next);
        }
      }
      if (edge.bidirectional && edge.to === current) {
        const next = edge.from;
        if (distances.get(next)! > currentDist + 1) {
          distances.set(next, currentDist + 1);
          queue.push(next);
        }
      }
    }
  }

  return distances;
}

export function validateAreaGraph(
  areas: Area[],
  edges: AreaEdge[],
  entranceAreaId: AreaId,
): ValidationResult {
  const errors: string[] = [];

  if (areas.length === 0) {
    errors.push("district must contain at least one area");
    return { ok: false, errors };
  }

  const areaIds = new Set<AreaId>();
  for (const area of areas) {
    if (areaIds.has(area.id)) {
      errors.push(`duplicate area id: ${area.id}`);
    }
    areaIds.add(area.id);
  }

  if (!areaIds.has(entranceAreaId)) {
    errors.push(`entrance area not found: ${entranceAreaId}`);
  }

  for (const edge of edges) {
    if (!areaIds.has(edge.from)) {
      errors.push(`edge from unknown area: ${edge.from}`);
    }
    if (!areaIds.has(edge.to)) {
      errors.push(`edge to unknown area: ${edge.to}`);
    }
    if (edge.from === edge.to) {
      errors.push(`self-loop edge at ${edge.from}`);
    }
  }

  if (errors.length === 0) {
    const reachable = collectReachableAreas(edges, entranceAreaId);
    for (const area of areas) {
      if (!reachable.has(area.id)) {
        errors.push(`unreachable area from entrance: ${area.id}`);
      }
    }
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

export function validateTileGrid(grid: TileGrid, areaIds: Set<AreaId>): ValidationResult {
  const errors: string[] = [];
  const { width, height, tiles } = grid;

  if (width < MIN_GRID_DIM || width > MAX_GRID_DIM) {
    errors.push(`area ${grid.areaId} width out of bounds`);
  }
  if (height < MIN_GRID_DIM || height > MAX_GRID_DIM) {
    errors.push(`area ${grid.areaId} height out of bounds`);
  }

  const expected = width * height;
  if (tiles.length !== expected) {
    errors.push(`area ${grid.areaId} tile count mismatch: expected ${expected}, got ${tiles.length}`);
  }

  const spawnCount = countTiles(tiles, "spawn");
  if (spawnCount < MIN_SPAWN) {
    errors.push(`area ${grid.areaId} spawn count below minimum: ${spawnCount}`);
  }
  if (spawnCount > MAX_SPAWN) {
    errors.push(`area ${grid.areaId} spawn count above maximum: ${spawnCount}`);
  }

  const coverCount = countTiles(tiles, "cover");
  if (coverCount < MIN_COVER) {
    errors.push(`area ${grid.areaId} cover count below minimum: ${coverCount}`);
  }
  if (coverCount > MAX_COVER) {
    errors.push(`area ${grid.areaId} cover count above maximum: ${coverCount}`);
  }

  for (const [via, exit] of Object.entries(grid.exits) as [ExitId, TileGrid["exits"][ExitId]][]) {
    if (!areaIds.has(exit.leadsTo)) {
      errors.push(`area ${grid.areaId} exit ${via} leads to unknown area: ${exit.leadsTo}`);
    }
    if (exit.x < 0 || exit.x >= width || exit.y < 0 || exit.y >= height) {
      errors.push(`area ${grid.areaId} exit ${via} coordinates out of bounds`);
    }
    const idx = exit.y * width + exit.x;
    const tile = tiles[idx];
    if (tile !== via && !String(tile).startsWith("exit_")) {
      errors.push(`area ${grid.areaId} exit ${via} tile mismatch at (${exit.x}, ${exit.y})`);
    }
  }

  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i]!;
    if (typeof tile === "string" && tile.startsWith("exit_")) {
      const exitId = tile as ExitId;
      if (!grid.exits[exitId]) {
        errors.push(`area ${grid.areaId} exit tile ${exitId} missing exits record`);
      }
    }
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

function findReverseEdge(edges: AreaEdge[], edge: AreaEdge): AreaEdge | undefined {
  return edges.find(
    (e) =>
      e.from === edge.to &&
      e.to === edge.from &&
      e.bidirectional &&
      edge.bidirectional,
  );
}

export function validateDistrict(district: District): ValidationResult {
  const errors: string[] = [];

  const graphResult = validateAreaGraph(district.areas, district.edges, district.entranceAreaId);
  if (!graphResult.ok) {
    errors.push(...graphResult.errors);
  }

  const areaIds = new Set(district.areas.map((a) => a.id));
  const tierByArea = new Map(district.areas.map((a) => [a.id, a.tier]));

  for (const area of district.areas) {
    const grid = district.tileGrids[area.id];
    if (!grid) {
      errors.push(`missing tile grid for area: ${area.id}`);
      continue;
    }
    if (grid.areaId !== area.id) {
      errors.push(`tile grid areaId mismatch: ${grid.areaId} vs ${area.id}`);
    }
    const gridResult = validateTileGrid(grid, areaIds);
    if (!gridResult.ok) {
      errors.push(...gridResult.errors);
    }
  }

  for (const edge of district.edges) {
    const fromGrid = district.tileGrids[edge.from];
    if (!fromGrid) continue;

    const exit = fromGrid.exits[edge.via];
    if (!exit) {
      errors.push(`area ${edge.from} missing exit ${edge.via} for edge to ${edge.to}`);
    } else if (exit.leadsTo !== edge.to) {
      errors.push(
        `area ${edge.from} exit ${edge.via} leads to ${exit.leadsTo}, expected ${edge.to}`,
      );
    }

    if (edge.bidirectional) {
      const reverse = findReverseEdge(district.edges, edge);
      if (!reverse) {
        errors.push(`bidirectional edge ${edge.from}→${edge.to} missing reverse edge`);
      } else {
        const toGrid = district.tileGrids[edge.to];
        const reverseExit = toGrid?.exits[reverse.via];
        if (!reverseExit) {
          errors.push(`area ${edge.to} missing reverse exit ${reverse.via} for ${edge.from}`);
        } else if (reverseExit.leadsTo !== edge.from) {
          errors.push(
            `area ${edge.to} reverse exit ${reverse.via} leads to ${reverseExit.leadsTo}, expected ${edge.from}`,
          );
        }
      }
    }
  }

  if (errors.length === 0 && district.areas.length > 0) {
    const distances = bfsDistances(district.areas, district.edges, district.entranceAreaId);
    const entranceTier = tierByArea.get(district.entranceAreaId);
    const minTier = Math.min(...district.areas.map((a) => a.tier));
    if (entranceTier !== minTier) {
      errors.push(`entrance tier ${entranceTier} must equal district min tier ${minTier}`);
    }

    for (const edge of district.edges) {
      const distFrom = distances.get(edge.from) ?? Number.POSITIVE_INFINITY;
      const distTo = distances.get(edge.to) ?? Number.POSITIVE_INFINITY;
      if (distTo > distFrom) {
        const tierFrom = tierByArea.get(edge.from)!;
        const tierTo = tierByArea.get(edge.to)!;
        if (tierTo < tierFrom) {
          errors.push(
            `tier not monotonic inward: ${edge.from} (tier ${tierFrom}) → ${edge.to} (tier ${tierTo})`,
          );
        }
      }
      if (edge.bidirectional) {
        const distFromRev = distances.get(edge.to) ?? Number.POSITIVE_INFINITY;
        const distToRev = distances.get(edge.from) ?? Number.POSITIVE_INFINITY;
        if (distToRev > distFromRev) {
          const tierFrom = tierByArea.get(edge.to)!;
          const tierTo = tierByArea.get(edge.from)!;
          if (tierTo < tierFrom) {
            errors.push(
              `tier not monotonic inward: ${edge.to} (tier ${tierFrom}) → ${edge.from} (tier ${tierTo})`,
            );
          }
        }
      }
    }
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}
