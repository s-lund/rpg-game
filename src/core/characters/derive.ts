import type { EntityBlueprint } from "../types";
import { M2_DEMO_ENEMIES, M2_MAP_HEIGHT, M2_MAP_WIDTH } from "../scenarios/m1-demo";
import { abilityModifier, proficiencyBonus } from "./abilities";
import { M2_SUBSET, type AbilityId, type ClassId, type ProficiencyRank } from "./subset";
import type { CharacterDraft, PartyDraft } from "./types";
import type { InitialStateConfig } from "../types";

/** Map validated character draft → combat entity blueprint (rules/srd/classes-*.md). */
export function deriveEntityBlueprint(
  draft: CharacterDraft,
  spawn: { x: number; y: number },
): EntityBlueprint {
  const classRules = M2_SUBSET.classes[draft.classId];
  const level = M2_SUBSET.level;
  const attackAbility = classRules.weaponAttackAbility as AbilityId;
  const damageAbility = classRules.defaultWeapon.damageAbility as AbilityId;
  const attackMod = abilityModifier(draft.abilities[attackAbility]);
  const damageMod = abilityModifier(draft.abilities[damageAbility]);
  const conMod = abilityModifier(draft.abilities.con);
  const dexMod = abilityModifier(draft.abilities.dex);

  const attackBonus =
    proficiencyBonus(
      classRules.attackProficiency as ProficiencyRank,
      level,
      M2_SUBSET.proficiencyBonus,
    ) + attackMod;

  const dexToArmor = Math.min(dexMod, classRules.armor.maxDexBonus);
  const ac =
    10 + dexToArmor + classRules.armor.acBonus + classRules.armor.shieldBonus;

  const maxHp =
    M2_SUBSET.fixedAncestry.hpBonus + classRules.hpPerLevel + conMod;

  return {
    id: draft.id,
    label: draft.name.trim(),
    classId: draft.classId,
    x: spawn.x,
    y: spawn.y,
    maxHp,
    ac,
    attackBonus,
    damage: {
      count: classRules.defaultWeapon.damage.count,
      sides: classRules.defaultWeapon.damage.sides,
      modifier: damageMod,
    },
  };
}

export function derivePartyBlueprints(party: PartyDraft): EntityBlueprint[] {
  return M2_SUBSET.partySlots.map((slot) => {
    const member = party.members.find((m) => m.classId === slot.classId);
    if (!member) {
      throw new Error(`party missing ${slot.classId}`);
    }
    return deriveEntityBlueprint(member, slot.spawn);
  });
}

export function buildEncounterConfig(party: PartyDraft): InitialStateConfig {
  return {
    width: M2_MAP_WIDTH,
    height: M2_MAP_HEIGHT,
    party: derivePartyBlueprints(party),
    enemies: M2_DEMO_ENEMIES.map((e) => ({ ...e })),
  };
}

export function slotClassIds(): ClassId[] {
  return M2_SUBSET.partySlots.map((s) => s.classId as ClassId);
}
