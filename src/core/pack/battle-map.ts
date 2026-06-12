import { coverKindFromTileStyle } from "../combat/los";
import type { ValidationResult } from "../characters/types";
import type { BattleMapDefinition, BattleTileStyle, BattleTileset } from "./types";

export const MIN_BATTLE_DIM = 6;
export const MAX_BATTLE_DIM = 32;

export interface ResolvedBattleTile {
  x: number;
  y: number;
  kind: string;
  style: BattleTileStyle;
}

/** Battle map joined with its tileset — everything a renderer or encounter builder needs. */
export interface ResolvedBattleMap {
  id: BattleMapDefinition["id"];
  width: number;
  height: number;
  tiles: ResolvedBattleTile[];
  blocked: { x: number; y: number }[];
  /** M11 cover tiles derived from tileset raised height — walls and props only. */
  cover: { x: number; y: number; kind: "wall" | "raised" }[];
  partySpawns: { x: number; y: number }[];
  enemySpawns?: { x: number; y: number }[];
  background?: string;
}

function styleFor(
  def: BattleMapDefinition,
  tileset: BattleTileset,
  char: string,
): BattleTileStyle | null {
  const kind = def.legend[char];
  if (!kind) return null;
  return tileset.kinds[kind] ?? null;
}

export function validateBattleMap(
  def: BattleMapDefinition,
  tileset: BattleTileset,
): ValidationResult {
  const errors: string[] = [];

  if (def.tilesetId !== tileset.id) {
    errors.push(`battle map ${def.id} expects tileset ${def.tilesetId}, got ${tileset.id}`);
  }
  if (!tileset.kinds["floor"]) {
    errors.push(`tileset ${tileset.id} missing required "floor" kind`);
  }
  if (def.width < MIN_BATTLE_DIM || def.width > MAX_BATTLE_DIM) {
    errors.push(`battle map ${def.id} width out of bounds: ${def.width}`);
  }
  if (def.height < MIN_BATTLE_DIM || def.height > MAX_BATTLE_DIM) {
    errors.push(`battle map ${def.id} height out of bounds: ${def.height}`);
  }
  if (def.rows.length !== def.height) {
    errors.push(`battle map ${def.id} row count ${def.rows.length} != height ${def.height}`);
  }

  for (let y = 0; y < def.rows.length; y++) {
    const row = def.rows[y]!;
    if (row.length !== def.width) {
      errors.push(`battle map ${def.id} row ${y} length ${row.length} != width ${def.width}`);
      continue;
    }
    for (let x = 0; x < row.length; x++) {
      const char = row[x]!;
      const kind = def.legend[char];
      if (!kind) {
        errors.push(`battle map ${def.id} row ${y} col ${x}: char "${char}" not in legend`);
      } else if (!tileset.kinds[kind]) {
        errors.push(`battle map ${def.id} legend "${char}" → kind "${kind}" not in tileset ${tileset.id}`);
      }
    }
  }

  const seenSpawns = new Set<string>();
  const checkSpawn = (label: string, s: { x: number; y: number }, index: number): void => {
    if (s.x < 0 || s.x >= def.width || s.y < 0 || s.y >= def.height) {
      errors.push(`battle map ${def.id} ${label} spawn ${index} out of bounds (${s.x}, ${s.y})`);
      return;
    }
    const key = `${s.x},${s.y}`;
    if (seenSpawns.has(key)) {
      errors.push(`battle map ${def.id} ${label} spawn ${index} overlaps another spawn at (${s.x}, ${s.y})`);
    }
    seenSpawns.add(key);
    const style = styleFor(def, tileset, def.rows[s.y]![s.x]!);
    if (style?.blocked) {
      errors.push(`battle map ${def.id} ${label} spawn ${index} sits on blocked tile (${s.x}, ${s.y})`);
    }
  };

  if (def.partySpawns.length < 4) {
    errors.push(`battle map ${def.id} needs at least 4 party spawns, got ${def.partySpawns.length}`);
  }
  def.partySpawns.forEach((s, i) => checkSpawn("party", s, i));
  def.enemySpawns?.forEach((s, i) => checkSpawn("enemy", s, i));

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

export function resolveBattleMap(
  def: BattleMapDefinition,
  tileset: BattleTileset,
): ResolvedBattleMap {
  const validation = validateBattleMap(def, tileset);
  if (!validation.ok) {
    throw new Error(`invalid battle map ${def.id}: ${validation.errors.join("; ")}`);
  }

  const tiles: ResolvedBattleTile[] = [];
  const blocked: { x: number; y: number }[] = [];
  const cover: { x: number; y: number; kind: "wall" | "raised" }[] = [];

  for (let y = 0; y < def.height; y++) {
    for (let x = 0; x < def.width; x++) {
      const char = def.rows[y]![x]!;
      const kind = def.legend[char]!;
      const style = tileset.kinds[kind]!;
      tiles.push({ x, y, kind, style });
      if (style.blocked) {
        blocked.push({ x, y });
      }
      const coverKind = coverKindFromTileStyle(style.blocked, style.raised);
      if (coverKind === "wall") {
        cover.push({ x, y, kind: "wall" });
      } else if (coverKind === "raised") {
        cover.push({ x, y, kind: "raised" });
      }
    }
  }

  return {
    id: def.id,
    width: def.width,
    height: def.height,
    tiles,
    blocked,
    cover,
    partySpawns: def.partySpawns.map((s) => ({ ...s })),
    enemySpawns: def.enemySpawns?.map((s) => ({ ...s })),
    background: tileset.background,
  };
}
