/** Curated M12 rules tables — sourced from rules/srd/m12-subset.json (ORC SRD). */
import subsetJson from "../../../rules/srd/m12-subset.json";

export type ClassId = "fighter" | "rogue" | "wizard" | "cleric";
export type AbilityId = "str" | "dex" | "con" | "int" | "wis" | "cha";
export type SkillId = keyof typeof subsetJson.skillLabels;
export type ProficiencyRank = keyof typeof subsetJson.proficiencyBonus;
export type SpellId = keyof typeof subsetJson.spells;

export interface ClassRulesBase {
  label: string;
  keyAbilities: AbilityId[];
  hpPerLevel: number;
  saves: Record<"fortitude" | "reflex" | "will", ProficiencyRank>;
  perception: ProficiencyRank;
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

export interface PreparedSlotRules {
  rank1: number;
  preparedSpellId: SpellId;
}

export interface WizardClassRules extends ClassRulesBase {
  spellAttackProficiency: ProficiencyRank;
  spellDcProficiency: ProficiencyRank;
  spellcastingAbility: AbilityId;
  knownSpells: SpellId[];
  spellSlots: PreparedSlotRules;
  additionalSkillBase: number;
}

export interface ClericClassRules extends ClassRulesBase {
  spellDcProficiency: ProficiencyRank;
  spellcastingAbility: AbilityId;
  knownSpells: SpellId[];
  spellSlots: PreparedSlotRules;
  divineFont: { slots: number; spellId: SpellId };
  additionalSkillBase: number;
}

export const M12_SUBSET = subsetJson;
/** @deprecated Use M12_SUBSET — alias for transitional imports */
export const M11_SUBSET = M12_SUBSET;
/** @deprecated Use M12_SUBSET — alias for transitional imports */
export const M10_SUBSET = M12_SUBSET;
/** @deprecated Use M12_SUBSET — alias for transitional imports */
export const M9_SUBSET = M12_SUBSET;
/** @deprecated Use M12_SUBSET — alias for transitional imports */
export const M7_SUBSET = M12_SUBSET;
/** @deprecated Use M12_SUBSET — alias for transitional imports */
export const M2_SUBSET = M12_SUBSET;

export const ABILITY_IDS = M11_SUBSET.abilities as AbilityId[];

export const SAVE_ABILITIES = M11_SUBSET.saveAbilities as Record<
  "fortitude" | "reflex" | "will",
  AbilityId
>;

export function fighterRules(): FighterClassRules {
  return M11_SUBSET.classes.fighter as FighterClassRules;
}

export function rogueRules(): RogueClassRules {
  return M11_SUBSET.classes.rogue as RogueClassRules;
}

export function wizardRules(): WizardClassRules {
  return M11_SUBSET.classes.wizard as WizardClassRules;
}

export function clericRules(): ClericClassRules {
  return M11_SUBSET.classes.cleric as ClericClassRules;
}

export function spellDef<K extends SpellId>(spellId: K): (typeof M11_SUBSET.spells)[K] {
  return M11_SUBSET.spells[spellId];
}

export function damageSpellDef(spellId: "ray_of_frost") {
  return M11_SUBSET.spells[spellId];
}

export function healSpellDef(spellId: "heal_ranged") {
  return M11_SUBSET.spells[spellId];
}

export function coneSpellDef(spellId: "breathe_fire") {
  return M11_SUBSET.spells[spellId];
}

export function spellRank(spellId: SpellId): number {
  return M12_SUBSET.spells[spellId].rank;
}

/** Vendored trait line of a spell (rules/srd/m12-subset.json spells.*.traits). */
export function spellTraits(spellId: SpellId): readonly string[] {
  return M12_SUBSET.spells[spellId].traits;
}

/** Manipulate-trait check — the Reactive Strike trigger and disruption gate (M12). */
export function spellHasTrait(spellId: SpellId, trait: string): boolean {
  return spellTraits(spellId).includes(trait);
}
