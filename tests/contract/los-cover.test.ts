/**
 * M11 contract — line of effect + cover geometry (rules/srd/cover.md,
 * rules/srd/line-of-effect.md, decisions resolved 2026-06-12):
 *
 * - Wall cover is corner-occlusion sampled: attacker's best tile corner vs the
 *   target tile's four corners. All rays blocked → no line of effect (cannot
 *   target); some blocked → standard cover (+2 AC); none → open. Tangent rays
 *   (hugging a wall face or exactly through a wall corner) count as blocked:
 *   there is no shooting through walls, ever.
 * - Raised props (carts, rubble) never block targeting; they grant standard
 *   cover (+2) when the center-to-center line crosses them. Flat hazards
 *   (water, chasms) are impassable but grant nothing.
 * - A creature in the center-to-center line grants lesser cover (+1 AC) —
 *   PF2e RAW friendly fire: misses never redirect to the ally.
 * - Standard cover grants +2 to Reflex saves against area effects; lesser none.
 * - Area templates are clipped by line of effect from their origin
 *   (closes m9_cone_line_of_effect).
 */
import { describe, expect, it } from "vitest";
import {
  coneTilesWithLineOfEffect,
  coverAcBonus,
  coverKindFromTileStyle,
  coverReflexVsAreaBonus,
  evaluateCover,
  hasLineOfEffect,
  tileCoverKind,
  WALL_RAISED_THRESHOLD,
} from "../../src/core/index";
import type { MapGrid } from "../../src/core/types";

/**
 * Build a MapGrid from character rows:
 *   "." floor · "#" wall · "c" raised prop (cart) · "~" flat hazard (water)
 * Walls, props, and hazards are all impassable; only cover semantics differ.
 */
function grid(rows: string[]): MapGrid {
  const blocked: { x: number; y: number }[] = [];
  const cover: { x: number; y: number; kind: "wall" | "raised" }[] = [];
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === "#") {
        blocked.push({ x, y });
        cover.push({ x, y, kind: "wall" });
      } else if (ch === "c") {
        blocked.push({ x, y });
        cover.push({ x, y, kind: "raised" });
      } else if (ch === "~") {
        blocked.push({ x, y });
      }
    });
  });
  return { width: rows[0]!.length, height: rows.length, blocked, cover };
}

const at = (x: number, y: number) => ({ x, y });

describe("line of effect (corner-occlusion sampling)", () => {
  it("is open on an empty field, to itself, and to adjacent tiles", () => {
    const map = grid(["....", "....", "...."]);
    expect(hasLineOfEffect(map, at(0, 0), at(3, 2))).toBe(true);
    expect(hasLineOfEffect(map, at(1, 1), at(1, 1))).toBe(true);
    expect(hasLineOfEffect(map, at(1, 1), at(2, 1))).toBe(true);
  });

  it("a target directly behind a wall cannot be targeted at all", () => {
    const map = grid([".#."]);
    expect(hasLineOfEffect(map, at(0, 0), at(2, 0))).toBe(false);
  });

  it("a diagonal shot exactly across a wall corner is blocked — never through walls", () => {
    const map = grid(["...", ".#.", "..."]);
    expect(hasLineOfEffect(map, at(0, 0), at(2, 2))).toBe(false);
    expect(hasLineOfEffect(map, at(2, 0), at(0, 2))).toBe(false);
  });

  it("a single open wall corner between diagonal neighbors does not block melee-range targeting", () => {
    const map = grid([".#", ".."]);
    expect(hasLineOfEffect(map, at(0, 0), at(1, 1))).toBe(true);
  });

  it("a sealed diagonal corner (two walls) blocks even adjacent diagonals", () => {
    const map = grid([".#", "#."]);
    expect(hasLineOfEffect(map, at(0, 0), at(1, 1))).toBe(false);
  });

  it("rays down a one-tile corridor between walls stay open", () => {
    const map = grid(["#####", ".....", "#####"]);
    expect(hasLineOfEffect(map, at(0, 1), at(4, 1))).toBe(true);
  });

  it("is symmetric: blocked one way is blocked the other way", () => {
    const map = grid([
      ".....",
      ".....",
      "##...",
      ".....",
      ".....",
    ]);
    const pairs: [ReturnType<typeof at>, ReturnType<typeof at>][] = [
      [at(1, 1), at(0, 3)],
      [at(2, 2), at(0, 3)],
      [at(2, 3), at(0, 3)],
      [at(0, 0), at(4, 4)],
    ];
    for (const [a, b] of pairs) {
      expect(hasLineOfEffect(map, a, b)).toBe(hasLineOfEffect(map, b, a));
    }
  });

  it("raised props and flat hazards never block line of effect", () => {
    expect(hasLineOfEffect(grid([".c."]), at(0, 0), at(2, 0))).toBe(true);
    expect(hasLineOfEffect(grid([".cc."]), at(0, 0), at(3, 0))).toBe(true);
    expect(hasLineOfEffect(grid([".~."]), at(0, 0), at(2, 0))).toBe(true);
  });

  it("legacy maps without cover data treat every blocked tile as a wall", () => {
    const legacy: MapGrid = { width: 3, height: 1, blocked: [{ x: 1, y: 0 }] };
    expect(hasLineOfEffect(legacy, at(0, 0), at(2, 0))).toBe(false);
  });
});

describe("cover gradient: sidestepping opens the angle around a wall corner", () => {
  // Target tucked south of a two-tile wall; three attacker positions walk
  // around the corner: fully occluded → corner peek → clear line.
  const map = grid([
    ".....",
    ".....",
    "##...",
    "T....", // "T" parses as floor; target tile is (0,3)
    ".....",
  ]);
  const target = at(0, 3);

  it("fully occluded: no line of effect, no reticle", () => {
    const cover = evaluateCover(map, at(1, 1), target);
    expect(cover).toEqual({
      tier: "blocked",
      source: "blocked",
      acBonus: 0,
      lineOfEffect: false,
    });
  });

  it("corner peek: partial occlusion is standard (half) cover, +2 AC", () => {
    const cover = evaluateCover(map, at(2, 2), target);
    expect(cover).toEqual({
      tier: "standard",
      source: "half-wall-partial",
      acBonus: 2,
      lineOfEffect: true,
    });
  });

  it("clear line: no cover from walls", () => {
    const cover = evaluateCover(map, at(2, 3), target);
    expect(cover).toEqual({ tier: "none", source: "none", acBonus: 0, lineOfEffect: true });
  });

  it("wall partial occlusion outranks a creature in the line", () => {
    const cover = evaluateCover(map, at(2, 2), target, [at(1, 3)]);
    expect(cover.source).toBe("half-wall-partial");
    expect(cover.tier).toBe("standard");
  });

  it("is deterministic and does not mutate its inputs", () => {
    const snapshot = JSON.stringify(map);
    const first = evaluateCover(map, at(2, 2), target, [at(1, 3)]);
    const second = evaluateCover(map, at(2, 2), target, [at(1, 3)]);
    expect(second).toEqual(first);
    expect(JSON.stringify(map)).toBe(snapshot);
  });
});

describe("cover from props and creatures (center-to-center line)", () => {
  it("a target behind a cart is targetable with standard (half) cover", () => {
    const cover = evaluateCover(grid([".c."]), at(0, 0), at(2, 0));
    expect(cover).toEqual({
      tier: "standard",
      source: "half-prop",
      acBonus: 2,
      lineOfEffect: true,
    });
  });

  it("a prop off the firing line grants nothing", () => {
    const map = grid(["...", ".c."]);
    const cover = evaluateCover(map, at(0, 0), at(2, 0));
    expect(cover.tier).toBe("none");
  });

  it("an ally in the firing line grants the target lesser cover, +1 AC", () => {
    const cover = evaluateCover(grid(["....."]), at(0, 0), at(4, 0), [at(2, 0)]);
    expect(cover).toEqual({
      tier: "lesser",
      source: "lesser-creature",
      acBonus: 1,
      lineOfEffect: true,
    });
  });

  it("creatures on the attacker's or target's own tile are ignored", () => {
    const cover = evaluateCover(grid(["....."]), at(0, 0), at(4, 0), [at(0, 0), at(4, 0)]);
    expect(cover.tier).toBe("none");
  });

  it("a creature beside the line (or only corner-grazed diagonally) grants nothing", () => {
    expect(evaluateCover(grid([".....", "....."]), at(0, 0), at(4, 0), [at(2, 1)]).tier).toBe(
      "none",
    );
    // Center line (0,0)→(2,2) passes exactly through tile corners of (1,0)/(0,1).
    const diag = grid(["...", "...", "..."]);
    expect(evaluateCover(diag, at(0, 0), at(2, 2), [at(1, 0), at(0, 1)]).tier).toBe("none");
  });

  it("a prop in the line outranks a creature in the line", () => {
    const cover = evaluateCover(grid([".c..."]), at(0, 0), at(4, 0), [at(3, 0)]);
    expect(cover.source).toBe("half-prop");
    expect(cover.acBonus).toBe(2);
  });

  it("flat hazards in the line grant no cover", () => {
    const cover = evaluateCover(grid([".~."]), at(0, 0), at(2, 0));
    expect(cover.tier).toBe("none");
  });
});

describe("cover bonuses (single source of truth, rules/srd/cover.md table)", () => {
  it("AC: none 0, lesser +1, standard +2, blocked untargetable (0)", () => {
    expect(coverAcBonus("none")).toBe(0);
    expect(coverAcBonus("lesser")).toBe(1);
    expect(coverAcBonus("standard")).toBe(2);
    expect(coverAcBonus("blocked")).toBe(0);
  });

  it("Reflex vs area effects: only standard cover helps (+2)", () => {
    expect(coverReflexVsAreaBonus("none")).toBe(0);
    expect(coverReflexVsAreaBonus("lesser")).toBe(0);
    expect(coverReflexVsAreaBonus("standard")).toBe(2);
    expect(coverReflexVsAreaBonus("blocked")).toBe(0);
  });
});

describe("tile cover kinds from tileset semantics", () => {
  it("derives wall/prop/none from blocked + raised height", () => {
    expect(WALL_RAISED_THRESHOLD).toBe(0.7);
    expect(coverKindFromTileStyle(true, 0.9)).toBe("wall"); // wall
    expect(coverKindFromTileStyle(true, 1.2)).toBe("wall"); // pillar
    expect(coverKindFromTileStyle(true, 0.7)).toBe("wall"); // boundary is a wall
    expect(coverKindFromTileStyle(true, 0.45)).toBe("raised"); // cart, crate
    expect(coverKindFromTileStyle(true, 0.2)).toBe("raised"); // tussock
    expect(coverKindFromTileStyle(true, undefined)).toBe("open"); // water, chasm
    expect(coverKindFromTileStyle(true, 0)).toBe("open");
    expect(coverKindFromTileStyle(false, 1.0)).toBe("open"); // walkable is never cover
    expect(coverKindFromTileStyle(undefined, undefined)).toBe("open");
  });

  it("reads per-tile kinds from the map, falling back to blocked-as-wall on legacy maps", () => {
    const map = grid([".#c~"]);
    expect(tileCoverKind(map, 0, 0)).toBe("open");
    expect(tileCoverKind(map, 1, 0)).toBe("wall");
    expect(tileCoverKind(map, 2, 0)).toBe("raised");
    expect(tileCoverKind(map, 3, 0)).toBe("open");
    const legacy: MapGrid = { width: 2, height: 1, blocked: [{ x: 1, y: 0 }] };
    expect(tileCoverKind(legacy, 1, 0)).toBe("wall");
    expect(tileCoverKind(legacy, 0, 0)).toBe("open");
  });
});

describe("cone template clipped by line of effect (closes m9_cone_line_of_effect)", () => {
  it("a wall casts a shadow through the cone; the flanks stay", () => {
    const map = grid([
      ".....",
      ".#...",
      ".....",
    ]);
    // Caster at (0,1) breathes fire east: the M9 cardinal template is
    // (1,1),(2,0),(2,1),(2,2),(3,0),(3,1),(3,2). The wall at (1,1) removes
    // itself and its shadow (2,1),(3,1); the flanking tiles remain.
    const tiles = coneTilesWithLineOfEffect(map, 0, 1, 3, 1, 3);
    const keys = tiles.map((t) => `${t.x},${t.y}`).sort();
    expect(keys).toEqual(["2,0", "2,2", "3,0", "3,2"]);
  });

  it("an unobstructed cone is the full M9 template", () => {
    const map = grid([
      ".....",
      ".....",
      ".....",
    ]);
    const tiles = coneTilesWithLineOfEffect(map, 0, 1, 3, 1, 3);
    expect(tiles).toHaveLength(7);
  });

  it("raised props do not clip the cone", () => {
    const map = grid([
      ".....",
      ".c...",
      ".....",
    ]);
    const tiles = coneTilesWithLineOfEffect(map, 0, 1, 3, 1, 3);
    expect(tiles).toHaveLength(7);
  });
});
