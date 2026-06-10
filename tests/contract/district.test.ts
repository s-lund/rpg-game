/**
 * FROZEN — district/map validator contract (M6).
 * Area graph + per-area tile grid invariants; deterministic rejection;
 * label rename is data-only; reclamation state serializes.
 * Do not modify, weaken, skip, or delete.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildEncounterForSite,
  createCampaignState,
  createDefaultParty,
  deserializeCampaign,
  markSiteHeld,
  serializeCampaign,
  validateDistrict,
  loadDistrict,
  type Area,
  type AreaEdge,
  type AreaId,
  type District,
  type ExitId,
  type TileGrid,
  type WorldGraph,
} from "../../src/core/index";
import type { EncounterId, SiteId } from "../../src/shared/ids";
import type { EncounterTemplate } from "../../src/core/world/encounters";

function makeRoomGrid(
  areaId: AreaId,
  width: number,
  height: number,
  exitSpecs: { via: ExitId; x: number; y: number; leadsTo: AreaId }[],
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
  tiles[Math.floor(height / 2) * width + Math.floor(width / 2)] = "spawn";
  tiles[Math.floor(height / 2) * width + Math.floor(width / 2) + 1] = "cover";

  const exits: TileGrid["exits"] = {};
  for (const spec of exitSpecs) {
    tiles[spec.y * width + spec.x] = spec.via;
    exits[spec.via] = { x: spec.x, y: spec.y, leadsTo: spec.leadsTo };
  }

  return { areaId, width, height, tiles, exits };
}

function buildValidDistrictFixture(): District {
  const areas: Area[] = [
    { id: "area_gate", label: "Cinder Gate", tier: 1 },
    { id: "area_market", label: "Drowned Market", tier: 2 },
    { id: "area_tower", label: "Bell Tower", tier: 3 },
  ];

  const edges: AreaEdge[] = [
    {
      from: "area_gate",
      to: "area_market",
      via: "exit_north",
      bidirectional: true,
    },
    {
      from: "area_market",
      to: "area_gate",
      via: "exit_south",
      bidirectional: true,
    },
    {
      from: "area_market",
      to: "area_tower",
      via: "exit_north",
      bidirectional: true,
    },
    {
      from: "area_tower",
      to: "area_market",
      via: "exit_south",
      bidirectional: true,
    },
  ];

  const w = 12;
  const h = 10;

  return {
    id: "district_contract_fixture",
    label: "Contract Test District",
    entranceAreaId: "area_gate",
    areas,
    edges,
    tileGrids: {
      area_gate: makeRoomGrid("area_gate", w, h, [
        { via: "exit_north", x: 6, y: 0, leadsTo: "area_market" },
      ]),
      area_market: makeRoomGrid("area_market", w, h, [
        { via: "exit_south", x: 6, y: h - 1, leadsTo: "area_gate" },
        { via: "exit_north", x: 6, y: 0, leadsTo: "area_tower" },
      ]),
      area_tower: makeRoomGrid("area_tower", w, h, [
        { via: "exit_south", x: 6, y: h - 1, leadsTo: "area_market" },
      ]),
    },
  };
}

function buildFixtureWorldGraph(district: District): WorldGraph {
  return {
    id: "district_contract_graph",
    startSiteId: "site_gate",
    sites: district.areas.map((area, i) => ({
      id: `site_${area.id.replace("area_", "")}` as SiteId,
      label: area.label,
      tier: area.tier,
      areaId: area.id,
      encounterId: `enc_${area.id.replace("area_", "")}` as EncounterId,
      mapX: 20 + i * 20,
      mapY: 80 - area.tier * 20,
    })),
    edges: [
      { from: "site_gate", to: "site_market", bidirectional: true },
      { from: "site_market", to: "site_tower", bidirectional: true },
    ],
  };
}

function buildFixtureEncounters(): Record<EncounterId, EncounterTemplate> {
  return {
    enc_gate: {
      id: "enc_gate",
      width: 12,
      height: 10,
      enemies: [
        {
          id: "ent_fixture_scout",
          label: "Scout",
          x: 5,
          y: 5,
          maxHp: 10,
          ac: 15,
          attackBonus: 5,
          damage: { count: 1, sides: 6, modifier: 0 },
        },
      ],
    },
    enc_market: {
      id: "enc_market",
      width: 12,
      height: 10,
      enemies: [
        {
          id: "ent_fixture_patrol",
          label: "Patrol",
          x: 5,
          y: 5,
          maxHp: 12,
          ac: 16,
          attackBonus: 6,
          damage: { count: 1, sides: 6, modifier: 0 },
        },
      ],
    },
    enc_tower: {
      id: "enc_tower",
      width: 12,
      height: 10,
      enemies: [
        {
          id: "ent_fixture_elite",
          label: "Elite",
          x: 5,
          y: 5,
          maxHp: 16,
          ac: 18,
          attackBonus: 8,
          damage: { count: 1, sides: 8, modifier: 2 },
        },
      ],
    },
  };
}

describe("district contract (M6)", () => {
  const validDistrict = buildValidDistrictFixture();

  it("accepts a valid hand-built district fixture", () => {
    const result = validateDistrict(validDistrict);
    expect(result).toEqual({ ok: true });
  });

  it("rejects exit leading to unknown area", () => {
    const bad: District = structuredClone(validDistrict);
    bad.tileGrids.area_gate!.exits.exit_north = {
      x: 6,
      y: 0,
      leadsTo: "area_nowhere",
    };
    const result = validateDistrict(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("area_nowhere"))).toBe(true);
    }
  });

  it("rejects bidirectional edge without matching reverse exit", () => {
    const bad: District = structuredClone(validDistrict);
    delete bad.tileGrids.area_market!.exits.exit_south;
    const result = validateDistrict(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("bidirectional") || e.includes("reverse"))).toBe(
        true,
      );
    }
  });

  it("rejects unreachable area from entrance", () => {
    const bad: District = structuredClone(validDistrict);
    bad.edges = bad.edges.filter((e) => e.to !== "area_tower" && e.from !== "area_tower");
    const result = validateDistrict(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("unreachable"))).toBe(true);
    }
  });

  it("rejects spawn count out of bounds", () => {
    const bad: District = structuredClone(validDistrict);
    const grid = bad.tileGrids.area_gate!;
    grid.tiles = grid.tiles.map((t) => (t === "spawn" ? "floor" : t));
    const result = validateDistrict(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("spawn"))).toBe(true);
    }
  });

  it("rejects non-monotonic tier gradient inward", () => {
    const bad: District = structuredClone(validDistrict);
    const tower = bad.areas.find((a) => a.id === "area_tower")!;
    tower.tier = 1;
    const result = validateDistrict(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("tier"))).toBe(true);
    }
  });

  it("loadDistrict throws on invalid district", () => {
    const bad: District = structuredClone(validDistrict);
    bad.entranceAreaId = "area_missing";
    expect(() => loadDistrict(bad)).toThrow();
  });

  it("label rename does not affect validation or encounter loading", () => {
    const renamed: District = structuredClone(validDistrict);
    renamed.label = "Renamed District Label";
    for (const area of renamed.areas) {
      area.label = `Renamed ${area.label}`;
    }

    expect(validateDistrict(renamed)).toEqual({ ok: true });

    const graph = buildFixtureWorldGraph(renamed);
    const encounters = buildFixtureEncounters();
    const party = createDefaultParty();
    const campaign = createCampaignState(party, graph);

    const before = buildEncounterForSite(campaign, graph, encounters);
    const renamedGraph: WorldGraph = {
      ...graph,
      sites: graph.sites.map((s) => ({ ...s, label: `Renamed ${s.label}` })),
    };
    const after = buildEncounterForSite(campaign, renamedGraph, encounters);

    expect(after.enemies.map((e) => e.id).sort()).toEqual(before.enemies.map((e) => e.id).sort());
  });

  it("district core never imports three.js", () => {
    const districtDir = join(process.cwd(), "src/core/district");
    const files = readdirSync(districtDir).filter((f) => f.endsWith(".ts"));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const content = readFileSync(join(districtDir, file), "utf8");
      expect(content).not.toMatch(/from\s+["']three/);
      expect(content.toLowerCase()).not.toMatch(/document\./);
    }
  });

  it("serialize round-trip preserves siteControl after marking sites held", () => {
    const graph = buildFixtureWorldGraph(validDistrict);
    const party = createDefaultParty();
    let campaign = createCampaignState(party, graph);
    campaign = markSiteHeld(campaign, graph);
    campaign = { ...campaign, currentSiteId: "site_market" };
    campaign = markSiteHeld(campaign, graph);

    const json = serializeCampaign(campaign);
    const restored = deserializeCampaign(json);

    expect(restored.siteControl["site_gate"]).toBe("held");
    expect(restored.siteControl["site_market"]).toBe("held");
    expect(restored.siteControl["site_tower"]).toBe("hostile");
  });
});
