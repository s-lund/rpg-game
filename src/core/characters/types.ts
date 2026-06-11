import type { EntityId } from "../../shared/ids";
import type { SpellSlot } from "../types";
import type { AbilityId, ClassId, SkillId } from "./subset";

export interface CharacterDraft {
  id: EntityId;
  name: string;
  classId: ClassId;
  abilities: Record<AbilityId, number>;
  trainedSkills: SkillId[];
  /** Runtime HP carried across world↔combat transitions. */
  currentHp: number;
  /** Prepared slot state carried across transitions (M9). Absent → fresh preparation. */
  spellSlots?: SpellSlot[];
}

export type PartyDraft = {
  members: [CharacterDraft, CharacterDraft, CharacterDraft, CharacterDraft];
};

export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] };
