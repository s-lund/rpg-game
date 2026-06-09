import { describe, expect, it } from "vitest";
import { formatCombatLogBatch } from "../../src/core/narrator/combat-log";
import type { GameEvent } from "../../src/core/types";

const ctx = {
  entityLabels: {
    ent_fighter_01: "Bran",
    ent_goblin_01: "Scout",
  },
};

describe("combat log format", () => {
  it("formats strike with dice breakdown on hit", () => {
    const events: GameEvent[] = [
      {
        seq: 1,
        turn: 1,
        actorId: "ent_fighter_01",
        type: "DamageDealt",
        payload: {
          target_id: "ent_goblin_01",
          amount: 11,
          damage_type: "slashing",
          hp_after: 1,
          from_effect: "eff_dmg",
          attack_resolution: {
            hit: true,
            d20Natural: 15,
            attackBonus: 9,
            attackTotal: 24,
            targetAc: 16,
            flanking: false,
            weaponLabel: "1d8+4",
            damageRolls: [7],
            damageModifier: 4,
          },
        },
        derivedFrom: "act_strike",
      },
    ];
    const lines = formatCombatLogBatch(events, ctx);
    expect(lines[0]).toContain("d20(15) + 9 = 24 vs AC 16 — HIT");
    expect(lines.some((l) => l.includes("1d8+4"))).toBe(true);
    expect(lines.some((l) => l.includes("11 slashing"))).toBe(true);
  });

  it("formats miss with attack roll only", () => {
    const events: GameEvent[] = [
      {
        seq: 1,
        turn: 1,
        actorId: "ent_fighter_01",
        type: "DamageDealt",
        payload: {
          target_id: "ent_goblin_01",
          amount: 0,
          damage_type: "slashing",
          hp_after: 12,
          from_effect: "eff_miss",
          attack_resolution: {
            hit: false,
            d20Natural: 4,
            attackBonus: 9,
            attackTotal: 13,
            targetAc: 16,
            flanking: false,
            weaponLabel: "1d8+4",
          },
        },
        derivedFrom: "act_strike",
      },
    ];
    const lines = formatCombatLogBatch(events, ctx);
    expect(lines).toEqual([
      "Bran → Scout: d20(4) + 9 = 13 vs AC 16 — MISS",
    ]);
  });
});
