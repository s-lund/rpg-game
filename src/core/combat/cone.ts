/** Grid cone templates — rules/srd/spell-breathe-fire.md (quarter circle, 1 tile = 5 ft). */

export interface Tile {
  x: number;
  y: number;
}

/**
 * Cardinal template (+x): tile centers inside the quarter circle of radius
 * `length` from the edge midpoint (0.5, 0), spanning ±45° around the axis.
 */
function cardinalTemplate(length: number): Tile[] {
  const tiles: Tile[] = [];
  for (let dx = 1; dx <= length; dx++) {
    for (let dy = -length; dy <= length; dy++) {
      if (Math.abs(dy) > dx - 0.5) continue;
      const dist = Math.hypot(dx - 0.5, dy);
      if (dist > length) continue;
      tiles.push({ x: dx, y: dy });
    }
  }
  return tiles;
}

/**
 * Diagonal template (+x,+y): tile centers inside the quarter circle of radius
 * `length` from the corner (0.5, 0.5), spanning the quadrant between the axes.
 */
function diagonalTemplate(length: number): Tile[] {
  const tiles: Tile[] = [];
  for (let dx = 1; dx <= length; dx++) {
    for (let dy = 1; dy <= length; dy++) {
      const dist = Math.hypot(dx - 0.5, dy - 0.5);
      if (dist > length) continue;
      tiles.push({ x: dx, y: dy });
    }
  }
  return tiles;
}

/** Rotate a (+x)-template tile into a cardinal direction, or reflect a (+x,+y) tile into a diagonal quadrant. */
function orient(tile: Tile, direction: Tile): Tile {
  if (direction.x === 1 && direction.y === 0) return { x: tile.x, y: tile.y };
  if (direction.x === -1 && direction.y === 0) return { x: -tile.x, y: -tile.y };
  if (direction.x === 0 && direction.y === 1) return { x: -tile.y, y: tile.x };
  if (direction.x === 0 && direction.y === -1) return { x: tile.y, y: -tile.x };
  return { x: tile.x * direction.x, y: tile.y * direction.y };
}

/** Snap the aim toward (targetX, targetY) to the nearest of 8 directions. */
export function coneDirection(
  originX: number,
  originY: number,
  targetX: number,
  targetY: number,
): Tile | null {
  const dx = targetX - originX;
  const dy = targetY - originY;
  if (dx === 0 && dy === 0) return null;
  const angle = Math.atan2(dy, dx);
  const octant = Math.round(angle / (Math.PI / 4));
  const table: Tile[] = [
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
    { x: -1, y: 1 },
    { x: -1, y: 0 },
    { x: -1, y: -1 },
    { x: 0, y: -1 },
    { x: 1, y: -1 },
  ];
  return table[((octant % 8) + 8) % 8]!;
}

/**
 * Tiles covered by a cone of `length` tiles aimed from (originX, originY)
 * toward (targetX, targetY). The caster's own tile is never included.
 * Map-bounds filtering is the caller's job (entities can't stand off-map).
 */
export function coneTiles(
  originX: number,
  originY: number,
  targetX: number,
  targetY: number,
  length: number,
): Tile[] {
  const direction = coneDirection(originX, originY, targetX, targetY);
  if (!direction) return [];
  const diagonal = direction.x !== 0 && direction.y !== 0;
  const template = diagonal ? diagonalTemplate(length) : cardinalTemplate(length);
  return template.map((tile) => {
    const oriented = orient(tile, direction);
    return { x: originX + oriented.x, y: originY + oriented.y };
  });
}

export function isTileInCone(
  originX: number,
  originY: number,
  targetX: number,
  targetY: number,
  length: number,
  tileX: number,
  tileY: number,
): boolean {
  return coneTiles(originX, originY, targetX, targetY, length).some(
    (t) => t.x === tileX && t.y === tileY,
  );
}
