import type { ContentPack, EncounterTemplate, EntityBlueprint } from "../../core/index";
import type { EncounterId, SiteId } from "../../shared/ids";
import { buildPackDistrict } from "../build-district";

/**
 * Minimal second pack proving the content-pack seam: different world,
 * one small district, marsh palette — same engine, zero code changes.
 */

function marshFoe(
  id: EntityBlueprint["id"],
  label: string,
  tier: number,
  x: number,
  y: number,
  ranged = false,
): EntityBlueprint {
  return {
    id,
    label,
    x,
    y,
    maxHp: ranged ? 8 + tier : 8 + tier * 2,
    ac: (ranged ? 13 : 14) + tier,
    attackBonus: 4 + tier,
    strikeRange: ranged ? 4 : 1,
    damageType: ranged ? "piercing" : "slashing",
    damage: { count: 1, sides: 6, modifier: tier >= 2 ? 1 : 0 },
    saves: ranged
      ? { fortitude: 2 + tier, reflex: 5 + tier, will: 2 + tier }
      : { fortitude: 4 + tier, reflex: 3 + tier, will: 2 + tier },
    initiativeModifier: (ranged ? 5 : 3) + tier,
    // Marsh-soaked creatures shrug off cold but burn easily (M9 theming).
    resistances: { cold: 3 },
    weaknesses: { fire: 2 },
    // Decision 2026-06-11: stalker shots tangle marsh-mire around your legs.
    ...(ranged ? { onHitCondition: { condition: "slowed" as const, value: 1 } } : {}),
  };
}

const MIRRORMARSH_ENCOUNTERS: Record<EncounterId, EncounterTemplate> = {
  enc_reedgate: {
    id: "enc_reedgate",
    width: 14,
    height: 10,
    battleMapId: "bmap_marsh_path",
    enemies: [
      marshFoe("ent_bog_stalker_1", "Bog Stalker", 1, 10, 4, true),
      marshFoe("ent_mire_husk_1", "Mire Husk", 1, 9, 6),
    ],
  },
  enc_granary_steps: {
    id: "enc_granary_steps",
    width: 12,
    height: 10,
    battleMapId: "bmap_granary",
    enemies: [
      marshFoe("ent_steps_husk_1", "Mire Husk", 1, 4, 3),
      marshFoe("ent_steps_stalker_1", "Bog Stalker", 1, 8, 2, true),
    ],
  },
  enc_flooded_floor: {
    id: "enc_flooded_floor",
    width: 12,
    height: 10,
    battleMapId: "bmap_granary",
    enemies: [
      marshFoe("ent_floor_husk_1", "Mire Husk", 2, 4, 3),
      marshFoe("ent_floor_husk_2", "Mire Husk", 2, 7, 3),
      marshFoe("ent_floor_stalker_1", "Bog Stalker", 2, 6, 2, true),
    ],
  },
  enc_grain_vault: {
    id: "enc_grain_vault",
    width: 12,
    height: 10,
    battleMapId: "bmap_granary",
    enemies: [
      {
        id: "ent_granary_wight_1",
        label: "Granary Wight",
        x: 6,
        y: 3,
        maxHp: 18,
        ac: 17,
        attackBonus: 7,
        strikeRange: 1,
        damageType: "cold",
        damage: { count: 1, sides: 8, modifier: 2 },
        saves: { fortitude: 7, reflex: 5, will: 7 },
        initiativeModifier: 6,
        resistances: { cold: 3 },
        weaknesses: { fire: 2 },
        // Boss-tier: a wight's touch chills the heart (frightened on hit).
        onHitCondition: { condition: "frightened", value: 2 },
      },
      marshFoe("ent_vault_stalker_1", "Bog Stalker", 2, 3, 2, true),
    ],
  },
};

const sunkenGranary = buildPackDistrict({
  id: "district_sunken_granary",
  label: "The Sunken Granary",
  levels: [{ id: "level_granary", label: "The Granary" }],
  areas: [
    {
      id: "area_granary_steps",
      label: "Granary Steps",
      tier: 1,
      encounterId: "enc_granary_steps",
      mapX: 50,
      mapY: 76,
    },
    {
      id: "area_flooded_floor",
      label: "Flooded Threshing Floor",
      tier: 2,
      encounterId: "enc_flooded_floor",
      mapX: 36,
      mapY: 44,
    },
    {
      id: "area_grain_vault",
      label: "Grain Vault",
      tier: 2,
      encounterId: "enc_grain_vault",
      mapX: 62,
      mapY: 26,
    },
  ],
  connections: [
    { a: "area_granary_steps", b: "area_flooded_floor", sideA: "north", sideB: "south" },
    { a: "area_flooded_floor", b: "area_grain_vault", sideA: "north", sideB: "south" },
  ],
});

const MIRRORMARSH_AMBIENCE: Record<SiteId, string> = {
  site_causeway_camp:
    "Tents on the last dry stones of the old causeway. Frogs fall silent in waves, then start again.",
  site_reedgate:
    "Reeds taller than spears crowd the gate-posts. The water mirrors a sky that isn't quite the one above.",
  site_sunken_granary:
    "The granary's roof rides above the flood like a stranded ark. Grain still spills from its drowned doors.",
  site_heron_shrine:
    "A shrine of lashed reeds and heron skulls. Offerings of fish bones gleam on the altar stone.",
  site_granary_steps:
    "Stone steps descend into green water. Something has been dragging sacks up them.",
  site_flooded_floor:
    "The threshing floor lies under a still sheet of water. Each step rings outward in slow circles.",
  site_grain_vault:
    "The vault smells of wet grain and old cold. The harvest here was never meant to be kept this long.",
};

export const MIRRORMARSH_PACK: ContentPack = {
  id: "pack_mirrormarsh",
  label: "The Mirrormarsh",
  description:
    "A drowned fen frontier: causeways, reed gates, and a granary sunk to its eaves — a different land on the same engine.",
  worldGraph: {
    id: "graph_world_mirrormarsh",
    startSiteId: "site_causeway_camp",
    sites: [
      {
        id: "site_causeway_camp",
        label: "Causeway Camp",
        tier: 1,
        siteKind: "shelter",
        mapX: 24,
        mapY: 70,
      },
      {
        id: "site_reedgate",
        label: "The Reedgate",
        tier: 1,
        encounterId: "enc_reedgate",
        mapX: 45,
        mapY: 52,
      },
      {
        id: "site_sunken_granary",
        label: "The Sunken Granary",
        tier: 2,
        siteKind: "quest",
        districtId: "district_sunken_granary",
        mapX: 66,
        mapY: 36,
      },
      {
        id: "site_heron_shrine",
        label: "Heron Shrine",
        tier: 2,
        siteKind: "quest",
        mapX: 80,
        mapY: 62,
      },
    ],
    edges: [
      { from: "site_causeway_camp", to: "site_reedgate", bidirectional: true },
      { from: "site_reedgate", to: "site_sunken_granary", bidirectional: true },
      { from: "site_sunken_granary", to: "site_heron_shrine", bidirectional: true },
    ],
  },
  districts: {
    district_sunken_granary: sunkenGranary,
  },
  encounters: MIRRORMARSH_ENCOUNTERS,
  battleMaps: {
    bmap_marsh_path: {
      id: "bmap_marsh_path",
      tilesetId: "ts_marsh",
      width: 14,
      height: 10,
      legend: { "~": "water", ".": "floor", ",": "floor_alt", r: "reeds", o: "tussock" },
      rows: [
        "~~~~~~~~~~~~~~",
        "~rr...r...rr~~",
        "~r.........r~~",
        "..,..~~..,....",
        ".....~~.......",
        "..............",
        "~r...,....r..~",
        "~rr.....o.rr~~",
        "~~r......r~~~~",
        "~~~~~~~~~~~~~~",
      ],
      partySpawns: [
        { x: 1, y: 3 },
        { x: 1, y: 4 },
        { x: 2, y: 5 },
        { x: 1, y: 5 },
      ],
    },
    bmap_granary: {
      id: "bmap_granary",
      tilesetId: "ts_marsh",
      width: 12,
      height: 10,
      legend: { "#": "wall", ".": "floor", ",": "floor_alt", "~": "water", c: "sack", _: "road" },
      rows: [
        "############",
        "#..c....c..#",
        "#..........#",
        "#~~~....~~~#",
        "#~~~....~~~#",
        "#..........#",
        "#.c......c.#",
        "#..........#",
        "#....,,....#",
        "#####__#####",
      ],
      partySpawns: [
        { x: 5, y: 8 },
        { x: 6, y: 8 },
        { x: 4, y: 8 },
        { x: 7, y: 8 },
      ],
    },
  },
  tilesets: {
    ts_marsh: {
      id: "ts_marsh",
      label: "Mirrormarsh fen",
      background: "#0c1410",
      kinds: {
        floor: { fill: "#3f4a36" },
        floor_alt: { fill: "#37422f" },
        road: { fill: "#4a523c" },
        water: { fill: "#2a4a40", blocked: true, accent: "#3f6b5c" },
        reeds: { fill: "#4f5e35", blocked: true, raised: 0.35 },
        tussock: { fill: "#5a6840", blocked: true, raised: 0.2 },
        wall: { fill: "#2c3326", blocked: true, raised: 0.9 },
        sack: { fill: "#6b5a32", blocked: true, raised: 0.4 },
      },
    },
  },
  ambience: MIRRORMARSH_AMBIENCE,
  art: {
    worldMap: "map_world_mirrormarsh",
    districtMaps: {
      district_sunken_granary: {
        level_granary: "map_mirrormarsh_granary",
      },
    },
  },
};

export const MIRRORMARSH_MANIFEST_ENTRIES: Record<string, { real?: string; placeholder?: string }> = {
  map_world_mirrormarsh: { real: "/art/mirrormarsh/world.svg" },
  map_mirrormarsh_granary: { real: "/art/mirrormarsh/granary.svg" },
};
