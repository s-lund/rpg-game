/** M9 — grid cone templates per rules/srd/spell-breathe-fire.md. */
import { describe, expect, it } from "vitest";
import { coneDirection, coneTiles, isTileInCone } from "../../src/core/index";

function keys(tiles: { x: number; y: number }[]): string[] {
  return tiles.map((t) => `${t.x},${t.y}`).sort();
}

describe("cone direction snapping", () => {
  it("snaps to the nearest of 8 directions", () => {
    expect(coneDirection(0, 0, 3, 0)).toEqual({ x: 1, y: 0 });
    expect(coneDirection(0, 0, 0, -2)).toEqual({ x: 0, y: -1 });
    expect(coneDirection(0, 0, 2, 2)).toEqual({ x: 1, y: 1 });
    expect(coneDirection(0, 0, -3, 1)).toEqual({ x: -1, y: 0 });
    expect(coneDirection(0, 0, 0, 0)).toBeNull();
  });
});

describe("15-foot (3-tile) cone templates", () => {
  it("cardinal cone east from (0,0) covers the 7-tile quarter circle", () => {
    const tiles = coneTiles(0, 0, 3, 0, 3);
    expect(keys(tiles)).toEqual(
      keys([
        { x: 1, y: 0 },
        { x: 2, y: -1 },
        { x: 2, y: 0 },
        { x: 2, y: 1 },
        { x: 3, y: -1 },
        { x: 3, y: 0 },
        { x: 3, y: 1 },
      ]),
    );
  });

  it("diagonal cone north-east from (0,0) covers the 8-tile quadrant", () => {
    const tiles = coneTiles(0, 0, 2, 2, 3);
    expect(keys(tiles)).toEqual(
      keys([
        { x: 1, y: 1 },
        { x: 1, y: 2 },
        { x: 2, y: 1 },
        { x: 2, y: 2 },
        { x: 1, y: 3 },
        { x: 3, y: 1 },
        { x: 2, y: 3 },
        { x: 3, y: 2 },
      ]),
    );
  });

  it("rotated cardinal cones mirror the east template", () => {
    const west = coneTiles(5, 5, 2, 5, 3);
    expect(keys(west)).toContain("4,5");
    expect(keys(west)).toContain("2,4");
    expect(west).toHaveLength(7);

    const north = coneTiles(5, 5, 5, 8, 3);
    expect(keys(north)).toContain("5,6");
    expect(north).toHaveLength(7);
  });

  it("never includes the caster's own tile", () => {
    for (const [tx, ty] of [
      [8, 5],
      [5, 8],
      [8, 8],
      [2, 2],
    ] as const) {
      const tiles = coneTiles(5, 5, tx, ty, 3);
      expect(tiles.some((t) => t.x === 5 && t.y === 5)).toBe(false);
    }
  });

  it("isTileInCone matches template membership", () => {
    expect(isTileInCone(0, 0, 3, 0, 3, 2, 1)).toBe(true);
    expect(isTileInCone(0, 0, 3, 0, 3, 1, 1)).toBe(false); // outside the ±45° arc at dx=1
    expect(isTileInCone(0, 0, 3, 0, 3, 4, 0)).toBe(false); // beyond 3 tiles
  });
});
