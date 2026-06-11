/**
 * FROZEN — ranged strike contract (M7).
 */
import { describe, expect, it } from "vitest";
import {
  createInitialState,
  createSeededRng,
  dispatch,
  type InitialStateConfig,
} from "../../src/core/index";
import type { EntityId } from "../../src/shared/ids";

function bowFightConfig(): InitialStateConfig {
  return {
    width: 12,
    height: 12,
    party: [
      {
        id: "ent_archer_01" as EntityId,
        label: "Archer",
        classId: "fighter",
        x: 1,
        y: 5,
        maxHp: 20,
        ac: 16,
        attackBonus: 10,
        strikeRange: 6,
        damageType: "piercing",
        damage: { count: 1, sides: 6, modifier: 4 },
      },
    ],
    enemies: [
      {
        id: "ent_target_01" as EntityId,
        label: "Target",
        x: 7,
        y: 5,
        maxHp: 20,
        ac: 10,
        attackBonus: 0,
        strikeRange: 1,
        damage: { count: 1, sides: 4, modifier: 0 },
      },
    ],
  };
}

describe("ranged strike contract", () => {
  it("hits an enemy within bow range without adjacency", () => {
    let session = { state: createInitialState(bowFightConfig()), nextSeq: 1 };
    const rng = createSeededRng(42);

    session = dispatch(
      session,
      {
        kind: "Strike",
        actionId: "act_bow_1",
        actorId: "ent_archer_01",
        targetId: "ent_target_01",
      },
      rng,
    );

    const target = session.state.entities["ent_target_01"]!;
    expect(target.hp).toBeLessThan(20);
    const dmgEvent = session.state.eventLog.find((e) => e.type === "DamageDealt");
    expect(dmgEvent?.payload.attack_resolution).toBeTruthy();
    expect((dmgEvent?.payload.attack_resolution as { hit: boolean }).hit).toBe(true);
  });

  it("rejects strike when target is out of range", () => {
    const config = bowFightConfig();
    config.enemies[0]!.x = 10;
    config.enemies[0]!.y = 5;
    let session = { state: createInitialState(config), nextSeq: 1 };

    session = dispatch(session, {
      kind: "Strike",
      actionId: "act_bow_far",
      actorId: "ent_archer_01",
      targetId: "ent_target_01",
    });

    expect(session.state.entities["ent_target_01"]!.hp).toBe(20);
    expect(session.state.eventLog).toHaveLength(0);
  });
});
