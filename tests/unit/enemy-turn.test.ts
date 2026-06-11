import { describe, expect, it } from "vitest";
import { chooseEnemyAction, createInitialState } from "../../src/core/index";
import type { EntityId } from "../../src/shared/ids";

describe("enemy turn AI", () => {
  it("strikes a party member in range", () => {
    const state = createInitialState({
      width: 12,
      height: 12,
      party: [
        {
          id: "ent_fighter_01" as EntityId,
          label: "Fighter",
          x: 5,
          y: 5,
          maxHp: 20,
          ac: 16,
          strikeRange: 1,
        },
      ],
      enemies: [
        {
          id: "ent_goblin_01" as EntityId,
          label: "Goblin",
          x: 6,
          y: 5,
          maxHp: 12,
          ac: 14,
          attackBonus: 8,
          strikeRange: 1,
          damage: { count: 1, sides: 6, modifier: 2 },
        },
      ],
    });
    state.combat.activeActorId = "ent_goblin_01";

    const action = chooseEnemyAction(state, "ent_goblin_01");
    expect(action?.kind).toBe("Strike");
    if (action?.kind === "Strike") {
      expect(action.targetId).toBe("ent_fighter_01");
    }
  });

  it("steps toward the party when out of strike range", () => {
    const state = createInitialState({
      width: 12,
      height: 12,
      party: [
        {
          id: "ent_fighter_01" as EntityId,
          label: "Fighter",
          x: 8,
          y: 5,
          maxHp: 20,
          ac: 16,
          strikeRange: 1,
        },
      ],
      enemies: [
        {
          id: "ent_goblin_01" as EntityId,
          label: "Goblin",
          x: 5,
          y: 5,
          maxHp: 12,
          ac: 14,
          attackBonus: 8,
          strikeRange: 1,
          damage: { count: 1, sides: 6, modifier: 2 },
        },
      ],
    });
    state.combat.activeActorId = "ent_goblin_01";

    const action = chooseEnemyAction(state, "ent_goblin_01");
    expect(action?.kind).toBe("Step");
    if (action?.kind === "Step") {
      expect(action.x).toBe(6);
      expect(action.y).toBe(5);
    }
  });

  it("ranged enemy strikes without adjacency", () => {
    const state = createInitialState({
      width: 12,
      height: 12,
      party: [
        {
          id: "ent_fighter_01" as EntityId,
          label: "Fighter",
          x: 8,
          y: 5,
          maxHp: 20,
          ac: 16,
          strikeRange: 1,
        },
      ],
      enemies: [
        {
          id: "ent_skirmisher_01" as EntityId,
          label: "Skirmisher",
          x: 2,
          y: 5,
          maxHp: 10,
          ac: 14,
          attackBonus: 7,
          strikeRange: 6,
          damage: { count: 1, sides: 6, modifier: 1 },
        },
      ],
    });
    state.combat.activeActorId = "ent_skirmisher_01";

    const action = chooseEnemyAction(state, "ent_skirmisher_01");
    expect(action?.kind).toBe("Strike");
  });
});
