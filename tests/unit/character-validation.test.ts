import { describe, expect, it } from "vitest";
import { createDefaultParty, validateCharacter, validateParty } from "../../src/core/characters/validate";
import type { CharacterDraft } from "../../src/core/characters/types";

function memberDraft(classId: CharacterDraft["classId"], overrides: Partial<CharacterDraft> = {}): CharacterDraft {
  const base = createDefaultParty().members.find((m) => m.classId === classId)!;
  return { ...base, ...overrides };
}

describe("character validation", () => {
  it("accepts default party drafts", () => {
    for (const member of createDefaultParty().members) {
      expect(validateCharacter(member)).toEqual({ ok: true });
    }
    expect(validateParty(createDefaultParty())).toEqual({ ok: true });
  });

  it("rejects empty names", () => {
    const result = validateCharacter(memberDraft("fighter", { name: "   " }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("name is required"))).toBe(true);
    }
  });

  it("rejects abilities that exceed the point pool", () => {
    const result = validateCharacter(
      memberDraft("fighter", {
        abilities: { str: 18, dex: 18, con: 18, int: 12, wis: 10, cha: 8 },
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("ability points"))).toBe(true);
    }
  });

  it("requires fighter to pick athletics or acrobatics", () => {
    const result = validateCharacter(
      memberDraft("fighter", {
        trainedSkills: ["intimidation", "medicine", "survival", "crafting"],
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("acrobatics"))).toBe(true);
    }
  });

  it("requires rogue to include stealth", () => {
    const result = validateCharacter(
      memberDraft("rogue", {
        trainedSkills: ["thievery", "deception", "acrobatics", "diplomacy", "intimidation", "athletics", "survival", "medicine"],
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("stealth"))).toBe(true);
    }
  });

  it("requires all four classes in the party", () => {
    const party = createDefaultParty();
    party.members[3] = { ...party.members[0], id: party.members[3].id, name: "Duplicate" };
    const result = validateParty(party);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toMatch(/cleric/);
    }
  });
});
