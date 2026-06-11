/**
 * M9 contract — basic saving throws + Breathe Fire cone (rules/srd/saving-throws.md,
 * rules/srd/spell-breathe-fire.md). One Effect → one Event; replay reconstructs.
 */
import { describe, expect, it } from "vitest";
import {
  basicSaveDamage,
  createInitialState,
  degreeOfSuccess,
  dispatch,
  replayEvents,
  type InitialStateConfig,
  type Rng,
  type SaveResolution,
  type SpellSlot,
} from "../../src/core/index";
import type { EntityId } from "../../src/shared/ids";

/** Rng stub: integer() pops damageRolls, d20() pops d20Rolls — exact script control. */
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

function wizardSlots(): SpellSlot[] {
  return [
    { id: "wizard_slot_1", rank: 1, preparedSpellId: "breathe_fire", expended: false },
    { id: "wizard_slot_2", rank: 1, preparedSpellId: "breathe_fire", expended: false },
  ];
}

/** Wizard at (2,5), ally rogue inside the eastward cone, two foes in/out of it. */
function coneFightConfig(): InitialStateConfig {
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
        spellDc: 17,
        saves: { fortitude: 3, reflex: 3, will: 7 },
        knownSpells: ["ray_of_frost", "breathe_fire"],
        spellSlots: wizardSlots(),
        strikeRange: 0,
        damage: { count: 0, sides: 4, modifier: 0 },
      },
      {
        id: "ent_ally_01" as EntityId,
        label: "Ally",
        classId: "rogue",
        x: 4,
        y: 5,
        maxHp: 16,
        ac: 16,
        saves: { fortitude: 5, reflex: 8, will: 6 },
        strikeRange: 1,
        attackBonus: 7,
        damage: { count: 1, sides: 6, modifier: 2 },
      },
    ],
    enemies: [
      {
        id: "ent_foe_near" as EntityId,
        label: "Foe Near",
        x: 4,
        y: 6,
        maxHp: 20,
        ac: 14,
        saves: { fortitude: 4, reflex: 5, will: 3 },
        strikeRange: 1,
        damage: { count: 1, sides: 4, modifier: 0 },
      },
      {
        id: "ent_foe_far" as EntityId,
        label: "Foe Far",
        x: 10,
        y: 5,
        maxHp: 20,
        ac: 14,
        saves: { fortitude: 4, reflex: 5, will: 3 },
        strikeRange: 1,
        damage: { count: 1, sides: 4, modifier: 0 },
      },
    ],
  };
}

describe("degrees of success (rules/srd/saving-throws.md)", () => {
  it("maps totals to the four tiers around the DC", () => {
    expect(degreeOfSuccess(10, 27, 17)).toBe("critSuccess"); // DC+10
    expect(degreeOfSuccess(10, 17, 17)).toBe("success");
    expect(degreeOfSuccess(10, 16, 17)).toBe("failure");
    expect(degreeOfSuccess(10, 7, 17)).toBe("critFailure"); // DC-10
  });

  it("natural 20 improves and natural 1 worsens one step", () => {
    expect(degreeOfSuccess(20, 16, 17)).toBe("success"); // failure → success
    expect(degreeOfSuccess(1, 18, 17)).toBe("failure"); // success → failure
    expect(degreeOfSuccess(20, 27, 17)).toBe("critSuccess"); // cannot exceed top
    expect(degreeOfSuccess(1, 7, 17)).toBe("critFailure"); // cannot go below bottom
  });

  it("basic save damage: none / half (rounded down) / full / double", () => {
    expect(basicSaveDamage(7, "critSuccess")).toBe(0);
    expect(basicSaveDamage(7, "success")).toBe(3);
    expect(basicSaveDamage(7, "failure")).toBe(7);
    expect(basicSaveDamage(7, "critFailure")).toBe(14);
  });
});

describe("Breathe Fire cone contract", () => {
  it("spends 2 AP + a slot, damages every creature in the cone with its own save, skips those outside", () => {
    let session = { state: createInitialState(coneFightConfig()), nextSeq: 1 };
    // eastward cardinal cone from (2,5) covers (3,5),(4,4..6),(5,4..6) — ally (4,5) and near foe (4,6)
    // damage 2d6 = 4+3 = 7; saves: ally d20=19 (+8 → 27 = crit success), foe near d20=5 (+5 → 10 vs 17 = failure)
    const rng = scriptedRng([4, 3], [19, 5]);

    session = dispatch(
      session,
      {
        kind: "CastConeSpell",
        actionId: "act_cone_1",
        actorId: "ent_wizard_01",
        spellId: "breathe_fire",
        targetX: 5,
        targetY: 5,
      },
      rng,
    );

    const wizard = session.state.entities["ent_wizard_01"]!;
    expect(wizard.actionPoints).toBe(1);
    expect(wizard.spellSlots!.filter((s) => s.expended)).toHaveLength(1);

    const slotEvent = session.state.eventLog.find((e) => e.type === "SpellSlotSpent");
    expect(slotEvent?.payload.spell_id).toBe("breathe_fire");
    expect(slotEvent?.payload.remaining).toBe(1);

    const damageEvents = session.state.eventLog.filter((e) => e.type === "DamageDealt");
    expect(damageEvents).toHaveLength(2); // ally + near foe; far foe untouched

    const allyHit = damageEvents.find((e) => e.payload.target_id === "ent_ally_01")!;
    const allySave = allyHit.payload.save_resolution as SaveResolution;
    expect(allySave.outcome).toBe("critSuccess");
    expect(allyHit.payload.amount).toBe(0);
    expect(session.state.entities["ent_ally_01"]!.hp).toBe(16);

    const foeHit = damageEvents.find((e) => e.payload.target_id === "ent_foe_near")!;
    const foeSave = foeHit.payload.save_resolution as SaveResolution;
    expect(foeSave.outcome).toBe("failure");
    expect(foeSave.saveKind).toBe("reflex");
    expect(foeSave.dc).toBe(17);
    expect(foeSave.baseDamage).toBe(7);
    expect(foeHit.payload.amount).toBe(7);
    expect(foeHit.payload.damage_type).toBe("fire");
    expect(session.state.entities["ent_foe_near"]!.hp).toBe(13);

    expect(session.state.entities["ent_foe_far"]!.hp).toBe(20);
  });

  it("friendly fire can down an ally caught in the cone", () => {
    const config = coneFightConfig();
    config.party[1]!.currentHp = 3;
    let session = { state: createInitialState(config), nextSeq: 1 };
    // damage 6+6 = 12; ally d20=2 (+8 → 10 vs 17 failure → 12 dmg), foe d20=2 failure
    const rng = scriptedRng([6, 6], [2, 2]);

    session = dispatch(
      session,
      {
        kind: "CastConeSpell",
        actionId: "act_cone_ff",
        actorId: "ent_wizard_01",
        spellId: "breathe_fire",
        targetX: 5,
        targetY: 5,
      },
      rng,
    );

    const ally = session.state.entities["ent_ally_01"]!;
    expect(ally.downed).toBe(true);
    expect(ally.hp).toBe(0);
    expect(
      session.state.eventLog.some(
        (e) => e.type === "EntityDowned" && e.payload.entity_id === "ent_ally_01",
      ),
    ).toBe(true);
  });

  it("rejects a cast aimed outside the cone template", () => {
    let session = { state: createInitialState(coneFightConfig()), nextSeq: 1 };
    session = dispatch(
      session,
      {
        kind: "CastConeSpell",
        actionId: "act_cone_far",
        actorId: "ent_wizard_01",
        spellId: "breathe_fire",
        targetX: 10,
        targetY: 5, // 8 tiles away — beyond the 3-tile cone
      },
      scriptedRng([1, 1], [10, 10]),
    );

    expect(session.state.eventLog).toHaveLength(0);
    expect(session.state.entities["ent_wizard_01"]!.actionPoints).toBe(3);
  });

  it("rejects the cast when no Breathe Fire slot remains (slot pool present)", () => {
    const config = coneFightConfig();
    config.party[0]!.spellSlots = wizardSlots().map((s) => ({ ...s, expended: true }));
    let session = { state: createInitialState(config), nextSeq: 1 };

    session = dispatch(
      session,
      {
        kind: "CastConeSpell",
        actionId: "act_cone_dry",
        actorId: "ent_wizard_01",
        spellId: "breathe_fire",
        targetX: 4,
        targetY: 6,
      },
      scriptedRng([1, 1], [10, 10]),
    );

    expect(session.state.eventLog).toHaveLength(0);
  });

  it("casts unrestricted when the entity has no spellSlots pool (opt-in enforcement)", () => {
    const config = coneFightConfig();
    delete config.party[0]!.spellSlots;
    let session = { state: createInitialState(config), nextSeq: 1 };

    session = dispatch(
      session,
      {
        kind: "CastConeSpell",
        actionId: "act_cone_free",
        actorId: "ent_wizard_01",
        spellId: "breathe_fire",
        targetX: 5,
        targetY: 5,
      },
      scriptedRng([4, 3], [19, 5]),
    );

    expect(session.state.eventLog.some((e) => e.type === "DamageDealt")).toBe(true);
    expect(session.state.eventLog.some((e) => e.type === "SpellSlotSpent")).toBe(false);
  });

  it("every effect produced exactly one event, and replay reconstructs the final state", () => {
    const initial = createInitialState(coneFightConfig());
    let session = { state: initial, nextSeq: 1 };
    session = dispatch(
      session,
      {
        kind: "CastConeSpell",
        actionId: "act_cone_replay",
        actorId: "ent_wizard_01",
        spellId: "breathe_fire",
        targetX: 5,
        targetY: 5,
      },
      scriptedRng([4, 3], [19, 5]),
    );

    // seq is monotonic and gap-free — one event per applied effect
    const seqs = session.state.eventLog.map((e) => e.seq);
    expect(seqs).toEqual(seqs.map((_, i) => i + 1));

    const { state: replayed } = replayEvents(initial, session.state.eventLog);
    expect(replayed.entities).toEqual(session.state.entities);
    expect(replayed.combat).toEqual(session.state.combat);
  });
});
