/**
 * Line of effect + cover geometry — rules/srd/line-of-effect.md, rules/srd/cover.md.
 *
 * Pure functions on MapGrid. Wall cover is corner-occlusion sampled (the M11
 * derivation that replaces RAW GM adjudication): the attacker picks their best
 * tile corner and traces rays to all four corners of the target tile —
 * all rays wall-blocked → no line of effect; some → standard cover (+2);
 * none → no cover from walls. Raised props and creatures never block targeting;
 * they grant cover when the center-to-center line crosses them (RAW measure):
 * props standard (+2), creatures lesser (+1).
 */
import { M11_SUBSET } from "../characters/subset";
import type { MapGrid } from "../types";
import { coneTiles, type Tile } from "./cone";

/** Cover semantics of one tile. "open" includes flat hazards (water, chasms). */
export type TileCoverKind = "open" | "raised" | "wall";

/** PF2e cover tier (rules/srd/cover.md), plus "blocked" = no line of effect. */
export type CoverTier = "none" | "lesser" | "standard" | "blocked";

export type CoverSource =
  | "none"
  | "lesser-creature"
  | "half-prop"
  | "half-wall-partial"
  | "blocked";

export interface CoverResult {
  tier: CoverTier;
  source: CoverSource;
  /** Circumstance bonus to AC the target gains against this attacker (0 when blocked — untargetable). */
  acBonus: number;
  lineOfEffect: boolean;
}

const COVER_TIERS = M11_SUBSET.cover.tiers;

/** Tileset `raised` height at or above this is a wall; below (but > 0) is a prop (m11-subset houseRules.cornerCover). */
export const WALL_RAISED_THRESHOLD: number =
  M11_SUBSET.houseRules.cornerCover.wallRaisedThreshold;

/**
 * Derive a tile's cover kind from battle-tileset semantics (no per-prop
 * authoring): walls are tall blocked tiles, props are low blocked tiles,
 * flat blocked tiles (water, chasms) grant nothing.
 */
export function coverKindFromTileStyle(
  blocked: boolean | undefined,
  raised: number | undefined,
): TileCoverKind {
  if (!blocked) return "open";
  if (raised === undefined || raised <= 0) return "open";
  return raised >= WALL_RAISED_THRESHOLD ? "wall" : "raised";
}

/** Cover kind of a map tile; legacy maps without `cover` data treat every blocked tile as a wall. */
export function tileCoverKind(map: MapGrid, x: number, y: number): TileCoverKind {
  if (map.cover) {
    const entry = map.cover.find((t) => t.x === x && t.y === y);
    return entry ? entry.kind : "open";
  }
  if (map.blocked?.some((t) => t.x === x && t.y === y)) return "wall";
  return "open";
}

/**
 * Sampling corners are inset from the true tile corners so a ray hugging a
 * wall face counts as blocked — "no shooting through walls, ever" — while rays
 * down an open corridor stay clear. Keeps tangent cases deterministic instead
 * of float-luck.
 */
const CORNER_INSET = 0.01;

/**
 * Walls are expanded by a hair for the ray test so a ray passing exactly
 * through a wall's corner point counts as blocked — in particular through the
 * zero-width gap where two diagonally adjacent walls seal a corner. Props and
 * creatures use the exact box (corner grazes grant nothing). Far below
 * CORNER_INSET, so it never flips a case with real clearance.
 */
const WALL_EXPAND = 1e-6;

function sampleCorners(tile: Tile): [number, number][] {
  return [
    [tile.x + CORNER_INSET, tile.y + CORNER_INSET],
    [tile.x + 1 - CORNER_INSET, tile.y + CORNER_INSET],
    [tile.x + CORNER_INSET, tile.y + 1 - CORNER_INSET],
    [tile.x + 1 - CORNER_INSET, tile.y + 1 - CORNER_INSET],
  ];
}

/**
 * True when the open segment (ax,ay)→(bx,by) passes through the interior of
 * the 1×1 tile at (tileX, tileY) with positive length. Grazing an edge or
 * passing exactly through a corner does not count (Liang–Barsky clip, then
 * the clipped midpoint must be strictly inside).
 */
function segmentCrossesTileInterior(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  tileX: number,
  tileY: number,
  expand: number,
): boolean {
  const minX = tileX - expand;
  const maxX = tileX + 1 + expand;
  const minY = tileY - expand;
  const maxY = tileY + 1 + expand;
  const dx = bx - ax;
  const dy = by - ay;
  let t0 = 0;
  let t1 = 1;

  const clip = (p: number, q: number): boolean => {
    if (p === 0) return q >= 0;
    const r = q / p;
    if (p < 0) {
      if (r > t1) return false;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return false;
      if (r < t1) t1 = r;
    }
    return true;
  };

  if (!clip(-dx, ax - minX)) return false;
  if (!clip(dx, maxX - ax)) return false;
  if (!clip(-dy, ay - minY)) return false;
  if (!clip(dy, maxY - ay)) return false;
  if (t1 - t0 < 1e-9) return false;

  const eps = 1e-9;
  const mx = ax + dx * ((t0 + t1) / 2);
  const my = ay + dy * ((t0 + t1) / 2);
  return mx > minX + eps && mx < maxX - eps && my > minY + eps && my < maxY - eps;
}

function wallTiles(map: MapGrid): Tile[] {
  if (map.cover) return map.cover.filter((t) => t.kind === "wall");
  return map.blocked ?? [];
}

function raisedTiles(map: MapGrid): Tile[] {
  return map.cover?.filter((t) => t.kind === "raised") ?? [];
}

function rayBlocked(walls: readonly Tile[], ax: number, ay: number, bx: number, by: number): boolean {
  return walls.some((w) => segmentCrossesTileInterior(ax, ay, bx, by, w.x, w.y, WALL_EXPAND));
}

/**
 * Best-corner clear-ray count: the maximum, over the attacker's four sampling
 * corners, of how many of the four target-tile corners are reachable without
 * crossing a wall interior. 4 = open, 1–3 = partial occlusion, 0 = no line of effect.
 */
function bestCornerClearRays(map: MapGrid, from: Tile, to: Tile): number {
  if (from.x === to.x && from.y === to.y) return 4;
  const walls = wallTiles(map);
  if (walls.length === 0) return 4;
  let best = 0;
  for (const [ax, ay] of sampleCorners(from)) {
    let clear = 0;
    for (const [bx, by] of sampleCorners(to)) {
      if (!rayBlocked(walls, ax, ay, bx, by)) clear++;
    }
    if (clear > best) best = clear;
  }
  return best;
}

/** Line of effect between two tiles (rules/srd/line-of-effect.md). Symmetric. Only walls block. */
export function hasLineOfEffect(map: MapGrid, from: Tile, to: Tile): boolean {
  return bestCornerClearRays(map, from, to) > 0;
}

/** Center-to-center line crossing test (RAW cover measure) against a set of tiles. */
function centerLineCrosses(tiles: readonly Tile[], from: Tile, to: Tile): boolean {
  const ax = from.x + 0.5;
  const ay = from.y + 0.5;
  const bx = to.x + 0.5;
  const by = to.y + 0.5;
  return tiles.some((t) => segmentCrossesTileInterior(ax, ay, bx, by, t.x, t.y, 0));
}

/**
 * Cover the target has against the attacker (rules/srd/cover.md).
 * `occupied` is the tiles of standing creatures; entries on the attacker's or
 * target's own tile are ignored, so callers may pass everyone. Pure — the
 * caller supplies occupancy, the map supplies walls and props.
 */
export function evaluateCover(
  map: MapGrid,
  attacker: Tile,
  target: Tile,
  occupied: readonly Tile[] = [],
): CoverResult {
  const clearRays = bestCornerClearRays(map, attacker, target);
  if (clearRays === 0) {
    return { tier: "blocked", source: "blocked", acBonus: 0, lineOfEffect: false };
  }
  if (clearRays < 4) {
    return {
      tier: "standard",
      source: "half-wall-partial",
      acBonus: coverAcBonus("standard"),
      lineOfEffect: true,
    };
  }
  if (centerLineCrosses(raisedTiles(map), attacker, target)) {
    return {
      tier: "standard",
      source: "half-prop",
      acBonus: coverAcBonus("standard"),
      lineOfEffect: true,
    };
  }
  const creatures = occupied.filter(
    (t) => !(t.x === attacker.x && t.y === attacker.y) && !(t.x === target.x && t.y === target.y),
  );
  if (centerLineCrosses(creatures, attacker, target)) {
    return {
      tier: "lesser",
      source: "lesser-creature",
      acBonus: coverAcBonus("lesser"),
      lineOfEffect: true,
    };
  }
  return { tier: "none", source: "none", acBonus: 0, lineOfEffect: true };
}

/** Circumstance bonus to AC for a cover tier (rules/srd/cover.md table). */
export function coverAcBonus(tier: CoverTier): number {
  if (tier === "lesser") return COVER_TIERS.lesser.acBonus;
  if (tier === "standard") return COVER_TIERS.standard.acBonus;
  return 0;
}

/** Circumstance bonus to Reflex saves against area effects (standard cover only per RAW). */
export function coverReflexVsAreaBonus(tier: CoverTier): number {
  if (tier === "lesser") return COVER_TIERS.lesser.reflexVsAreaBonus;
  if (tier === "standard") return COVER_TIERS.standard.reflexVsAreaBonus;
  return 0;
}

/**
 * Filter area-template tiles by line of effect from the origin
 * (rules/srd/line-of-effect.md: no line of effect → the effect doesn't apply).
 * Wall tiles inside the template filter themselves out.
 */
export function clipTilesByLineOfEffect(map: MapGrid, origin: Tile, tiles: Tile[]): Tile[] {
  return tiles.filter((t) => hasLineOfEffect(map, origin, t));
}

/**
 * M9 cone template clipped by line of effect — closes m9_cone_line_of_effect.
 * Map-bounds filtering remains the caller's job, matching coneTiles.
 */
export function coneTilesWithLineOfEffect(
  map: MapGrid,
  originX: number,
  originY: number,
  targetX: number,
  targetY: number,
  length: number,
): Tile[] {
  return clipTilesByLineOfEffect(
    map,
    { x: originX, y: originY },
    coneTiles(originX, originY, targetX, targetY, length),
  );
}
