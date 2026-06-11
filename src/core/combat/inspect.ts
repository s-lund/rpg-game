import type { EntityId } from "../../shared/ids";
import { damageSpellDef, healSpellDef } from "../characters/subset";
import type { SpellId } from "../characters/subset";
import { effectiveAc } from "./flanking";
import { canTargetAlly, canTargetEnemy } from "./range";
import { attackHits, damageBand, estimateHitPercent } from "./attack";
import type { GameState } from "../types";

export type InspectActionKind = "strike" | "cast_spell" | "cast_heal";

export interface TargetInspection {
  hp: number;
  maxHp: number;
  hitPercent: number | null;
  damageMin: number | null;
  damageMax: number | null;
  inRange: boolean;
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
      hitPercent: estimateHitPercent(attacker.attackBonus, ac),
      damageMin: band.min,
      damageMax: band.max,
    };
  }

  if (actionKind === "cast_spell" && spellId === "ray_of_frost") {
    const spell = damageSpellDef(spellId);
    const inRange = canTargetEnemy(state, attackerId, targetId, spell.rangeTiles);
    const ac = effectiveAc(state, targetId);
    const band = damageBand(spell.damage.count, spell.damage.sides, 0);
    return {
      ...base,
      inRange,
      hitPercent: estimateHitPercent(attacker.spellAttackBonus, ac),
      damageMin: band.min,
      damageMax: band.max,
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
