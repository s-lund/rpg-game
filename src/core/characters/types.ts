import type { EntityId } from "../../shared/ids";
import type { AbilityId, ClassId, SkillId } from "./subset";

export interface CharacterDraft {
  id: EntityId;
  name: string;
  classId: ClassId;
  abilities: Record<AbilityId, number>;
  trainedSkills: SkillId[];
}

export type PartyDraft = {
  members: [CharacterDraft, CharacterDraft];
};

export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] };
