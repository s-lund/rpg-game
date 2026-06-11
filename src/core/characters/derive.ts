import type { EntityBlueprint } from "../types";
import { M2_DEMO_ENEMIES, M2_MAP_HEIGHT, M2_MAP_WIDTH } from "../scenarios/m1-demo";
import { abilityModifier, proficiencyBonus } from "./abilities";
import {
  M7_SUBSET,
  clericRules,
  fighterRules,
  rogueRules,
  wizardRules,
  type AbilityId,
  type ClassId,
  type ProficiencyRank,
} from "./subset";
import type { CharacterDraft, PartyDraft } from "./types";
import type { DamageType, InitialStateConfig } from "../types";

/** Map validated character draft → combat entity blueprint (rules/srd/classes-*.md). */
export function deriveEntityBlueprint(
  draft: CharacterDraft,
  spawn: { x: number; y: number },
): EntityBlueprint {
  const level = M7_SUBSET.level;
  const conMod = abilityModifier(draft.abilities.con);
  const dexMod = abilityModifier(draft.abilities.dex);

  if (draft.classId === "wizard") {
    const rules = wizardRules();
    const spellAbility = rules.spellcastingAbility;
    const spellMod = abilityModifier(draft.abilities[spellAbility]);
    const spellAttackBonus =
      proficiencyBonus(
        rules.spellAttackProficiency as ProficiencyRank,
        level,
        M7_SUBSET.proficiencyBonus,
      ) + spellMod;
    const dexToArmor = Math.min(dexMod, rules.armor.maxDexBonus);
    const ac = 10 + dexToArmor + rules.armor.acBonus + rules.armor.shieldBonus;
    const maxHp = M7_SUBSET.fixedAncestry.hpBonus + rules.hpPerLevel + conMod;

    return {
      id: draft.id,
      label: draft.name.trim(),
      classId: draft.classId,
      x: spawn.x,
      y: spawn.y,
      maxHp,
      currentHp: draft.currentHp,
      ac,
      attackBonus: 0,
      spellAttackBonus,
      damage: { count: 0, sides: 4, modifier: 0 },
      damageType: "cold",
      strikeRange: 0,
      knownSpells: [...rules.knownSpells],
    };
  }

  if (draft.classId === "cleric") {
    const rules = clericRules();
    const dexToArmor = Math.min(dexMod, rules.armor.maxDexBonus);
    const ac = 10 + dexToArmor + rules.armor.acBonus + rules.armor.shieldBonus;
    const maxHp = M7_SUBSET.fixedAncestry.hpBonus + rules.hpPerLevel + conMod;

    return {
      id: draft.id,
      label: draft.name.trim(),
      classId: draft.classId,
      x: spawn.x,
      y: spawn.y,
      maxHp,
      currentHp: draft.currentHp,
      ac,
      attackBonus: 0,
      spellAttackBonus: 0,
      damage: { count: 0, sides: 8, modifier: 0 },
      damageType: "positive",
      strikeRange: 0,
      knownSpells: [...rules.knownSpells],
    };
  }

  const classRules = draft.classId === "fighter" ? fighterRules() : rogueRules();
  const attackAbility = classRules.weaponAttackAbility as AbilityId;
  const damageAbility = classRules.defaultWeapon.damageAbility as AbilityId;
  const attackMod = abilityModifier(draft.abilities[attackAbility]);
  const damageMod = abilityModifier(draft.abilities[damageAbility]);

  const attackBonus =
    proficiencyBonus(
      classRules.attackProficiency as ProficiencyRank,
      level,
      M7_SUBSET.proficiencyBonus,
    ) + attackMod;

  const dexToArmor = Math.min(dexMod, classRules.armor.maxDexBonus);
  const ac = 10 + dexToArmor + classRules.armor.acBonus + classRules.armor.shieldBonus;
  const maxHp = M7_SUBSET.fixedAncestry.hpBonus + classRules.hpPerLevel + conMod;

  return {
    id: draft.id,
    label: draft.name.trim(),
    classId: draft.classId,
    x: spawn.x,
    y: spawn.y,
    maxHp,
    currentHp: draft.currentHp,
    ac,
    attackBonus,
    spellAttackBonus: 0,
    damage: {
      count: classRules.defaultWeapon.damage.count,
      sides: classRules.defaultWeapon.damage.sides,
      modifier: damageMod,
    },
    damageType: classRules.defaultWeapon.damageType as DamageType,
    strikeRange: classRules.defaultWeapon.maxRangeTiles,
    knownSpells: [],
  };
}

export function derivePartyBlueprints(
  party: PartyDraft,
  spawns?: { x: number; y: number }[],
): EntityBlueprint[] {
  return M7_SUBSET.partySlots.map((slot, index) => {
    const member = party.members.find((m) => m.classId === slot.classId);
    if (!member) {
      throw new Error(`party missing ${slot.classId}`);
    }
    return deriveEntityBlueprint(member, spawns?.[index] ?? slot.spawn);
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
  return M7_SUBSET.partySlots.map((s) => s.classId as ClassId);
}
