/**
 * FROZEN — cast heal contract (M7).
 */
import { describe, expect, it } from "vitest";
import {
  createInitialState,
  createSeededRng,
  dispatch,
  type InitialStateConfig,
} from "../../src/core/index";
import type { EntityId } from "../../src/shared/ids";

function healFightConfig(): InitialStateConfig {
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
        currentHp: 5,
        strikeRange: 1,
        attackBonus: 7,
        damage: { count: 1, sides: 6, modifier: 2 },
      },
    ],
    enemies: [],
  };
}

describe("cast heal contract", () => {
  it("heals a wounded ally in range and emits Healed event", () => {
    let session = { state: createInitialState(healFightConfig()), nextSeq: 1 };
    const rng = createSeededRng(7);

    session = dispatch(
      session,
      {
        kind: "CastHeal",
        actionId: "act_heal_1",
        actorId: "ent_cleric_01",
        spellId: "heal_ranged",
        targetId: "ent_ally_01",
      },
      rng,
    );

    const ally = session.state.entities["ent_ally_01"]!;
    expect(ally.hp).toBeGreaterThan(5);
    expect(ally.hp).toBeLessThanOrEqual(ally.maxHp);

    const healed = session.state.eventLog.find((e) => e.type === "Healed");
    expect(healed).toBeTruthy();
    expect(healed?.payload.heal_resolution).toBeTruthy();
    expect(session.state.entities["ent_cleric_01"]!.actionPoints).toBe(1);
  });

  it("rejects heal on enemy target", () => {
    const config: InitialStateConfig = {
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
      ],
      enemies: [
        {
          id: "ent_foe_01" as EntityId,
          label: "Foe",
          x: 5,
          y: 5,
          maxHp: 12,
          ac: 14,
          currentHp: 5,
          strikeRange: 1,
          damage: { count: 1, sides: 4, modifier: 0 },
        },
      ],
    };

    let session = { state: createInitialState(config), nextSeq: 1 };
    session = dispatch(session, {
      kind: "CastHeal",
      actionId: "act_heal_bad",
      actorId: "ent_cleric_01",
      spellId: "heal_ranged",
      targetId: "ent_foe_01",
    });

    expect(session.state.eventLog).toHaveLength(0);
  });

  it("heals self when cleric is wounded", () => {
    const config = healFightConfig();
    config.party[0]!.currentHp = 6;
    let session = { state: createInitialState(config), nextSeq: 1 };

    session = dispatch(
      session,
      {
        kind: "CastHeal",
        actionId: "act_heal_self",
        actorId: "ent_cleric_01",
        spellId: "heal_ranged",
        targetId: "ent_cleric_01",
      },
      createSeededRng(3),
    );

    const cleric = session.state.entities["ent_cleric_01"]!;
    expect(cleric.hp).toBeGreaterThan(6);
    expect(session.state.eventLog.some((e) => e.type === "Healed")).toBe(true);
  });

  it("revives a downed ally at 0 HP", () => {
    const config = healFightConfig();
    config.party[1]!.currentHp = 0;
    let session = { state: createInitialState(config), nextSeq: 1 };

    const ally = session.state.entities["ent_ally_01"]!;
    expect(ally.downed).toBe(true);
    expect(ally.hp).toBe(0);

    session = dispatch(
      session,
      {
        kind: "CastHeal",
        actionId: "act_heal_revive",
        actorId: "ent_cleric_01",
        spellId: "heal_ranged",
        targetId: "ent_ally_01",
      },
      createSeededRng(11),
    );

    const revived = session.state.entities["ent_ally_01"]!;
    expect(revived.downed).toBe(false);
    expect(revived.hp).toBeGreaterThan(0);
    expect(revived.actionPoints).toBe(revived.maxActionPoints);
    expect(session.state.eventLog.some((e) => e.type === "Healed")).toBe(true);
  });

  it("does not overheal above max HP", () => {
    const config = healFightConfig();
    config.party[1]!.currentHp = 15;
    let session = { state: createInitialState(config), nextSeq: 1 };

    session = dispatch(
      session,
      {
        kind: "CastHeal",
        actionId: "act_heal_cap",
        actorId: "ent_cleric_01",
        spellId: "heal_ranged",
        targetId: "ent_ally_01",
      },
      createSeededRng(1),
    );

    expect(session.state.entities["ent_ally_01"]!.hp).toBe(16);
  });
});
