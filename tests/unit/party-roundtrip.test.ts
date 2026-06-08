import { describe, expect, it } from "vitest";
import { buildEncounterConfig } from "../../src/core/characters/derive";
import { deserializeParty, serializeParty } from "../../src/core/characters/serialize";
import { createDefaultParty } from "../../src/core/characters/validate";
import { createInitialState } from "../../src/core/state";
import type { EntityId } from "../../src/shared/ids";

describe("party round-trip", () => {
  it("serializes and deserializes party unchanged", () => {
    const party = createDefaultParty();
    party.members[0].name = "Aldric";
    party.members[1].name = "Sera";

    const json = serializeParty(party);
    const restored = deserializeParty(json);

    expect(restored.members[0].name).toBe("Aldric");
    expect(restored.members[1].name).toBe("Sera");
    expect(restored.members[0].abilities).toEqual(party.members[0].abilities);
    expect(restored.members[1].trainedSkills).toEqual(party.members[1].trainedSkills);
  });

  it("round-trips party into combat with matching derived stats", () => {
    const party = createDefaultParty();
    party.members[0].name = "Bran";
    party.members[1].name = "Lyra";

    const json = serializeParty(party);
    const restored = deserializeParty(json);
    const config = buildEncounterConfig(restored);
    const state = createInitialState(config);

    for (const blueprint of config.party) {
      const entity = state.entities[blueprint.id as EntityId];
      expect(entity.label).toBe(blueprint.label);
      expect(entity.maxHp).toBe(blueprint.maxHp);
      expect(entity.ac).toBe(blueprint.ac);
      expect(entity.attackBonus).toBe(blueprint.attackBonus);
      expect(entity.damage).toEqual(blueprint.damage);
      expect(entity.classId).toBe(blueprint.classId);
      expect(entity.team).toBe("party");
    }

    expect(Object.keys(state.entities)).toHaveLength(4);
  });
});
