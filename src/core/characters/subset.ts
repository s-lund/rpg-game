/** Curated M7 rules tables — sourced from rules/srd/m7-subset.json (ORC SRD). */
import subsetJson from "../../../rules/srd/m7-subset.json";

export type ClassId = "fighter" | "rogue" | "wizard" | "cleric";
export type AbilityId = "str" | "dex" | "con" | "int" | "wis" | "cha";
export type SkillId = keyof typeof subsetJson.skillLabels;
export type ProficiencyRank = keyof typeof subsetJson.proficiencyBonus;
export type SpellId = keyof typeof subsetJson.spells;

export interface ClassRulesBase {
  label: string;
  keyAbilities: AbilityId[];
  hpPerLevel: number;
  armor: {
    label: string;
    acBonus: number;
    maxDexBonus: number;
    shieldBonus: number;
  };
  skillChoices: SkillId[];
  srdRef: string;
}

export interface MartialClassRules extends ClassRulesBase {
  attackProficiency: ProficiencyRank;
  weaponAttackAbility: AbilityId;
  defaultWeapon: {
    label: string;
    damage: { count: number; sides: number };
    damageAbility: AbilityId;
    damageType: string;
    maxRangeTiles: number;
  };
}

export interface FighterClassRules extends MartialClassRules {
  requiredSkillOptions: SkillId[];
  requiredSkillPick: number;
  additionalSkillBase: number;
}

export interface RogueClassRules extends MartialClassRules {
  mandatoryTrainedSkills: SkillId[];
  additionalSkillBase: number;
  sneakAttack: { count: number; sides: number };
}

export interface WizardClassRules extends ClassRulesBase {
  spellAttackProficiency: ProficiencyRank;
  spellcastingAbility: AbilityId;
  knownSpells: SpellId[];
  additionalSkillBase: number;
}

export interface ClericClassRules extends ClassRulesBase {
  spellcastingAbility: AbilityId;
  knownSpells: SpellId[];
  additionalSkillBase: number;
}

export const M7_SUBSET = subsetJson;
/** @deprecated Use M7_SUBSET — alias for transitional imports */
export const M2_SUBSET = M7_SUBSET;

export const ABILITY_IDS = M7_SUBSET.abilities as AbilityId[];

export function fighterRules(): FighterClassRules {
  return M7_SUBSET.classes.fighter as FighterClassRules;
}

export function rogueRules(): RogueClassRules {
  return M7_SUBSET.classes.rogue as RogueClassRules;
}

export function wizardRules(): WizardClassRules {
  return M7_SUBSET.classes.wizard as WizardClassRules;
}

export function clericRules(): ClericClassRules {
  return M7_SUBSET.classes.cleric as ClericClassRules;
}

export function spellDef(spellId: SpellId) {
  return M7_SUBSET.spells[spellId];
}

export function damageSpellDef(spellId: "ray_of_frost") {
  return M7_SUBSET.spells[spellId];
}

export function healSpellDef(spellId: "heal_ranged") {
  return M7_SUBSET.spells[spellId];
}
