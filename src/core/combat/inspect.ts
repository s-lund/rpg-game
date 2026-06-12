import type { EntityId } from "../../shared/ids";
import { coneSpellDef, damageSpellDef, healSpellDef } from "../characters/subset";
import type { SpellId } from "../characters/subset";
import { effectiveAc } from "./flanking";
import { canTargetAlly, canTargetEnemy } from "./range";
import { attackHits, damageBand, estimateHitPercent } from "./attack";
import { adjustedAmount } from "./damage";
import { estimateSavePercent } from "./save";
import { isTileInCone } from "./cone";
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
  /** Chance the target saves (success or better) against a save-based spell. */
  savePercent?: number | null;
  saveKind?: SaveKind;
  /** Weakness/resistance applied to the shown damage band. */
  weaknessApplied?: { damageType: DamageType; value: number };
  resistanceApplied?: { damageType: DamageType; value: number };
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
  };

  if (actionKind === "strike") {
    if (attacker.strikeRange < 1) return null;
    const inRange = canTargetEnemy(state, attackerId, targetId, attacker.strikeRange);
    const ac = effectiveAc(state, targetId);
    const band = damageBand(attacker.damage.count, attacker.damage.sides, attacker.damage.modifier);
    return {
      ...base,
      inRange,
      hitPercent: estimateHitPercent(attacker.attackBonus - attackRollPenalty(attacker), ac),
      damageMin: adjustedAmount(target, band.min, attacker.damageType),
      damageMax: adjustedAmount(target, band.max, attacker.damageType),
      ...appliedAdjustments(target, attacker.damageType),
    };
  }

  if (actionKind === "cast_spell" && spellId === "ray_of_frost") {
    const spell = damageSpellDef(spellId);
    const damageType = spell.damageType as DamageType;
    const inRange = canTargetEnemy(state, attackerId, targetId, spell.rangeTiles);
    const ac = effectiveAc(state, targetId);
    const band = damageBand(spell.damage.count, spell.damage.sides, 0);
    return {
      ...base,
      inRange,
      hitPercent: estimateHitPercent(attacker.spellAttackBonus - attackRollPenalty(attacker), ac),
      damageMin: adjustedAmount(target, band.min, damageType),
      damageMax: adjustedAmount(target, band.max, damageType),
      ...appliedAdjustments(target, damageType),
    };
  }

  if (actionKind === "cast_cone" && spellId === "breathe_fire") {
    const spell = coneSpellDef(spellId);
    const damageType = spell.damageType as DamageType;
    const saveKind = spell.save as SaveKind;
    const inRange = isTileInCone(
      attacker.x,
      attacker.y,
      target.x,
      target.y,
      spell.coneLengthTiles,
      target.x,
      target.y,
    );
    // Band shows the failure (full damage) case; a save halves, a crit success negates.
    const band = damageBand(spell.damage.count, spell.damage.sides, 0);
    return {
      ...base,
      inRange,
      hitPercent: null,
      savePercent: estimateSavePercent(
        target.saves[saveKind] - savePenalty(target),
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
    const band = damageBand(spell.heal.count, spell.heal.sides, spell.heal.flatBonus);
    return {
      ...base,
      inRange,
      hitPercent: null,
      damageMin: band.min,
      damageMax: Math.min(band.max, target.maxHp - target.hp),
    };
  }

  return null;
}

export { attackHits, estimateHitPercent, damageBand };
