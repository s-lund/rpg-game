/**
 * M9 contract — weakness/resistance damage adjustment (rules/srd/resistance-weakness.md).
 * Weakness first, then resistance, minimum 0; no weakness when no damage is taken.
 */
import { describe, expect, it } from "vitest";
import {
  adjustDamage,
  createInitialState,
  dispatch,
  type DamageAdjustment,
  type InitialStateConfig,
  type Rng,
} from "../../src/core/index";
import type { EntityId } from "../../src/shared/ids";

function scriptedRng(damageRolls: number[], d20Rolls: number[]): Rng {
  const dmg = [...damageRolls];
  const d20 = [...d20Rolls];
  return {
    d20: () => d20.shift() ?? 10,
    integer: () => dmg.shift() ?? 1,
  };
}

describe("adjustDamage math", () => {
  const target = { resistances: { cold: 3 as number }, weaknesses: { fire: 2 as number } };

  it("resistance reduces damage of its type to a minimum of 0", () => {
    expect(adjustDamage(target, 5, "cold")).toEqual({
      before: 5,
      resistance: { damageType: "cold", value: 3 },
      final: 2,
    });
    expect(adjustDamage(target, 2, "cold")?.final).toBe(0);
  });

  it("weakness increases damage of its type", () => {
    expect(adjustDamage(target, 5, "fire")).toEqual({
      before: 5,
      weakness: { damageType: "fire", value: 2 },
      final: 7,
    });
  });

  it("does not trigger weakness when no damage would be taken (crit-success save)", () => {
    expect(adjustDamage(target, 0, "fire")).toBeNull();
  });

  it("returns null when neither applies", () => {
    expect(adjustDamage(target, 5, "slashing")).toBeNull();
  });

  it("applies weakness before resistance when both match", () => {
    const both = { resistances: { fire: 4 as number }, weaknesses: { fire: 2 as number } };
    expect(adjustDamage(both, 5, "fire")).toEqual({
      before: 5,
      weakness: { damageType: "fire", value: 2 },
      resistance: { damageType: "fire", value: 4 },
      final: 3,
    });
  });
});

function strikeConfig(): InitialStateConfig {
  return {
    width: 10,
    height: 10,
    party: [
      {
        id: "ent_wizard_01" as EntityId,
        label: "Wizard",
        classId: "wizard",
        x: 2,
        y: 5,
        maxHp: 14,
        ac: 14,
        spellAttackBonus: 9,
        knownSpells: ["ray_of_frost"],
        strikeRange: 0,
        damage: { count: 0, sides: 4, modifier: 0 },
      },
      {
        id: "ent_fighter_01" as EntityId,
        label: "Fighter",
        classId: "fighter",
        x: 3,
        y: 5,
        maxHp: 20,
        ac: 18,
        attackBonus: 9,
        strikeRange: 6,
        damageType: "piercing",
        damage: { count: 1, sides: 6, modifier: 4 },
      },
    ],
    enemies: [
      {
        id: "ent_drowned_01" as EntityId,
        label: "Drowned Marauder",
        x: 6,
        y: 5,
        maxHp: 20,
        ac: 10,
        strikeRange: 1,
        damage: { count: 1, sides: 4, modifier: 0 },
        resistances: { cold: 3 },
        weaknesses: { fire: 2 },
      },
    ],
  };
}

describe("resistance/weakness in the pipeline", () => {
  it("Ray of Frost (cold) is resisted — event carries the adjustment breakdown", () => {
    let session = { state: createInitialState(strikeConfig()), nextSeq: 1 };
    // d20 15 + 9 = 24 vs AC 10 → hit; 2d4 = 4+4 = 8 cold − 3 resistance = 5
    session = dispatch(
      session,
      {
        kind: "CastSpell",
        actionId: "act_ray_resist",
        actorId: "ent_wizard_01",
        spellId: "ray_of_frost",
        targetId: "ent_drowned_01",
      },
      scriptedRng([4, 4], [15]),
    );

    const dmg = session.state.eventLog.find((e) => e.type === "DamageDealt")!;
    expect(dmg.payload.amount).toBe(5);
    const adj = dmg.payload.damage_adjustment as DamageAdjustment;
    expect(adj.before).toBe(8);
    expect(adj.resistance).toEqual({ damageType: "cold", value: 3 });
    expect(adj.final).toBe(5);
    expect(session.state.entities["ent_drowned_01"]!.hp).toBe(15);
  });

  it("a piercing strike is unaffected — no adjustment payload", () => {
    let session = { state: createInitialState(strikeConfig()), nextSeq: 1 };
    // The wizard acts first in turn order — pass to the fighter before striking.
    session = dispatch(session, {
      kind: "EndTurn",
      actionId: "act_end_wiz",
      actorId: "ent_wizard_01",
    });
    session = dispatch(
      session,
      {
        kind: "Strike",
        actionId: "act_strike_pierce",
        actorId: "ent_fighter_01",
        targetId: "ent_drowned_01",
      },
      scriptedRng([3], [15]),
    );

    const dmg = session.state.eventLog.find(
      (e) => e.type === "DamageDealt" && e.derivedFrom === "act_strike_pierce",
    )!;
    expect(dmg.payload.amount).toBe(7); // 1d6(3) + 4, no adjustment
    expect(dmg.payload.damage_adjustment).toBeUndefined();
  });
});
