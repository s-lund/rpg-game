import type { EntityId } from "../../shared/ids";
import {
  fighterRules,
  M2_SUBSET,
  rogueRules,
  type AbilityId,
  type ClassId,
  type SkillId,
} from "./subset";
import type { CharacterDraft, PartyDraft, ValidationResult } from "./types";
import { abilityModifier, abilityPointsSpent, ABILITY_POINT_BUY } from "./abilities";
import { deriveEntityBlueprint } from "./derive";

const NAME_MIN = 1;
const NAME_MAX = 32;

function fail(errors: string[]): ValidationResult {
  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

function validateName(name: string, label: string): string[] {
  const trimmed = name.trim();
  const errors: string[] = [];
  if (trimmed.length < NAME_MIN) {
    errors.push(`${label}: name is required`);
  }
  if (trimmed.length > NAME_MAX) {
    errors.push(`${label}: name must be at most ${NAME_MAX} characters`);
  }
  return errors;
}

function validateAbilities(abilities: Record<AbilityId, number>, label: string): string[] {
  const errors: string[] = [];
  const { minScore, maxScore, pointPool, baseScore } = ABILITY_POINT_BUY;

  for (const id of M2_SUBSET.abilities) {
    const score = abilities[id as AbilityId];
    if (score < minScore || score > maxScore) {
      errors.push(`${label}: ${id} must be between ${minScore} and ${maxScore}`);
    }
  }

  const spent = abilityPointsSpent(abilities);
  if (spent > pointPool) {
    errors.push(
      `${label}: spent ${spent}/${pointPool} ability points (base ${baseScore}, lower scores refund points)`,
    );
  }

  return errors;
}

function expectedSkillCount(classId: ClassId, intScore: number): number {
  const intMod = abilityModifier(intScore);
  if (classId === "fighter") {
    const fighter = fighterRules();
    return fighter.requiredSkillPick + fighter.additionalSkillBase + intMod;
  }
  const rogue = rogueRules();
  return rogue.mandatoryTrainedSkills.length + rogue.additionalSkillBase + intMod;
}

function validateSkills(draft: CharacterDraft): string[] {
  const errors: string[] = [];
  const label = draft.classId;
  const classRules = M2_SUBSET.classes[draft.classId];
  const skills = draft.trainedSkills;
  const unique = new Set(skills);

  if (unique.size !== skills.length) {
    errors.push(`${label}: trained skills must not contain duplicates`);
  }

  const expected = expectedSkillCount(draft.classId, draft.abilities.int);
  if (skills.length !== expected) {
    errors.push(`${label}: must have exactly ${expected} trained skills (got ${skills.length})`);
  }

  for (const skill of skills) {
    if (!classRules.skillChoices.includes(skill)) {
      errors.push(`${label}: skill "${skill}" is not a valid choice for ${classRules.label}`);
    }
  }

  if (draft.classId === "fighter") {
    const fighter = fighterRules();
    const picked = skills.filter((s) => fighter.requiredSkillOptions.includes(s));
    if (picked.length !== fighter.requiredSkillPick) {
      errors.push(
        `${label}: pick exactly ${fighter.requiredSkillPick} of [${fighter.requiredSkillOptions.join(", ")}]`,
      );
    }
  }

  if (draft.classId === "rogue") {
    const rogue = rogueRules();
    for (const mandatory of rogue.mandatoryTrainedSkills) {
      if (!skills.includes(mandatory)) {
        errors.push(`${label}: must be trained in ${mandatory}`);
      }
    }
  }

  return errors;
}

function validateCurrentHp(draft: CharacterDraft): string[] {
  const errors: string[] = [];
  if (typeof draft.currentHp !== "number" || !Number.isFinite(draft.currentHp)) {
    errors.push(`${draft.classId}: currentHp is required`);
    return errors;
  }
  const slot = M2_SUBSET.partySlots.find((s) => s.classId === draft.classId);
  const spawn = slot?.spawn ?? { x: 0, y: 0 };
  const maxHp = deriveEntityBlueprint(draft, spawn).maxHp;
  if (draft.currentHp < 0 || draft.currentHp > maxHp) {
    errors.push(`${draft.classId}: currentHp must be between 0 and ${maxHp}`);
  }
  return errors;
}

export function validateCharacter(draft: CharacterDraft): ValidationResult {
  const errors: string[] = [
    ...validateName(draft.name, draft.classId),
    ...validateAbilities(draft.abilities, draft.classId),
    ...validateSkills(draft),
    ...validateCurrentHp(draft),
  ];
  return fail(errors);
}

export function validateParty(party: PartyDraft): ValidationResult {
  const errors: string[] = [];

  if (party.members.length !== 2) {
    errors.push("party must have exactly 2 members");
    return fail(errors);
  }

  const classes = party.members.map((m) => m.classId);
  if (!classes.includes("fighter") || !classes.includes("rogue")) {
    errors.push("party must include one Fighter and one Rogue");
  }

  const ids = new Set(party.members.map((m) => m.id));
  if (ids.size !== party.members.length) {
    errors.push("party member ids must be unique");
  }

  for (const member of party.members) {
    const result = validateCharacter(member);
    if (!result.ok) {
      errors.push(...result.errors);
    }
  }

  return fail(errors);
}

export function createDefaultParty(): PartyDraft {
  const members = M2_SUBSET.partySlots.map((slot) => {
    const classId = slot.classId as ClassId;
    const defaults = M2_SUBSET.defaults[classId];
    const draft = {
      id: slot.defaultEntityId as EntityId,
      name: defaults.name,
      classId,
      abilities: { ...defaults.abilities },
      trainedSkills: [...(defaults.trainedSkills as SkillId[])],
      currentHp: 0,
    } satisfies CharacterDraft;
    const maxHp = deriveEntityBlueprint(draft, slot.spawn).maxHp;
    return { ...draft, currentHp: maxHp };
  });

  return { members: members as [CharacterDraft, CharacterDraft] };
}
