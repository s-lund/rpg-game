import { describe, expect, it } from "vitest";
import { createDefaultParty, validateCharacter, validateParty } from "../../src/core/characters/validate";
import type { CharacterDraft } from "../../src/core/characters/types";

function fighterDraft(overrides: Partial<CharacterDraft> = {}): CharacterDraft {
  const base = createDefaultParty().members.find((m) => m.classId === "fighter")!;
  return { ...base, ...overrides };
}

function rogueDraft(overrides: Partial<CharacterDraft> = {}): CharacterDraft {
  const base = createDefaultParty().members.find((m) => m.classId === "rogue")!;
  return { ...base, ...overrides };
}

describe("character validation", () => {
  it("accepts default fighter and rogue drafts", () => {
    expect(validateCharacter(fighterDraft())).toEqual({ ok: true });
    expect(validateCharacter(rogueDraft())).toEqual({ ok: true });
    expect(validateParty(createDefaultParty())).toEqual({ ok: true });
  });

  it("rejects empty names", () => {
    const result = validateCharacter(fighterDraft({ name: "   " }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("name is required"))).toBe(true);
    }
  });

  it("rejects abilities that exceed the point pool", () => {
    const result = validateCharacter(
      fighterDraft({
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
      fighterDraft({
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
      rogueDraft({
        trainedSkills: ["thievery", "deception", "acrobatics", "diplomacy", "intimidation", "athletics", "survival", "medicine"],
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("stealth"))).toBe(true);
    }
  });

  it("requires one fighter and one rogue in the party", () => {
    const party = createDefaultParty();
    party.members[1] = {
      ...party.members[0],
      id: party.members[1].id,
      name: "Duplicate Fighter",
    };
    const result = validateParty(party);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toMatch(/one Fighter and one Rogue/);
    }
  });
});
