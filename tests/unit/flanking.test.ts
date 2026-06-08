import { describe, expect, it } from "vitest";
import {
  createInitialState,
  createSeededRng,
  dispatch,
  isFlanking,
} from "../../src/core/index";

describe("flanking", () => {
  it("detects opposite-side allies and applies flat-footed on strike", () => {
    const state = createInitialState({
      width: 8,
      height: 8,
      party: [
        { id: "ent_fighter_01", label: "Fighter", x: 3, y: 3, maxHp: 20, ac: 18 },
        { id: "ent_rogue_01", label: "Rogue", x: 5, y: 3, maxHp: 16, ac: 16 },
      ],
      enemies: [{ id: "ent_goblin_01", label: "Goblin", x: 4, y: 3, maxHp: 12, ac: 18 }],
    });

    expect(isFlanking(state, "ent_fighter_01", "ent_goblin_01")).toBe(true);
    expect(isFlanking(state, "ent_rogue_01", "ent_goblin_01")).toBe(true);

    const rng = createSeededRng(7);
    const session = dispatch(
      { state, nextSeq: 1 },
      {
        kind: "Strike",
        actionId: "act_flank_strike",
        actorId: "ent_fighter_01",
        targetId: "ent_goblin_01",
      },
      rng,
    );

    const goblin = session.state.entities["ent_goblin_01"]!;
    expect(goblin.conditions).toContain("flat_footed");

    const applied = session.state.eventLog.find((e) => e.type === "ConditionApplied");
    expect(applied?.payload.condition).toBe("flat_footed");
  });
});
