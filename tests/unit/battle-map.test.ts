import { describe, expect, it } from "vitest";
import {
  resolveBattleMap,
  validateBattleMap,
  type BattleMapDefinition,
  type BattleTileset,
} from "../../src/core/index";

const tileset: BattleTileset = {
  id: "ts_test",
  label: "Test stone",
  background: "#101418",
  kinds: {
    floor: { fill: "#3d4454" },
    floor_alt: { fill: "#343a48" },
    wall: { fill: "#1c2026", blocked: true, raised: 0.9 },
    crate: { fill: "#6a5132", blocked: true, raised: 0.45 },
  },
};

function makeMap(overrides?: Partial<BattleMapDefinition>): BattleMapDefinition {
  return {
    id: "bmap_test",
    tilesetId: "ts_test",
    width: 8,
    height: 6,
    rows: [
      "########",
      "#......#",
      "#..c...#",
      "#......#",
      "#......#",
      "########",
    ],
    legend: { "#": "wall", ".": "floor", c: "crate" },
    partySpawns: [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 2 },
      { x: 1, y: 3 },
    ],
    ...overrides,
  };
}

describe("battle map validation", () => {
  it("accepts a well-formed map", () => {
    expect(validateBattleMap(makeMap(), tileset)).toEqual({ ok: true });
  });

  it("rejects a row length mismatch", () => {
    const result = validateBattleMap(
      makeMap({ rows: ["####", "#..#", "#..#", "#..#", "#..#", "####"] }),
      tileset,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("length"))).toBe(true);
    }
  });

  it("rejects characters missing from the legend", () => {
    const bad = makeMap();
    bad.rows = bad.rows.map((r, i) => (i === 2 ? r.replace("c", "?") : r));
    const result = validateBattleMap(bad, tileset);
    expect(result.ok).toBe(false);
  });

  it("rejects a party spawn on a blocked tile", () => {
    const result = validateBattleMap(
      makeMap({
        partySpawns: [
          { x: 0, y: 0 },
          { x: 2, y: 1 },
          { x: 1, y: 2 },
          { x: 1, y: 3 },
        ],
      }),
      tileset,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("blocked"))).toBe(true);
    }
  });

  it("rejects fewer than 4 party spawns", () => {
    const result = validateBattleMap(
      makeMap({ partySpawns: [{ x: 1, y: 1 }, { x: 2, y: 1 }] }),
      tileset,
    );
    expect(result.ok).toBe(false);
  });

  it("rejects overlapping spawns", () => {
    const result = validateBattleMap(
      makeMap({
        partySpawns: [
          { x: 1, y: 1 },
          { x: 1, y: 1 },
          { x: 1, y: 2 },
          { x: 1, y: 3 },
        ],
      }),
      tileset,
    );
    expect(result.ok).toBe(false);
  });
});

describe("battle map resolution", () => {
  it("joins layout with tileset styles and collects blocked tiles", () => {
    const resolved = resolveBattleMap(makeMap(), tileset);

    expect(resolved.width).toBe(8);
    expect(resolved.height).toBe(6);
    expect(resolved.tiles).toHaveLength(48);
    expect(resolved.background).toBe("#101418");

    const crate = resolved.tiles.find((t) => t.kind === "crate");
    expect(crate).toMatchObject({ x: 3, y: 2 });
    expect(crate!.style.raised).toBe(0.45);

    // perimeter walls (24) + 1 crate
    expect(resolved.blocked).toHaveLength(25);
    expect(resolved.blocked).toContainEqual({ x: 3, y: 2 });

    expect(resolved.cover).toContainEqual({ x: 3, y: 2, kind: "raised" });
    expect(resolved.cover.filter((t) => t.kind === "wall").length).toBe(24);
  });

  it("omits water-style flat blocked tiles from cover", () => {
    const waterTileset: BattleTileset = {
      ...tileset,
      kinds: {
        ...tileset.kinds,
        water: { fill: "#224466", blocked: true },
      },
    };
    const map = makeMap({
      rows: ["########", "#..~...#", "#......#", "#......#", "#......#", "########"],
      legend: { "#": "wall", ".": "floor", c: "crate", "~": "water" },
    });
    const resolved = resolveBattleMap(map, waterTileset);
    expect(resolved.blocked.some((t) => t.x === 3 && t.y === 1)).toBe(true);
    expect(resolved.cover.some((t) => t.x === 3 && t.y === 1)).toBe(false);
  });

  it("throws on an invalid definition", () => {
    expect(() =>
      resolveBattleMap(makeMap({ width: 99 }), tileset),
    ).toThrowError(/invalid battle map/);
  });
});
