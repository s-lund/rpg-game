import { describe, expect, it } from "vitest";
import {
  createInitialState,
  createSeededRng,
  dispatch,
  replayEvents,
} from "../../src/core/index";

const FIGHT_CONFIG = {
  width: 12,
  height: 12,
  party: [
    {
      id: "ent_fighter_01" as const,
      label: "Fighter",
      classId: "fighter" as const,
      x: 2,
      y: 5,
      maxHp: 20,
      ac: 18,
      attackBonus: 15,
      damage: { count: 1, sides: 8, modifier: 4 },
    },
    {
      id: "ent_rogue_01" as const,
      label: "Rogue",
      classId: "rogue" as const,
      x: 3,
      y: 5,
      maxHp: 16,
      ac: 16,
      attackBonus: 14,
      damage: { count: 1, sides: 6, modifier: 2 },
    },
  ],
  enemies: [
    {
      id: "ent_goblin_01" as const,
      label: "Goblin",
      x: 6,
      y: 5,
      maxHp: 12,
      ac: 14,
      attackBonus: 4,
      damage: { count: 1, sides: 6, modifier: 0 },
    },
  ],
};

describe("scripted fight", () => {
  it("resolves a full encounter and reconstructs from the event log", () => {
    const rng = createSeededRng(42);
    let session = { state: createInitialState(FIGHT_CONFIG), nextSeq: 1 };

    const script = [
      { kind: "Step" as const, actionId: "act_f_move", actorId: "ent_fighter_01" as const, x: 4, y: 5 },
      { kind: "EndTurn" as const, actionId: "act_f_end", actorId: "ent_fighter_01" as const },
      { kind: "Step" as const, actionId: "act_r_move", actorId: "ent_rogue_01" as const, x: 5, y: 5 },
      { kind: "EndTurn" as const, actionId: "act_r_end", actorId: "ent_rogue_01" as const },
      { kind: "EndTurn" as const, actionId: "act_g_end", actorId: "ent_goblin_01" as const },
      { kind: "Step" as const, actionId: "act_f_flank", actorId: "ent_fighter_01" as const, x: 7, y: 5 },
      { kind: "EndTurn" as const, actionId: "act_f_end2", actorId: "ent_fighter_01" as const },
      { kind: "Strike" as const, actionId: "act_r_strike", actorId: "ent_rogue_01" as const, targetId: "ent_goblin_01" as const },
      { kind: "EndTurn" as const, actionId: "act_r_end2", actorId: "ent_rogue_01" as const },
      { kind: "Strike" as const, actionId: "act_f_strike", actorId: "ent_fighter_01" as const, targetId: "ent_goblin_01" as const },
    ];

    for (const action of script) {
      session = dispatch(session, action, rng);
    }

    const goblin = session.state.entities["ent_goblin_01"]!;
    expect(goblin.hp).toBeLessThan(FIGHT_CONFIG.enemies[0]!.maxHp);
    expect(session.state.eventLog.some((e) => e.type === "DamageDealt")).toBe(true);
    expect(session.state.eventLog.some((e) => e.type === "ConditionApplied")).toBe(true);

    const { state: replayed } = replayEvents(createInitialState(FIGHT_CONFIG), session.state.eventLog);
    expect(replayed.entities).toEqual(session.state.entities);
    expect(replayed.combat).toEqual(session.state.combat);
  });
});
