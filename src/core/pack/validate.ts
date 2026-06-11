import type { DistrictId, LevelId } from "../../shared/ids";
import type { ValidationResult } from "../characters/types";
import { validateDistrict } from "../district/validate";
import { validateWorldGraph, validateWorldGraphEncounters } from "../world/validate";
import type { WorldGraph } from "../world/types";
import { validateBattleMap } from "./battle-map";
import type { ContentPack, PackDistrict } from "./types";

function validatePackDistrict(
  pack: ContentPack,
  districtId: DistrictId,
  entry: PackDistrict,
  errors: string[],
): void {
  const districtResult = validateDistrict(entry.district);
  if (!districtResult.ok) {
    errors.push(...districtResult.errors.map((e) => `district ${districtId}: ${e}`));
  }
  if (entry.district.id !== districtId) {
    errors.push(`district key ${districtId} does not match district.id ${entry.district.id}`);
  }

  const graphResult = validateWorldGraph(entry.interiorGraph);
  if (!graphResult.ok) {
    errors.push(...graphResult.errors.map((e) => `district ${districtId} interior: ${e}`));
  }
  const encResult = validateWorldGraphEncounters(entry.interiorGraph, pack.encounters);
  if (!encResult.ok) {
    errors.push(...encResult.errors.map((e) => `district ${districtId} interior: ${e}`));
  }

  if (entry.levels.length === 0) {
    errors.push(`district ${districtId} must declare at least one level`);
    return;
  }
  const levelIds = new Set<LevelId>();
  for (const level of entry.levels) {
    if (levelIds.has(level.id)) {
      errors.push(`district ${districtId} duplicate level id: ${level.id}`);
    }
    levelIds.add(level.id);
  }

  const multiLevel = entry.levels.length > 1;
  for (const site of entry.interiorGraph.sites) {
    if (site.levelId && !levelIds.has(site.levelId)) {
      errors.push(`district ${districtId} site ${site.id} on unknown level: ${site.levelId}`);
    }
    if (multiLevel && !site.levelId) {
      errors.push(`district ${districtId} site ${site.id} missing levelId on multi-level district`);
    }
  }

  const startSite = entry.interiorGraph.sites.find(
    (s) => s.id === entry.interiorGraph.startSiteId,
  );
  if (startSite) {
    const entranceLevel = startSite.levelId ?? entry.levels[0]!.id;
    if (entranceLevel !== entry.levels[0]!.id) {
      errors.push(
        `district ${districtId} entrance site ${startSite.id} must sit on the first level (${entry.levels[0]!.id})`,
      );
    }
    if (startSite.areaId && startSite.areaId !== entry.district.entranceAreaId) {
      errors.push(
        `district ${districtId} entrance site ${startSite.id} area ${startSite.areaId} != district entrance ${entry.district.entranceAreaId}`,
      );
    }
  }

  const art = pack.art.districtMaps[districtId];
  if (!art) {
    errors.push(`district ${districtId} missing art.districtMaps entry`);
  } else {
    for (const level of entry.levels) {
      if (!art[level.id]) {
        errors.push(`district ${districtId} missing map art asset for level ${level.id}`);
      }
    }
  }
}

function validatePackEncounters(pack: ContentPack, errors: string[]): void {
  for (const encounter of Object.values(pack.encounters)) {
    if (!encounter.battleMapId) continue;

    const battleMap = pack.battleMaps[encounter.battleMapId];
    if (!battleMap) {
      errors.push(`encounter ${encounter.id} references unknown battle map: ${encounter.battleMapId}`);
      continue;
    }
    const tileset = pack.tilesets[battleMap.tilesetId];
    if (!tileset) {
      errors.push(`battle map ${battleMap.id} references unknown tileset: ${battleMap.tilesetId}`);
      continue;
    }

    const mapResult = validateBattleMap(battleMap, tileset);
    if (!mapResult.ok) {
      errors.push(...mapResult.errors);
      continue;
    }

    if (encounter.width !== battleMap.width || encounter.height !== battleMap.height) {
      errors.push(
        `encounter ${encounter.id} dims ${encounter.width}x${encounter.height} != battle map ${battleMap.id} ${battleMap.width}x${battleMap.height}`,
      );
    }

    if (battleMap.enemySpawns) {
      if (battleMap.enemySpawns.length < encounter.enemies.length) {
        errors.push(
          `battle map ${battleMap.id} has ${battleMap.enemySpawns.length} enemy spawns for ${encounter.enemies.length} enemies in ${encounter.id}`,
        );
      }
    } else {
      const blockedKeys = new Set<string>();
      for (let y = 0; y < battleMap.height; y++) {
        for (let x = 0; x < battleMap.width; x++) {
          const kind = battleMap.legend[battleMap.rows[y]![x]!]!;
          if (tileset.kinds[kind]!.blocked) blockedKeys.add(`${x},${y}`);
        }
      }
      for (const enemy of encounter.enemies) {
        if (enemy.x < 0 || enemy.x >= battleMap.width || enemy.y < 0 || enemy.y >= battleMap.height) {
          errors.push(`encounter ${encounter.id} enemy ${enemy.id} out of battle map bounds`);
        } else if (blockedKeys.has(`${enemy.x},${enemy.y}`)) {
          errors.push(`encounter ${encounter.id} enemy ${enemy.id} placed on blocked tile (${enemy.x}, ${enemy.y})`);
        }
      }
    }
  }
}

/** Deterministic gate for content packs — authored or generated, data only ships validated. */
export function validateContentPack(pack: ContentPack): ValidationResult {
  const errors: string[] = [];

  if (!pack.id || !pack.id.startsWith("pack_")) {
    errors.push(`pack id must start with pack_: ${pack.id}`);
  }
  if (!pack.label.trim()) {
    errors.push("pack label must not be empty");
  }
  if (!pack.art.worldMap) {
    errors.push("pack missing world map art asset id");
  }

  const worldResult = validateWorldGraph(pack.worldGraph);
  if (!worldResult.ok) {
    errors.push(...worldResult.errors.map((e) => `world: ${e}`));
  }
  const worldEnc = validateWorldGraphEncounters(pack.worldGraph, pack.encounters);
  if (!worldEnc.ok) {
    errors.push(...worldEnc.errors.map((e) => `world: ${e}`));
  }

  for (const site of pack.worldGraph.sites) {
    if (site.districtId && !pack.districts[site.districtId]) {
      errors.push(`world site ${site.id} references unknown district: ${site.districtId}`);
    }
  }

  const enteredDistricts = new Set(
    pack.worldGraph.sites.flatMap((s) => (s.districtId ? [s.districtId] : [])),
  );
  for (const districtId of Object.keys(pack.districts) as DistrictId[]) {
    if (!enteredDistricts.has(districtId)) {
      errors.push(`district ${districtId} has no entry site on the world map`);
    }
    validatePackDistrict(pack, districtId, pack.districts[districtId]!, errors);
  }

  validatePackEncounters(pack, errors);

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

export function loadContentPack(pack: ContentPack): ContentPack {
  const result = validateContentPack(pack);
  if (!result.ok) {
    throw new Error(`invalid content pack ${pack.id}: ${result.errors.join("; ")}`);
  }
  return pack;
}

/** Interior graph for a graphId, searching world + district interiors. Null when not in this pack. */
export function findPackGraph(pack: ContentPack, graphId: string): WorldGraph | null {
  if (pack.worldGraph.id === graphId) return pack.worldGraph;
  for (const entry of Object.values(pack.districts)) {
    if (entry.interiorGraph.id === graphId) return entry.interiorGraph;
  }
  return null;
}
