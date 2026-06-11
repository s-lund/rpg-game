import type { ContentPack } from "../../core/index";
import { EMBERWATCH_BATTLE_MAPS, EMBERWATCH_TILESETS } from "./battle-maps";
import { EMBERWATCH_DISTRICTS } from "./districts";
import { EMBERWATCH_ENCOUNTERS } from "./encounters";
import { EMBERWATCH_AMBIENCE, EMBERWATCH_WORLD } from "./world";

/** Default content pack — the standard maps the game ships with. */
export const EMBERWATCH_PACK: ContentPack = {
  id: "pack_emberwatch",
  label: "The Emberwatch Frontier",
  description:
    "Reclaim a ruined frontier city: a drowned harbor, a silent bell tower, and the vaults beneath the old cathedral.",
  worldGraph: EMBERWATCH_WORLD,
  districts: EMBERWATCH_DISTRICTS,
  encounters: EMBERWATCH_ENCOUNTERS,
  battleMaps: EMBERWATCH_BATTLE_MAPS,
  tilesets: EMBERWATCH_TILESETS,
  ambience: EMBERWATCH_AMBIENCE,
  art: {
    worldMap: "map_world_emberwatch",
    districtMaps: {
      district_drowned_quay: {
        level_quay: "map_emberwatch_quay",
      },
      district_bell_spire: {
        level_ground: "map_emberwatch_spire_ground",
        level_stair: "map_emberwatch_spire_stair",
        level_crown: "map_emberwatch_spire_crown",
      },
      district_ember_vaults: {
        level_ossuary: "map_emberwatch_vaults_ossuary",
        level_deep: "map_emberwatch_vaults_deep",
      },
    },
  },
};

/** Manifest entries for this pack's artwork (asset id → file). Renderer-side data. */
export const EMBERWATCH_MANIFEST_ENTRIES: Record<string, { real?: string; placeholder?: string }> = {
  map_world_emberwatch: { real: "/art/emberwatch/world.svg" },
  map_emberwatch_quay: { real: "/art/emberwatch/quay.svg" },
  map_emberwatch_spire_ground: { real: "/art/emberwatch/spire-ground.svg" },
  map_emberwatch_spire_stair: { real: "/art/emberwatch/spire-stair.svg" },
  map_emberwatch_spire_crown: { real: "/art/emberwatch/spire-crown.svg" },
  map_emberwatch_vaults_ossuary: { real: "/art/emberwatch/vaults-ossuary.svg" },
  map_emberwatch_vaults_deep: { real: "/art/emberwatch/vaults-deep.svg" },
};
