import { derivePartyBlueprints } from "../characters/derive";
import type { InitialStateConfig } from "../types";
import type { CampaignState, WorldGraph } from "../world/types";
import { resolveBattleMap, type ResolvedBattleMap } from "./battle-map";
import type { ContentPack } from "./types";
import type { EncounterId } from "../../shared/ids";

export function resolveEncounterBattleMap(
  pack: ContentPack,
  encounterId: EncounterId,
): ResolvedBattleMap | null {
  const template = pack.encounters[encounterId];
  if (!template?.battleMapId) return null;
  const def = pack.battleMaps[template.battleMapId];
  if (!def) return null;
  const tileset = pack.tilesets[def.tilesetId];
  if (!tileset) return null;
  return resolveBattleMap(def, tileset);
}

export interface PackEncounterResult {
  config: InitialStateConfig;
  battleMap: ResolvedBattleMap | null;
}

/**
 * Battle-map-aware encounter builder: same contract as buildEncounterForSite,
 * but spawns the party on the map's spawn tiles and blocks impassable terrain.
 */
export function buildPackEncounter(
  campaign: CampaignState,
  graph: WorldGraph,
  pack: ContentPack,
): PackEncounterResult {
  const site = graph.sites.find((s) => s.id === campaign.currentSiteId);
  if (!site) {
    throw new Error(`unknown site: ${campaign.currentSiteId}`);
  }
  if (!site.encounterId) {
    throw new Error(`site ${site.id} has no encounter`);
  }
  const template = pack.encounters[site.encounterId];
  if (!template) {
    throw new Error(`unknown encounter: ${site.encounterId}`);
  }

  const battleMap = resolveEncounterBattleMap(pack, site.encounterId);
  if (!battleMap) {
    return {
      config: {
        width: template.width,
        height: template.height,
        party: derivePartyBlueprints(campaign.party),
        enemies: template.enemies.map((e) => ({ ...e })),
      },
      battleMap: null,
    };
  }

  const enemies = template.enemies.map((enemy, index) => {
    const spawn = battleMap.enemySpawns?.[index];
    return spawn ? { ...enemy, x: spawn.x, y: spawn.y } : { ...enemy };
  });

  return {
    config: {
      width: battleMap.width,
      height: battleMap.height,
      party: derivePartyBlueprints(campaign.party, battleMap.partySpawns),
      enemies,
      blockedTiles: battleMap.blocked.map((b) => ({ ...b })),
      coverTiles: battleMap.cover.map((c) => ({ ...c })),
    },
    battleMap,
  };
}
