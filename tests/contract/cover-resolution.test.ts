/**
 * M11 contract — cover + line of effect wired into action resolution.
 * Geometry lives in los-cover.test.ts (frozen); this file tests reject/adjust behavior only.
 */
import { describe, expect, it } from "vitest";
import {
  createInitialState,
  createSeededRng,
  dispatch,
  type AttackResolution,
  type InitialStateConfig,
  type Rng,
  type SaveResolution,
  type SpellSlot,
} from "../../src/core/index";
import type { EntityId } from "../../src/shared/ids";

function scriptedRng(damageRolls: number[], d20Rolls: number[]): Rng {
  const dmg = [...damageRolls];
  const d20 = [...d20Rolls];
  return {
    d20: () => {
      const v = d20.shift();
      if (v === undefined) throw new Error("scripted d20 exhausted");
      return v;
    },
    integer: () => {
      const v = dmg.shift();
      if (v === undefined) throw new Error("scripted damage roll exhausted");
      return v;
    },
  };
}

function wallRowConfig(): InitialStateConfig {
  return {
    width: 3,
    height: 1,
    blockedTiles: [{ x: 1, y: 0 }],
    coverTiles: [{ x: 1, y: 0, kind: "wall" }],
    party: [
      {
        id: "ent_archer" as EntityId,
        label: "Archer",
        x: 0,
        y: 0,
        maxHp: 20,
        ac: 16,
        attackBonus: 10,
        strikeRange: 6,
        damage: { count: 1, sides: 6, modifier: 0 },
      },
    ],
    enemies: [
      {
        id: "ent_foe" as EntityId,
        label: "Foe",
        x: 2,
        y: 0,
        maxHp: 20,
        ac: 16,
        strikeRange: 1,
        damage: { count: 1, sides: 4, modifier: 0 },
      },
    ],
  };
}

function propCoverRowConfig(): InitialStateConfig {
  return {
    width: 5,
    height: 1,
    blockedTiles: [{ x: 1, y: 0 }],
    coverTiles: [{ x: 1, y: 0, kind: "raised" }],
    party: [
      {
        id: "ent_archer" as EntityId,
        label: "Archer",
        x: 0,
        y: 0,
        maxHp: 20,
        ac: 16,
        attackBonus: 10,
        strikeRange: 6,
        damage: { count: 1, sides: 6, modifier: 0 },
      },
    ],
    enemies: [
      {
        id: "ent_foe" as EntityId,
        label: "Foe",
        x: 4,
        y: 0,
        maxHp: 20,
        ac: 16,
        strikeRange: 1,
        damage: { count: 1, sides: 4, modifier: 0 },
      },
    ],
  };
}

function wizardSlots(): SpellSlot[] {
  return [
    { id: "wizard_slot_1", rank: 1, preparedSpellId: "breathe_fire", expended: false },
  ];
}

describe("cover resolution contract", () => {
  it("rejects a strike with no line of effect — no events, AP unchanged", () => {
    let session = { state: createInitialState(wallRowConfig()), nextSeq: 1 };

    session = dispatch(session, {
      kind: "Strike",
      actionId: "act_blocked",
      actorId: "ent_archer",
      targetId: "ent_foe",
    });

    expect(session.state.eventLog).toHaveLength(0);
    expect(session.state.entities["ent_archer"]!.actionPoints).toBe(3);
  });

  it("rejects Ray of Frost with no line of effect", () => {
    const config = wallRowConfig();
    config.party[0] = {
      ...config.party[0]!,
      classId: "wizard",
      strikeRange: 0,
      spellAttackBonus: 9,
      knownSpells: ["ray_of_frost"],
    };
    let session = { state: createInitialState(config), nextSeq: 1 };

    session = dispatch(session, {
      kind: "CastSpell",
      actionId: "act_ray_blocked",
      actorId: "ent_archer",
      spellId: "ray_of_frost",
      targetId: "ent_foe",
    });

    expect(session.state.eventLog).toHaveLength(0);
  });

  it("prop cover (+2 AC) turns a would-be hit into a miss at a pinned roll", () => {
    let session = { state: createInitialState(propCoverRowConfig()), nextSeq: 1 };
    // d20(7) + 10 = 17 beats AC 16 but misses vs 16 + 2 cover = 18
    const rng = scriptedRng([4], [7]);

    session = dispatch(
      session,
      {
        kind: "Strike",
        actionId: "act_cover_miss",
        actorId: "ent_archer",
        targetId: "ent_foe",
      },
      rng,
    );

    const dmg = session.state.eventLog.find((e) => e.type === "DamageDealt");
    const res = dmg?.payload.attack_resolution as AttackResolution;
    expect(res.hit).toBe(false);
    expect(res.targetAc).toBe(16);
    expect(res.coverAcBonus).toBe(2);
    expect(res.attackTotal).toBe(17);
  });

  it("the same roll hits when no cover tile is present", () => {
    const open: InitialStateConfig = {
      ...propCoverRowConfig(),
      blockedTiles: [],
      coverTiles: [],
    };
    let session = { state: createInitialState(open), nextSeq: 1 };
    const rng = scriptedRng([4], [7]);

    session = dispatch(
      session,
      {
        kind: "Strike",
        actionId: "act_open_hit",
        actorId: "ent_archer",
        targetId: "ent_foe",
      },
      rng,
    );

    const res = session.state.eventLog.find((e) => e.type === "DamageDealt")?.payload
      .attack_resolution as AttackResolution;
    expect(res.hit).toBe(true);
    expect(res.coverAcBonus).toBeUndefined();
  });

  it("cone clipped by a wall — sheltered creature gets no save or damage event", () => {
    const config: InitialStateConfig = {
      width: 5,
      height: 3,
      blockedTiles: [{ x: 1, y: 1 }],
      coverTiles: [{ x: 1, y: 1, kind: "wall" }],
      party: [
        {
          id: "ent_wizard" as EntityId,
          label: "Wizard",
          classId: "wizard",
          x: 0,
          y: 1,
          maxHp: 14,
          ac: 14,
          spellDc: 17,
          saves: { fortitude: 3, reflex: 3, will: 7 },
          knownSpells: ["breathe_fire"],
          spellSlots: wizardSlots(),
          strikeRange: 0,
          damage: { count: 0, sides: 4, modifier: 0 },
        },
      ],
      enemies: [
        {
          id: "ent_sheltered" as EntityId,
          label: "Sheltered",
          x: 3,
          y: 1,
          maxHp: 20,
          ac: 14,
          saves: { fortitude: 4, reflex: 5, will: 3 },
          strikeRange: 1,
          damage: { count: 1, sides: 4, modifier: 0 },
        },
      ],
    };
    let session = { state: createInitialState(config), nextSeq: 1 };
    const rng = scriptedRng([4, 3], [5]);

    session = dispatch(
      session,
      {
        kind: "CastConeSpell",
        actionId: "act_cone_wall",
        actorId: "ent_wizard",
        spellId: "breathe_fire",
        targetX: 3,
        targetY: 1,
      },
      rng,
    );

    const forSheltered = session.state.eventLog.filter(
      (e) => e.type === "DamageDealt" && e.payload.target_id === "ent_sheltered",
    );
    expect(forSheltered).toHaveLength(0);
    expect(session.state.entities["ent_sheltered"]!.hp).toBe(20);
  });

  it("a target behind a cart saves at +2 cover — visible in the save payload", () => {
    const config: InitialStateConfig = {
      width: 6,
      height: 1,
      blockedTiles: [{ x: 1, y: 0 }],
      coverTiles: [{ x: 1, y: 0, kind: "raised" }],
      party: [
        {
          id: "ent_wizard" as EntityId,
          label: "Wizard",
          classId: "wizard",
          x: 0,
          y: 0,
          maxHp: 14,
          ac: 14,
          spellDc: 17,
          saves: { fortitude: 3, reflex: 3, will: 7 },
          knownSpells: ["breathe_fire"],
          spellSlots: wizardSlots(),
          strikeRange: 0,
          damage: { count: 0, sides: 4, modifier: 0 },
        },
      ],
      enemies: [
        {
          id: "ent_behind_cart" as EntityId,
          label: "Behind Cart",
          x: 2,
          y: 0,
          maxHp: 20,
          ac: 14,
          saves: { fortitude: 4, reflex: 5, will: 3 },
          strikeRange: 1,
          damage: { count: 1, sides: 4, modifier: 0 },
        },
      ],
    };
    let session = { state: createInitialState(config), nextSeq: 1 };
    const rng = scriptedRng([3, 3], [10]);

    session = dispatch(
      session,
      {
        kind: "CastConeSpell",
        actionId: "act_cone_cart",
        actorId: "ent_wizard",
        spellId: "breathe_fire",
        targetX: 3,
        targetY: 0,
      },
      rng,
    );

    const dmg = session.state.eventLog.find(
      (e) => e.type === "DamageDealt" && e.payload.target_id === "ent_behind_cart",
    );
    const save = dmg?.payload.save_resolution as SaveResolution;
    expect(save.coverBonus).toBe(2);
    expect(save.saveModifier).toBe(5);
    expect(save.saveTotal).toBe(17);
    expect(save.dc).toBe(17);
    expect(save.outcome).toBe("success");
  });

  it("createSeededRng smoke — pinned seed still resolves deterministically", () => {
    let session = { state: createInitialState(propCoverRowConfig()), nextSeq: 1 };
    session = dispatch(
      session,
      {
        kind: "Strike",
        actionId: "act_seed",
        actorId: "ent_archer",
        targetId: "ent_foe",
      },
      createSeededRng(42),
    );
    expect(session.state.eventLog.length).toBeGreaterThan(0);
  });
});
