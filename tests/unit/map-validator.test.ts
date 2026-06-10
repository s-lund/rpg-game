import { describe, expect, it } from "vitest";
import {
  validateAreaGraph,
  validateTileGrid,
  validateDistrict,
  MAX_COVER,
  type Area,
  type AreaEdge,
  type AreaId,
  type District,
  type ExitId,
  type TileGrid,
} from "../../src/core/index";

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

  const exits: TileGrid["exits"] = {};
  for (const spec of exitSpecs) {
    tiles[spec.y * width + spec.x] = spec.via;
    exits[spec.via] = { x: spec.x, y: spec.y, leadsTo: spec.leadsTo };
  }

  return { areaId, width, height, tiles, exits };
}

function minimalDistrict(): District {
  const areas: Area[] = [
    { id: "area_a", label: "A", tier: 1 },
    { id: "area_b", label: "B", tier: 2 },
  ];
  const edges: AreaEdge[] = [
    { from: "area_a", to: "area_b", via: "exit_north", bidirectional: true },
    { from: "area_b", to: "area_a", via: "exit_south", bidirectional: true },
  ];
  const w = 10;
  const h = 8;
  return {
    id: "district_unit_test",
    label: "Unit Test",
    entranceAreaId: "area_a",
    areas,
    edges,
    tileGrids: {
      area_a: makeRoomGrid("area_a", w, h, [
        { via: "exit_north", x: 5, y: 0, leadsTo: "area_b" },
      ]),
      area_b: makeRoomGrid("area_b", w, h, [
        { via: "exit_south", x: 5, y: h - 1, leadsTo: "area_a" },
      ]),
    },
  };
}

describe("area graph validation", () => {
  it("accepts a valid two-area graph", () => {
    const d = minimalDistrict();
    const result = validateAreaGraph(d.areas, d.edges, d.entranceAreaId);
    expect(result).toEqual({ ok: true });
  });

  it("rejects duplicate area ids", () => {
    const d = minimalDistrict();
    d.areas.push({ id: "area_a", label: "Dup", tier: 1 });
    const result = validateAreaGraph(d.areas, d.edges, d.entranceAreaId);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("duplicate"))).toBe(true);
    }
  });

  it("rejects invalid entrance area id", () => {
    const d = minimalDistrict();
    const result = validateAreaGraph(d.areas, d.edges, "area_missing");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("entrance"))).toBe(true);
    }
  });

  it("rejects self-loop edges", () => {
    const d = minimalDistrict();
    d.edges.push({ from: "area_a", to: "area_a", via: "exit_west", bidirectional: false });
    const result = validateAreaGraph(d.areas, d.edges, d.entranceAreaId);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("self-loop"))).toBe(true);
    }
  });
});

describe("tile grid validation", () => {
  it("accepts a valid room grid", () => {
    const d = minimalDistrict();
    const result = validateTileGrid(d.tileGrids.area_a!, new Set(["area_a", "area_b"]));
    expect(result).toEqual({ ok: true });
  });

  it("rejects tile count mismatch", () => {
    const d = minimalDistrict();
    const grid = structuredClone(d.tileGrids.area_a!);
    grid.tiles.pop();
    const result = validateTileGrid(grid, new Set(["area_a", "area_b"]));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("tile count"))).toBe(true);
    }
  });

  it("rejects too many cover tiles", () => {
    const d = minimalDistrict();
    const grid = structuredClone(d.tileGrids.area_a!);
    let added = 0;
    for (let i = 0; i < grid.tiles.length && added < MAX_COVER + 1; i++) {
      if (grid.tiles[i] === "floor") {
        grid.tiles[i] = "cover";
        added += 1;
      }
    }
    const result = validateTileGrid(grid, new Set(["area_a", "area_b"]));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("cover"))).toBe(true);
    }
  });

  it("rejects exit coordinates out of bounds", () => {
    const d = minimalDistrict();
    const grid = structuredClone(d.tileGrids.area_a!);
    grid.exits.exit_north = { x: 99, y: 0, leadsTo: "area_b" };
    const result = validateTileGrid(grid, new Set(["area_a", "area_b"]));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("bounds"))).toBe(true);
    }
  });
});

describe("full district validation", () => {
  it("accepts minimal valid district", () => {
    expect(validateDistrict(minimalDistrict())).toEqual({ ok: true });
  });

  it("rejects missing tile grid for an area", () => {
    const d = minimalDistrict();
    delete d.tileGrids.area_b;
    const result = validateDistrict(d);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("tile grid"))).toBe(true);
    }
  });
});
