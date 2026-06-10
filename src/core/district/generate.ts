import type { AreaId, DistrictId, EncounterId, ExitId, SiteId } from "../../shared/ids";
import type { EntityBlueprint } from "../types";
import type { EncounterTemplate } from "../world/encounters";
import type { WorldEdge, WorldGraph, WorldSite } from "../world/types";
import type { Area, AreaEdge, District, DistrictBrief, DistrictPackage, TileGrid } from "./types";
import { loadDistrict } from "./load";
import { validateDistrict } from "./validate";

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function slugFromIndex(index: number): string {
  const names = ["gate", "ward", "market", "yard", "spire", "vault"];
  return names[index] ?? `zone_${index}`;
}

function tierForDepth(depth: number, maxDepth: number, minTier: number, maxTier: number): number {
  if (maxDepth <= 0) return minTier;
  const t = minTier + Math.round((depth / maxDepth) * (maxTier - minTier));
  return Math.min(maxTier, Math.max(minTier, t));
}

function makeRoomGrid(
  areaId: AreaId,
  width: number,
  height: number,
  exitSpecs: { via: ExitId; x: number; y: number; leadsTo: AreaId }[],
  rng: () => number,
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
  if (rng() > 0.4) {
    const coverX = spawnX + (rng() > 0.5 ? 1 : -1);
    const coverY = spawnY;
    if (coverX > 0 && coverX < width - 1 && tiles[coverY * width + coverX] === "floor") {
      tiles[coverY * width + coverX] = "cover";
    }
  }

  const exits: TileGrid["exits"] = {};
  for (const spec of exitSpecs) {
    tiles[spec.y * width + spec.x] = spec.via;
    exits[spec.via] = { x: spec.x, y: spec.y, leadsTo: spec.leadsTo };
  }

  return { areaId, width, height, tiles, exits };
}

function enemiesForTier(tier: number, areaSlug: string, rng: () => number): EntityBlueprint[] {
  const count = tier >= 3 ? 3 : 2;
  const baseHp = 8 + tier * 2;
  const ac = 14 + tier;
  const attackBonus = 4 + tier;
  const enemies: EntityBlueprint[] = [];

  for (let i = 0; i < count; i++) {
    enemies.push({
      id: `ent_${areaSlug}_${i + 1}` as EntityBlueprint["id"],
      label: tier >= 3 ? "Elite Raider" : tier >= 2 ? "Patrol" : "Scout",
      x: 5 + i,
      y: 4 + (i % 2),
      maxHp: baseHp + Math.floor(rng() * 2),
      ac,
      attackBonus,
      damage: {
        count: 1,
        sides: tier >= 3 ? 8 : 6,
        modifier: tier >= 3 ? 2 : tier >= 2 ? 1 : 0,
      },
    });
  }

  return enemies;
}

export const DEFAULT_DISTRICT_BRIEF: DistrictBrief = {
  name: "Ashen Ward",
  areaCount: 5,
  minTier: 1,
  maxTier: 3,
  mapWidth: 12,
  mapHeight: 10,
};

export function generateDistrictFromBrief(brief: DistrictBrief, seed: number): DistrictPackage {
  const rng = mulberry32(seed);
  const areaCount = Math.min(6, Math.max(3, brief.areaCount));
  const width = Math.min(32, Math.max(8, brief.mapWidth));
  const height = Math.min(32, Math.max(8, brief.mapHeight));

  const districtId = `district_${brief.name.toLowerCase().replace(/\s+/g, "_")}` as DistrictId;
  const areas: Area[] = [];
  const edges: AreaEdge[] = [];
  const tileGrids: Record<AreaId, TileGrid> = {};

  const areaIds: AreaId[] = [];
  for (let i = 0; i < areaCount; i++) {
    const slug = slugFromIndex(i);
    const id = `area_${slug}` as AreaId;
    areaIds.push(id);
    const depth = i;
    const maxDepth = areaCount - 1;
    areas.push({
      id,
      label: `${brief.name} — ${slug.replace(/_/g, " ")}`,
      tier: tierForDepth(depth, maxDepth, brief.minTier, brief.maxTier),
    });
  }

  const entranceAreaId = areaIds[0]!;

  for (let i = 0; i < areaCount - 1; i++) {
    const from = areaIds[i]!;
    const to = areaIds[i + 1]!;
    edges.push({ from, to, via: "exit_north", bidirectional: true });
    edges.push({ from: to, to: from, via: "exit_south", bidirectional: true });
  }

  for (let i = 0; i < areaCount; i++) {
    const id = areaIds[i]!;
    const exitSpecs: { via: ExitId; x: number; y: number; leadsTo: AreaId }[] = [];
    if (i > 0) {
      exitSpecs.push({ via: "exit_south", x: Math.floor(width / 2), y: height - 1, leadsTo: areaIds[i - 1]! });
    }
    if (i < areaCount - 1) {
      exitSpecs.push({ via: "exit_north", x: Math.floor(width / 2), y: 0, leadsTo: areaIds[i + 1]! });
    }
    tileGrids[id] = makeRoomGrid(id, width, height, exitSpecs, rng);
  }

  const district: District = {
    id: districtId,
    label: brief.name,
    entranceAreaId,
    areas,
    edges,
    tileGrids,
  };

  const validation = validateDistrict(district);
  if (!validation.ok) {
    throw new Error(`generator produced invalid district: ${validation.errors.join("; ")}`);
  }
  loadDistrict(district);

  const shelterIndex = areaCount >= 4 ? 1 : -1;

  const sites: WorldSite[] = areas.map((area, i) => {
    const slug = area.id.replace("area_", "");
    const angle = (i / areaCount) * Math.PI * 1.2 + Math.PI * 0.4;
    const radius = 18 + (1 - i / Math.max(1, areaCount - 1)) * 22;
    const centerX = 50;
    const centerY = 42;
    const isShelter = i === shelterIndex;
    return {
      id: `site_${slug}` as SiteId,
      label: isShelter ? `${area.label} (Safe haven)` : area.label,
      tier: area.tier,
      areaId: area.id,
      siteKind: isShelter ? "shelter" : "combat",
      ...(isShelter ? {} : { encounterId: `enc_${slug}` as EncounterId }),
      mapX: Math.round(centerX + Math.cos(angle) * radius),
      mapY: Math.round(centerY + Math.sin(angle) * radius * 0.7),
    };
  });

  const worldEdges: WorldEdge[] = [];
  for (let i = 0; i < sites.length - 1; i++) {
    worldEdges.push({
      from: sites[i]!.id,
      to: sites[i + 1]!.id,
      bidirectional: true,
    });
  }

  const interiorGraph: WorldGraph = {
    id: `graph_interior_${districtId}`,
    sites,
    edges: worldEdges,
    startSiteId: sites[0]!.id,
  };

  const worldGraph: WorldGraph = {
    id: `graph_world_${districtId}`,
    sites: [
      {
        id: `site_${districtId.replace("district_", "")}` as SiteId,
        label: brief.name,
        tier: 1,
        districtId,
        mapX: 50,
        mapY: 55,
      },
    ],
    edges: [],
    startSiteId: `site_${districtId.replace("district_", "")}` as SiteId,
  };

  const encounters: Record<EncounterId, EncounterTemplate> = {};
  for (let i = 0; i < areas.length; i++) {
    if (i === shelterIndex) continue;
    const area = areas[i]!;
    const slug = area.id.replace("area_", "");
    const encId = `enc_${slug}` as EncounterId;
    encounters[encId] = {
      id: encId,
      width,
      height,
      enemies: enemiesForTier(area.tier, slug, rng),
    };
  }

  return { district, worldGraph, interiorGraph, encounters };
}
