import { describe, expect, it } from "vitest";
import { abilityModifier } from "../../src/core/characters/abilities";
import { deriveEntityBlueprint } from "../../src/core/characters/derive";
import { createDefaultParty } from "../../src/core/characters/validate";
import { M2_SUBSET } from "../../src/core/characters/subset";

describe("character derive", () => {
  it("derives fighter HP from class HP + CON mod (rules/srd/classes-fighter.md)", () => {
    const fighter = createDefaultParty().members.find((m) => m.classId === "fighter")!;
    const blueprint = deriveEntityBlueprint(fighter, { x: 2, y: 5 });
    const conMod = abilityModifier(fighter.abilities.con);
    expect(blueprint.maxHp).toBe(M2_SUBSET.classes.fighter.hpPerLevel + conMod);
    expect(blueprint.classId).toBe("fighter");
    expect(blueprint.label).toBe("Fighter");
  });

  it("derives rogue attack from trained proficiency + DEX mod", () => {
    const rogue = createDefaultParty().members.find((m) => m.classId === "rogue")!;
    const blueprint = deriveEntityBlueprint(rogue, { x: 3, y: 5 });
    const dexMod = abilityModifier(rogue.abilities.dex);
    const prof = M2_SUBSET.level + M2_SUBSET.proficiencyBonus.trained;
    expect(blueprint.attackBonus).toBe(prof + dexMod);
    expect(blueprint.damage).toEqual({ count: 1, sides: 6, modifier: dexMod });
    expect(blueprint.classId).toBe("rogue");
  });

  it("derives AC from armor + capped DEX mod (10 + dex + armor + shield)", () => {
    const fighter = createDefaultParty().members.find((m) => m.classId === "fighter")!;
    const blueprint = deriveEntityBlueprint(fighter, { x: 0, y: 0 });
    const armor = M2_SUBSET.classes.fighter.armor;
    const dexMod = abilityModifier(fighter.abilities.dex);
    const dexToArmor = Math.min(dexMod, armor.maxDexBonus);
    expect(blueprint.ac).toBe(10 + dexToArmor + armor.acBonus + armor.shieldBonus);
  });
});
