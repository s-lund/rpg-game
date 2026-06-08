/** Curated M2 rules tables — sourced from rules/srd/m2-subset.json (ORC SRD). */
import subsetJson from "../../../rules/srd/m2-subset.json";

export type ClassId = "fighter" | "rogue";
export type AbilityId = "str" | "dex" | "con" | "int" | "wis" | "cha";
export type SkillId = keyof typeof subsetJson.skillLabels;
export type ProficiencyRank = keyof typeof subsetJson.proficiencyBonus;

export interface ClassRulesBase {
  label: string;
  keyAbilities: AbilityId[];
  hpPerLevel: number;
  attackProficiency: ProficiencyRank;
  weaponAttackAbility: AbilityId;
  defaultWeapon: {
    label: string;
    damage: { count: number; sides: number };
    damageAbility: AbilityId;
  };
  armor: {
    label: string;
    acBonus: number;
    maxDexBonus: number;
    shieldBonus: number;
  };
  skillChoices: SkillId[];
  srdRef: string;
}

export interface FighterClassRules extends ClassRulesBase {
  requiredSkillOptions: SkillId[];
  requiredSkillPick: number;
  additionalSkillBase: number;
}

export interface RogueClassRules extends ClassRulesBase {
  mandatoryTrainedSkills: SkillId[];
  additionalSkillBase: number;
  sneakAttack: { count: number; sides: number };
}

export const M2_SUBSET = subsetJson;

export const ABILITY_IDS = M2_SUBSET.abilities as AbilityId[];

export function fighterRules(): FighterClassRules {
  return M2_SUBSET.classes.fighter as FighterClassRules;
}

export function rogueRules(): RogueClassRules {
  return M2_SUBSET.classes.rogue as RogueClassRules;
}
