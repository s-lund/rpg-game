import { describe, expect, it } from "vitest";
import {
  createInitialState,
  createSeededRng,
  dispatch,
} from "../../src/core/index";

describe("move and strike", () => {
  it("spends action points proportional to movement distance", () => {
    let session = {
      state: createInitialState({
        width: 8,
        height: 8,
        party: [{ id: "ent_fighter_01", label: "Fighter", x: 1, y: 1, maxHp: 20, ac: 18 }],
        enemies: [{ id: "ent_goblin_01", label: "Goblin", x: 6, y: 6, maxHp: 12, ac: 10 }],
      }),
      nextSeq: 1,
    };

    session = dispatch(session, {
      kind: "Step",
      actionId: "act_move",
      actorId: "ent_fighter_01",
      x: 3,
      y: 1,
    });

    const fighter = session.state.entities["ent_fighter_01"]!;
    expect(fighter.x).toBe(3);
    expect(fighter.actionPoints).toBe(1);
  });

  it("deals damage on a successful strike", () => {
    const rng = createSeededRng(99);
    const session = dispatch(
      {
        state: createInitialState({
          width: 8,
          height: 8,
          party: [{ id: "ent_fighter_01", label: "Fighter", x: 4, y: 3, maxHp: 20, ac: 18, attackBonus: 20 }],
          enemies: [{ id: "ent_goblin_01", label: "Goblin", x: 5, y: 3, maxHp: 12, ac: 10 }],
        }),
        nextSeq: 1,
      },
      {
        kind: "Strike",
        actionId: "act_hit",
        actorId: "ent_fighter_01",
        targetId: "ent_goblin_01",
      },
      rng,
    );

    const goblin = session.state.entities["ent_goblin_01"]!;
    expect(goblin.hp).toBeLessThan(12);

    const damageEvent = session.state.eventLog.find((e) => e.type === "DamageDealt");
    expect(damageEvent).toBeDefined();
    expect(damageEvent!.payload.amount).toBeGreaterThan(0);
    expect(damageEvent!.payload.attack_resolution).toBeDefined();
    const resolution = damageEvent!.payload.attack_resolution as { hit: boolean; d20Natural: number };
    expect(resolution.hit).toBe(true);
    expect(resolution.d20Natural).toBeGreaterThanOrEqual(1);
    expect(resolution.d20Natural).toBeLessThanOrEqual(20);
  });

  it("records attack resolution on a miss", () => {
    const rng = createSeededRng(1);
    const session = dispatch(
      {
        state: createInitialState({
          width: 8,
          height: 8,
          party: [{ id: "ent_fighter_01", label: "Fighter", x: 4, y: 3, maxHp: 20, ac: 18, attackBonus: 0 }],
          enemies: [{ id: "ent_goblin_01", label: "Goblin", x: 5, y: 3, maxHp: 12, ac: 30 }],
        }),
        nextSeq: 1,
      },
      {
        kind: "Strike",
        actionId: "act_miss",
        actorId: "ent_fighter_01",
        targetId: "ent_goblin_01",
      },
      rng,
    );

    const goblin = session.state.entities["ent_goblin_01"]!;
    expect(goblin.hp).toBe(12);

    const atkEvent = session.state.eventLog.find((e) => e.type === "DamageDealt");
    expect(atkEvent).toBeDefined();
    const resolution = atkEvent!.payload.attack_resolution as { hit: boolean };
    expect(resolution.hit).toBe(false);
    expect(atkEvent!.payload.amount).toBe(0);
  });
});
