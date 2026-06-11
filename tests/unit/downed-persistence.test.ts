import { describe, expect, it } from "vitest";
import { createInitialState, type InitialStateConfig } from "../../src/core/index";
import type { EntityId } from "../../src/shared/ids";

function twoHeroConfig(allyHp: number): InitialStateConfig {
  return {
    width: 12,
    height: 12,
    party: [
      {
        id: "ent_cleric_01" as EntityId,
        label: "Cleric",
        classId: "cleric",
        x: 2,
        y: 5,
        maxHp: 18,
        ac: 15,
        knownSpells: ["heal_ranged"],
        strikeRange: 0,
      },
      {
        id: "ent_ally_01" as EntityId,
        label: "Ally",
        classId: "rogue",
        x: 5,
        y: 5,
        maxHp: 16,
        ac: 16,
        currentHp: allyHp,
        strikeRange: 1,
      },
    ],
    enemies: [],
  };
}

describe("downed persistence across encounters", () => {
  it("spawns a saved 0 HP party member as downed with no actions", () => {
    const state = createInitialState(twoHeroConfig(0));
    const ally = state.entities["ent_ally_01"]!;

    expect(ally.hp).toBe(0);
    expect(ally.downed).toBe(true);
    expect(ally.actionPoints).toBe(0);
  });

  it("skips downed heroes when choosing the first active actor", () => {
    const state = createInitialState(twoHeroConfig(0));

    expect(state.combat.activeActorId).toBe("ent_cleric_01");
  });
});
