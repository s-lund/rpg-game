import type { EntityId } from "../../shared/ids";
import { coneSpellDef, damageSpellDef, healSpellDef } from "../characters/subset";
import type { SpellId } from "../characters/subset";
import { effectiveAc } from "./flanking";
import { canTargetAlly, canTargetEnemy } from "./range";
import { attackHits, damageBand, estimateHitPercent } from "./attack";
import { adjustedAmount } from "./damage";
import { estimateSavePercent } from "./save";
import {
  coneTilesWithLineOfEffect,
  coverReflexVsAreaBonus,
  evaluateCover,
  hasLineOfEffect,
  type CoverSource,
  type CoverTier,
} from "./los";
import { attackRollPenalty, dcPenalty, savePenalty } from "./conditions";
import type { DamageType, Entity, GameState, SaveKind } from "../types";

export type InspectActionKind = "strike" | "cast_spell" | "cast_heal" | "cast_cone";

export interface TargetInspection {
  hp: number;
  maxHp: number;
  hitPercent: number | null;
  damageMin: number | null;
  damageMax: number | null;
  inRange: boolean;
  /** False when a wall blocks line of effect (cannot target). */
  lineOfEffect: boolean;
  coverTier?: CoverTier;
  coverSource?: CoverSource;
  coverAcBonus?: number;
  /** Human-readable cover line for the hover inspector. */
  coverLabel?: string;
  /** Base AC before cover (attack modes). */
  baseAc?: number;
  /** AC including cover bonus (attack modes). */
  effectiveAc?: number;
  /** Reflex cover vs area effects (cone). */
  coverReflexBonus?: number;
  /** Chance the target saves (success or better) against a save-based spell. */
  savePercent?: number | null;
  saveKind?: SaveKind;
  /** Weakness/resistance applied to the shown damage band. */
  weaknessApplied?: { damageType: DamageType; value: number };
  resistanceApplied?: { damageType: DamageType; value: number };
}

function standingTiles(state: GameState): { x: number; y: number }[] {
  return Object.values(state.entities)
    .filter((e) => !e.downed)
    .map((e) => ({ x: e.x, y: e.y }));
}

function coverLabel(source: CoverSource, acBonus: number): string | undefined {
  if (source === "blocked") return "No line of effect — cannot target";
  if (source === "half-wall-partial") return `Half cover (wall corner): +${acBonus} AC`;
  if (source === "half-prop") return `Half cover (prop): +${acBonus} AC`;
  if (source === "lesser-creature") return `Lesser cover (ally in the line): +${acBonus} AC`;
  return undefined;
}

function appliedAdjustments(
  target: Entity,
  damageType: DamageType,
): Pick<TargetInspection, "weaknessApplied" | "resistanceApplied"> {
  const weakness = target.weaknesses?.[damageType] ?? 0;
  const resistance = target.resistances?.[damageType] ?? 0;
  return {
    ...(weakness > 0 ? { weaknessApplied: { damageType, value: weakness } } : {}),
    ...(resistance > 0 ? { resistanceApplied: { damageType, value: resistance } } : {}),
  };
}

function coverFields(
  state: GameState,
  attacker: Entity,
  target: Entity,
): Pick<
  TargetInspection,
  "lineOfEffect" | "coverTier" | "coverSource" | "coverAcBonus" | "coverLabel" | "baseAc" | "effectiveAc"
> {
  const cover = evaluateCover(
    state.map,
    { x: attacker.x, y: attacker.y },
    { x: target.x, y: target.y },
    standingTiles(state),
  );
  const baseAc = effectiveAc(state, target.id);
  return {
    lineOfEffect: cover.lineOfEffect,
    coverTier: cover.tier,
    coverSource: cover.source,
    ...(cover.acBonus > 0 ? { coverAcBonus: cover.acBonus } : {}),
    coverLabel: coverLabel(cover.source, cover.acBonus),
    baseAc,
    effectiveAc: baseAc + cover.acBonus,
  };
}

export function inspectTarget(
  state: GameState,
  attackerId: EntityId,
  targetId: EntityId,
  actionKind: InspectActionKind,
  spellId?: SpellId,
): TargetInspection | null {
  const attacker = state.entities[attackerId];
  const target = state.entities[targetId];
  if (!attacker || !target || attacker.downed) {
    return null;
  }
  if (target.downed && actionKind !== "cast_heal") {
    return null;
  }

  const base = {
    hp: target.hp,
    maxHp: target.maxHp,
    hitPercent: null as number | null,
    damageMin: null as number | null,
    damageMax: null as number | null,
    inRange: false,
    lineOfEffect: true,
  };

  if (actionKind === "strike") {
    if (attacker.strikeRange < 1) return null;
    const inRange = canTargetEnemy(state, attackerId, targetId, attacker.strikeRange);
    const coverInfo = coverFields(state, attacker, target);
    const band = damageBand(attacker.damage.count, attacker.damage.sides, attacker.damage.modifier);
    return {
      ...base,
      inRange,
      ...coverInfo,
      hitPercent: estimateHitPercent(
        attacker.attackBonus - attackRollPenalty(attacker),
        coverInfo.effectiveAc!,
      ),
      damageMin: adjustedAmount(target, band.min, attacker.damageType),
      damageMax: adjustedAmount(target, band.max, attacker.damageType),
      ...appliedAdjustments(target, attacker.damageType),
    };
  }

  if (actionKind === "cast_spell" && spellId === "ray_of_frost") {
    const spell = damageSpellDef(spellId);
    const damageType = spell.damageType as DamageType;
    const inRange = canTargetEnemy(state, attackerId, targetId, spell.rangeTiles);
    const coverInfo = coverFields(state, attacker, target);
    const band = damageBand(spell.damage.count, spell.damage.sides, 0);
    return {
      ...base,
      inRange,
      ...coverInfo,
      hitPercent: estimateHitPercent(
        attacker.spellAttackBonus - attackRollPenalty(attacker),
        coverInfo.effectiveAc!,
      ),
      damageMin: adjustedAmount(target, band.min, damageType),
      damageMax: adjustedAmount(target, band.max, damageType),
      ...appliedAdjustments(target, damageType),
    };
  }

  if (actionKind === "cast_cone" && spellId === "breathe_fire") {
    const spell = coneSpellDef(spellId);
    const damageType = spell.damageType as DamageType;
    const saveKind = spell.save as SaveKind;
    const clipped = coneTilesWithLineOfEffect(
      state.map,
      attacker.x,
      attacker.y,
      target.x,
      target.y,
      spell.coneLengthTiles,
    );
    const inRange = clipped.some((t) => t.x === target.x && t.y === target.y);
    const cover = evaluateCover(
      state.map,
      { x: attacker.x, y: attacker.y },
      { x: target.x, y: target.y },
      standingTiles(state),
    );
    const coverReflexBonus = coverReflexVsAreaBonus(cover.tier);
    const band = damageBand(spell.damage.count, spell.damage.sides, 0);
    return {
      ...base,
      inRange,
      lineOfEffect: inRange,
      coverTier: cover.tier,
      coverSource: cover.source,
      ...(coverReflexBonus > 0 ? { coverReflexBonus } : {}),
      coverLabel:
        coverReflexBonus > 0
          ? `Half cover (prop): +${coverReflexBonus} Reflex`
          : coverLabel(cover.source, cover.acBonus),
      hitPercent: null,
      savePercent: estimateSavePercent(
        target.saves[saveKind] - savePenalty(target) + coverReflexBonus,
        attacker.spellDc - dcPenalty(attacker),
      ),
      saveKind,
      damageMin: adjustedAmount(target, band.min, damageType),
      damageMax: adjustedAmount(target, band.max, damageType),
      ...appliedAdjustments(target, damageType),
    };
  }

  if (actionKind === "cast_heal" && spellId === "heal_ranged") {
    const spell = healSpellDef(spellId);
    const inRange = canTargetAlly(state, attackerId, targetId, spell.rangeTiles);
    const lineOfEffect = hasLineOfEffect(
      state.map,
      { x: attacker.x, y: attacker.y },
      { x: target.x, y: target.y },
    );
    const band = damageBand(spell.heal.count, spell.heal.sides, spell.heal.flatBonus);
    return {
      ...base,
      inRange,
      lineOfEffect,
      coverLabel: lineOfEffect ? undefined : "No line of effect — cannot target",
      hitPercent: null,
      damageMin: band.min,
      damageMax: Math.min(band.max, target.maxHp - target.hp),
    };
  }

  return null;
}

export { attackHits, estimateHitPercent, damageBand };
