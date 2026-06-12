import type { EntityBlueprint } from "../types";
import { M2_DEMO_ENEMIES, M2_MAP_HEIGHT, M2_MAP_WIDTH } from "../scenarios/m1-demo";
import { abilityModifier, proficiencyBonus } from "./abilities";
import {
  M9_SUBSET,
  SAVE_ABILITIES,
  clericRules,
  fighterRules,
  rogueRules,
  wizardRules,
  type AbilityId,
  type ClassId,
  type ClassRulesBase,
  type ProficiencyRank,
  type SpellId,
} from "./subset";
import type { CharacterDraft, PartyDraft } from "./types";
import type { DamageType, InitialStateConfig, SaveKind, SpellSlot } from "../types";

/**
 * HOUSE RULE (M10, flagged PROCEDURAL): flat bonus HP so universal AoO +
 * enemy conditions are playtestable at level 1. Superseded by M15 leveling.
 */
function heroBonusHp(): number {
  return M9_SUBSET.houseRules.playtestHpCushion.heroBonusHp;
}

/** Perception-based initiative (rules/srd/initiative.md). */
function deriveInitiativeModifier(
  rules: ClassRulesBase,
  abilities: CharacterDraft["abilities"],
): number {
  return (
    proficiencyBonus(rules.perception as ProficiencyRank, M9_SUBSET.level, M9_SUBSET.proficiencyBonus) +
    abilityModifier(abilities.wis)
  );
}

function deriveSaves(
  rules: ClassRulesBase,
  abilities: CharacterDraft["abilities"],
): Record<SaveKind, number> {
  const level = M9_SUBSET.level;
  const saves = {} as Record<SaveKind, number>;
  for (const kind of ["fortitude", "reflex", "will"] as const) {
    const rank = rules.saves[kind] as ProficiencyRank;
    const ability = SAVE_ABILITIES[kind];
    saves[kind] =
      proficiencyBonus(rank, level, M9_SUBSET.proficiencyBonus) +
      abilityModifier(abilities[ability]);
  }
  return saves;
}

function makeSlots(
  classId: ClassId,
  count: number,
  spellId: SpellId,
  fontCount = 0,
  fontSpellId?: SpellId,
): SpellSlot[] {
  const slots: SpellSlot[] = [];
  for (let i = 1; i <= count; i++) {
    slots.push({ id: `${classId}_slot_${i}`, rank: 1, preparedSpellId: spellId, expended: false });
  }
  for (let i = 1; i <= fontCount; i++) {
    slots.push({
      id: `${classId}_font_${i}`,
      rank: 1,
      preparedSpellId: fontSpellId ?? spellId,
      expended: false,
      fontOnly: true,
    });
  }
  return slots;
}

/** Fresh daily preparation per class rules (rules/srd/spell-slots.md). */
export function defaultPreparedSlots(classId: ClassId): SpellSlot[] | undefined {
  if (classId === "wizard") {
    const rules = wizardRules();
    return makeSlots("wizard", rules.spellSlots.rank1, rules.spellSlots.preparedSpellId);
  }
  if (classId === "cleric") {
    const rules = clericRules();
    return makeSlots(
      "cleric",
      rules.spellSlots.rank1,
      rules.spellSlots.preparedSpellId,
      rules.divineFont.slots,
      rules.divineFont.spellId,
    );
  }
  return undefined;
}

/** Map validated character draft → combat entity blueprint (rules/srd/classes-*.md). */
export function deriveEntityBlueprint(
  draft: CharacterDraft,
  spawn: { x: number; y: number },
): EntityBlueprint {
  const level = M9_SUBSET.level;
  const conMod = abilityModifier(draft.abilities.con);
  const dexMod = abilityModifier(draft.abilities.dex);
  // Carried slot state (expended across fights) wins over a fresh preparation.
  const spellSlots = draft.spellSlots ?? defaultPreparedSlots(draft.classId);

  if (draft.classId === "wizard") {
    const rules = wizardRules();
    const spellAbility = rules.spellcastingAbility;
    const spellMod = abilityModifier(draft.abilities[spellAbility]);
    const spellAttackBonus =
      proficiencyBonus(
        rules.spellAttackProficiency as ProficiencyRank,
        level,
        M9_SUBSET.proficiencyBonus,
      ) + spellMod;
    const spellDc =
      10 +
      proficiencyBonus(
        rules.spellDcProficiency as ProficiencyRank,
        level,
        M9_SUBSET.proficiencyBonus,
      ) +
      spellMod;
    const dexToArmor = Math.min(dexMod, rules.armor.maxDexBonus);
    const ac = 10 + dexToArmor + rules.armor.acBonus + rules.armor.shieldBonus;
    const maxHp = M9_SUBSET.fixedAncestry.hpBonus + rules.hpPerLevel + conMod + heroBonusHp();

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
      spellDc,
      saves: deriveSaves(rules, draft.abilities),
      initiativeModifier: deriveInitiativeModifier(rules, draft.abilities),
      damage: { count: 0, sides: 4, modifier: 0 },
      damageType: "cold",
      strikeRange: 0,
      knownSpells: [...rules.knownSpells],
      spellSlots,
    };
  }

  if (draft.classId === "cleric") {
    const rules = clericRules();
    const spellMod = abilityModifier(draft.abilities[rules.spellcastingAbility]);
    const spellDc =
      10 +
      proficiencyBonus(
        rules.spellDcProficiency as ProficiencyRank,
        level,
        M9_SUBSET.proficiencyBonus,
      ) +
      spellMod;
    const dexToArmor = Math.min(dexMod, rules.armor.maxDexBonus);
    const ac = 10 + dexToArmor + rules.armor.acBonus + rules.armor.shieldBonus;
    const maxHp = M9_SUBSET.fixedAncestry.hpBonus + rules.hpPerLevel + conMod + heroBonusHp();

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
      spellDc,
      saves: deriveSaves(rules, draft.abilities),
      initiativeModifier: deriveInitiativeModifier(rules, draft.abilities),
      damage: { count: 0, sides: 8, modifier: 0 },
      damageType: "positive",
      strikeRange: 0,
      knownSpells: [...rules.knownSpells],
      spellSlots,
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
      M9_SUBSET.proficiencyBonus,
    ) + attackMod;

  const dexToArmor = Math.min(dexMod, classRules.armor.maxDexBonus);
  const ac = 10 + dexToArmor + classRules.armor.acBonus + classRules.armor.shieldBonus;
  const maxHp = M9_SUBSET.fixedAncestry.hpBonus + classRules.hpPerLevel + conMod + heroBonusHp();

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
    saves: deriveSaves(classRules, draft.abilities),
    initiativeModifier: deriveInitiativeModifier(classRules, draft.abilities),
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
  return M9_SUBSET.partySlots.map((slot, index) => {
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
  return M9_SUBSET.partySlots.map((s) => s.classId as ClassId);
}
