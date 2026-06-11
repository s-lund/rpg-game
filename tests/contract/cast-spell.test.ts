/**
 * FROZEN — cast spell contract (M7).
 */
import { describe, expect, it } from "vitest";
import {
  createInitialState,
  createSeededRng,
  dispatch,
  type InitialStateConfig,
} from "../../src/core/index";
import type { EntityId } from "../../src/shared/ids";

function wizardFightConfig(): InitialStateConfig {
  return {
    width: 12,
    height: 12,
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
    ],
    enemies: [
      {
        id: "ent_foe_01" as EntityId,
        label: "Foe",
        x: 7,
        y: 5,
        maxHp: 20,
        ac: 10,
        strikeRange: 1,
        damage: { count: 1, sides: 4, modifier: 0 },
      },
    ],
  };
}

describe("cast spell contract", () => {
  it("Ray of Frost spends 2 AP and deals cold damage on hit", () => {
    let session = { state: createInitialState(wizardFightConfig()), nextSeq: 1 };
    const rng = createSeededRng(99);

    session = dispatch(
      session,
      {
        kind: "CastSpell",
        actionId: "act_ray_1",
        actorId: "ent_wizard_01",
        spellId: "ray_of_frost",
        targetId: "ent_foe_01",
      },
      rng,
    );

    const wizard = session.state.entities["ent_wizard_01"]!;
    expect(wizard.actionPoints).toBe(1);

    const dmg = session.state.eventLog.find((e) => e.type === "DamageDealt");
    expect(dmg?.payload.damage_type).toBe("cold");
    expect((dmg?.payload.attack_resolution as { hit: boolean }).hit).toBe(true);
    expect(session.state.entities["ent_foe_01"]!.hp).toBeLessThan(20);
  });

  it("rejects cast when target is out of spell range", () => {
    const config = wizardFightConfig();
    config.enemies[0]!.x = 11;
    let session = { state: createInitialState(config), nextSeq: 1 };

    session = dispatch(session, {
      kind: "CastSpell",
      actionId: "act_ray_far",
      actorId: "ent_wizard_01",
      spellId: "ray_of_frost",
      targetId: "ent_foe_01",
    });

    expect(session.state.eventLog).toHaveLength(0);
    expect(session.state.entities["ent_wizard_01"]!.actionPoints).toBe(3);
  });
});
