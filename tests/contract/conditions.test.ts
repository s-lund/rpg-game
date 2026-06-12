/**
 * M10 contract — condition framework (rules/srd/conditions-m10.md).
 * Each condition: onset, mechanical effect, expiry. The extended
 * ApplyCondition fields and the post-freeze TickCondition kind keep the
 * one-effect-one-event and replay guarantees.
 */
import { describe, expect, it } from "vitest";
import {
  apply,
  applyAll,
  createInitialState,
  dispatch,
  effectiveAc,
  replayEvents,
  turnStartActions,
  type AnyEffect,
  type GameState,
  type InitialStateConfig,
  type Rng,
} from "../../src/core/index";
import type { EntityId } from "../../src/shared/ids";

function fixedRng(d20Values: number[], integerValue = 2): Rng {
  let i = 0;
  return {
    d20: () => d20Values[Math.min(i++, d20Values.length - 1)]!,
    integer: () => integerValue,
  };
}

function baseConfig(): InitialStateConfig {
  return {
    width: 8,
    height: 8,
    party: [
      { id: "ent_fighter_01" as EntityId, label: "Fighter", x: 1, y: 1, maxHp: 20, ac: 18 },
    ],
    enemies: [
      { id: "ent_goblin_01" as EntityId, label: "Goblin", x: 5, y: 5, maxHp: 30, ac: 16 },
    ],
  };
}

function withCondition(
  state: GameState,
  effect: AnyEffect,
): GameState {
  const result = apply(effect, state, {
    seq: state.eventLog.length + 1,
    turn: 1,
    actorId: "ent_fighter_01",
    actionId: "act_test_setup",
  });
  return result.state;
}

describe("M10 condition framework contract", () => {
  it("extended ApplyCondition: one effect → one event, value carried, replay reconstructs", () => {
    const initial = createInitialState(baseConfig());
    const effect: AnyEffect = {
      kind: "ApplyCondition",
      effectId: "eff_fright",
      targetId: "ent_goblin_01",
      condition: "frightened",
      value: 2,
    };
    const result = apply(effect, initial, { seq: 1, turn: 1, actorId: "ent_fighter_01", actionId: "act_t" });

    expect(result.events).toHaveLength(1);
    expect(result.events[0]!.type).toBe("ConditionApplied");
    expect(result.events[0]!.payload.value).toBe(2);

    const goblin = result.state.entities["ent_goblin_01"]!;
    expect(goblin.conditions).toContain("frightened");
    expect(goblin.activeConditions).toEqual([{ id: "frightened", value: 2 }]);

    const { state: replayed } = replayEvents(createInitialState(baseConfig()), result.state.eventLog);
    expect(replayed.entities).toEqual(result.state.entities);
  });

  it("TickCondition: one effect → one event, decrements value, removes at 0, replays", () => {
    let state = createInitialState(baseConfig());
    state = withCondition(state, {
      kind: "ApplyCondition",
      effectId: "eff_fright",
      targetId: "ent_goblin_01",
      condition: "frightened",
      value: 2,
    });

    const tick: AnyEffect = {
      kind: "TickCondition",
      effectId: "eff_tick",
      targetId: "ent_goblin_01",
      condition: "frightened",
      amount: 1,
    };
    const once = apply(tick, state, { seq: 2, turn: 1, actorId: "ent_fighter_01", actionId: "act_t" });
    expect(once.events).toHaveLength(1);
    expect(once.events[0]!.type).toBe("ConditionTicked");
    expect(once.events[0]!.payload.value_after).toBe(1);
    expect(once.state.entities["ent_goblin_01"]!.activeConditions).toEqual([
      { id: "frightened", value: 1 },
    ]);

    const twice = apply({ ...tick, effectId: "eff_tick2" }, once.state, {
      seq: 3,
      turn: 1,
      actorId: "ent_fighter_01",
      actionId: "act_t",
    });
    expect(twice.state.entities["ent_goblin_01"]!.conditions).not.toContain("frightened");
    expect(twice.state.entities["ent_goblin_01"]!.activeConditions).toEqual([]);

    const { state: replayed } = replayEvents(createInitialState(baseConfig()), twice.state.eventLog);
    expect(replayed.entities).toEqual(twice.state.entities);
  });

  it("redundant conditions keep the higher value and never stack", () => {
    let state = createInitialState(baseConfig());
    state = withCondition(state, {
      kind: "ApplyCondition", effectId: "e1", targetId: "ent_goblin_01", condition: "frightened", value: 1,
    });
    state = withCondition(state, {
      kind: "ApplyCondition", effectId: "e2", targetId: "ent_goblin_01", condition: "frightened", value: 3,
    });
    state = withCondition(state, {
      kind: "ApplyCondition", effectId: "e3", targetId: "ent_goblin_01", condition: "frightened", value: 2,
    });
    expect(state.entities["ent_goblin_01"]!.activeConditions).toEqual([
      { id: "frightened", value: 3 },
    ]);
  });

  it("frightened: penalty to attack rolls and AC, decrements at end of own turn, expires", () => {
    let session = { state: createInitialState(baseConfig()), nextSeq: 1 };
    session = {
      state: withCondition(session.state, {
        kind: "ApplyCondition", effectId: "e1", targetId: "ent_fighter_01", condition: "frightened", value: 2,
      }),
      nextSeq: 2,
    };

    // AC: frightened lowers all DCs, AC included.
    expect(effectiveAc(session.state, "ent_fighter_01")).toBe(18 - 2);

    // Attack: the fighter's roll carries the −2 status penalty.
    session = {
      state: withCondition(session.state, {
        kind: "MoveTo", effectId: "e_mv", entityId: "ent_fighter_01", x: 4, y: 5,
      }),
      nextSeq: 3,
    };
    const beforeAttack = session.state.entities["ent_fighter_01"]!;
    session = dispatch(session, {
      kind: "Strike", actionId: "act_strike", actorId: "ent_fighter_01", targetId: "ent_goblin_01",
    }, fixedRng([10]));
    const dmgEvent = session.state.eventLog.find((e) => e.type === "DamageDealt")!;
    const resolution = dmgEvent.payload.attack_resolution as { attackBonus: number };
    expect(resolution.attackBonus).toBe(beforeAttack.attackBonus - 2);

    // End of the fighter's turn: frightened 2 → 1; after the next own turn end → gone.
    session = dispatch(session, { kind: "EndTurn", actionId: "act_end1", actorId: "ent_fighter_01" });
    expect(session.state.entities["ent_fighter_01"]!.activeConditions).toEqual([
      { id: "frightened", value: 1 },
    ]);
    session = dispatch(session, { kind: "EndTurn", actionId: "act_end_g", actorId: "ent_goblin_01" });
    session = dispatch(session, { kind: "EndTurn", actionId: "act_end2", actorId: "ent_fighter_01" });
    expect(session.state.entities["ent_fighter_01"]!.conditions).not.toContain("frightened");
  });

  it("prone: off-guard AC, −2 attack penalty, Step rejected, Stand (1 action) ends it", () => {
    let session = { state: createInitialState(baseConfig()), nextSeq: 1 };
    session = {
      state: withCondition(session.state, {
        kind: "ApplyCondition", effectId: "e1", targetId: "ent_fighter_01", condition: "prone",
      }),
      nextSeq: 2,
    };

    // Off-guard: −2 circumstance to AC while prone.
    expect(effectiveAc(session.state, "ent_fighter_01")).toBe(18 - 2);

    // Step is rejected while prone.
    session = dispatch(session, {
      kind: "Step", actionId: "act_step", actorId: "ent_fighter_01", x: 2, y: 1,
    });
    expect(session.state.entities["ent_fighter_01"]!.x).toBe(1);

    // Stand costs 1 action and ends prone.
    session = dispatch(session, { kind: "Stand", actionId: "act_stand", actorId: "ent_fighter_01" });
    const fighter = session.state.entities["ent_fighter_01"]!;
    expect(fighter.conditions).not.toContain("prone");
    expect(fighter.actionPoints).toBe(2);

    // Standing again does nothing (no prone to end).
    const before = session.state;
    session = dispatch(session, { kind: "Stand", actionId: "act_stand2", actorId: "ent_fighter_01" });
    expect(session.state).toBe(before);
  });

  it("stunned: reduces actions regained and pays itself down per the SRD accounting", () => {
    let session = { state: createInitialState(baseConfig()), nextSeq: 1 };
    session = {
      state: withCondition(session.state, {
        kind: "ApplyCondition", effectId: "e1", targetId: "ent_goblin_01", condition: "stunned", value: 4,
      }),
      nextSeq: 2,
    };

    // Goblin's turn starts: stunned 4 → regain 0 of 3 actions, stunned drops to 1.
    session = dispatch(session, { kind: "EndTurn", actionId: "act_end_f", actorId: "ent_fighter_01" });
    let goblin = session.state.entities["ent_goblin_01"]!;
    expect(goblin.actionPoints).toBe(0);
    expect(goblin.activeConditions).toEqual([{ id: "stunned", value: 1 }]);

    // Next goblin turn: stunned 1 → lose 1 more action, then stunned ends.
    session = dispatch(session, { kind: "EndTurn", actionId: "act_end_g", actorId: "ent_goblin_01" });
    session = dispatch(session, { kind: "EndTurn", actionId: "act_end_f2", actorId: "ent_fighter_01" });
    goblin = session.state.entities["ent_goblin_01"]!;
    expect(goblin.actionPoints).toBe(2);
    expect(goblin.conditions).not.toContain("stunned");
  });

  it("slowed: reduces actions regained every turn; stunned overrides slowed (SRD example)", () => {
    // SRD example: stunned 1 + slowed 2 at turn start → lose 1 to stunned,
    // only 1 more to slowed → 1 action remaining.
    let session = { state: createInitialState(baseConfig()), nextSeq: 1 };
    const setup = applyAll(
      [
        { kind: "ApplyCondition", effectId: "e1", targetId: "ent_goblin_01", condition: "stunned", value: 1 },
        { kind: "ApplyCondition", effectId: "e2", targetId: "ent_goblin_01", condition: "slowed", value: 2 },
      ],
      session.state,
      { seqStart: 1, turn: 1, actorId: "ent_fighter_01", actionId: "act_setup" },
    );
    session = { state: setup.state, nextSeq: 3 };

    expect(turnStartActions(session.state.entities["ent_goblin_01"]!)).toEqual({
      regained: 1,
      lost: 2,
      stunnedSpent: 1,
    });

    session = dispatch(session, { kind: "EndTurn", actionId: "act_end_f", actorId: "ent_fighter_01" });
    let goblin = session.state.entities["ent_goblin_01"]!;
    expect(goblin.actionPoints).toBe(1);
    expect(goblin.conditions).not.toContain("stunned");
    expect(goblin.activeConditions).toEqual([{ id: "slowed", value: 2 }]);

    // Slowed has no value decay — the next goblin turn loses 2 again.
    session = dispatch(session, { kind: "EndTurn", actionId: "act_end_g", actorId: "ent_goblin_01" });
    session = dispatch(session, { kind: "EndTurn", actionId: "act_end_f2", actorId: "ent_fighter_01" });
    goblin = session.state.entities["ent_goblin_01"]!;
    expect(goblin.actionPoints).toBe(1);
  });

  it("persistent damage: ticks at end of turn through the Damage pipeline, DC 15 flat check ends it", () => {
    let session = { state: createInitialState(baseConfig()), nextSeq: 1 };
    session = {
      state: withCondition(session.state, {
        kind: "ApplyCondition",
        effectId: "e1",
        targetId: "ent_fighter_01",
        condition: "persistent_damage",
        damageType: "fire",
        damage: { count: 1, sides: 4, modifier: 0 },
      }),
      nextSeq: 2,
    };

    // First end of turn: damage dice (integer → 2), flat check 10 < 15 — continues.
    session = dispatch(
      session,
      { kind: "EndTurn", actionId: "act_end1", actorId: "ent_fighter_01" },
      fixedRng([10], 2),
    );
    let fighter = session.state.entities["ent_fighter_01"]!;
    expect(fighter.hp).toBe(18);
    expect(fighter.conditions).toContain("persistent_damage");
    const tickEvent = session.state.eventLog.find(
      (e) => e.type === "DamageDealt" && e.payload.persistent_tick,
    )!;
    expect(tickEvent.payload.amount).toBe(2);
    expect(tickEvent.payload.persistent_tick).toEqual({
      damageType: "fire",
      flatCheckRoll: 10,
      flatCheckDc: 15,
      recovered: false,
    });

    // Back to the fighter; this end of turn the flat check succeeds (15 ≥ 15).
    session = dispatch(session, { kind: "EndTurn", actionId: "act_end_g", actorId: "ent_goblin_01" });
    session = dispatch(
      session,
      { kind: "EndTurn", actionId: "act_end2", actorId: "ent_fighter_01" },
      fixedRng([15], 2),
    );
    fighter = session.state.entities["ent_fighter_01"]!;
    expect(fighter.hp).toBe(16);
    expect(fighter.conditions).not.toContain("persistent_damage");

    // Replay reconstructs the whole run (rng outcomes live in the events).
    const { state: replayed } = replayEvents(createInitialState(baseConfig()), session.state.eventLog);
    expect(replayed.entities).toEqual(session.state.entities);
    expect(replayed.combat).toEqual(session.state.combat);
  });

  it("persistent damage: different types stack, same type keeps the higher dice", () => {
    let state = createInitialState(baseConfig());
    state = withCondition(state, {
      kind: "ApplyCondition", effectId: "e1", targetId: "ent_fighter_01",
      condition: "persistent_damage", damageType: "fire", damage: { count: 1, sides: 4, modifier: 0 },
    });
    state = withCondition(state, {
      kind: "ApplyCondition", effectId: "e2", targetId: "ent_fighter_01",
      condition: "persistent_damage", damageType: "cold", damage: { count: 1, sides: 4, modifier: 0 },
    });
    state = withCondition(state, {
      kind: "ApplyCondition", effectId: "e3", targetId: "ent_fighter_01",
      condition: "persistent_damage", damageType: "fire", damage: { count: 2, sides: 6, modifier: 0 },
    });
    state = withCondition(state, {
      kind: "ApplyCondition", effectId: "e4", targetId: "ent_fighter_01",
      condition: "persistent_damage", damageType: "fire", damage: { count: 1, sides: 4, modifier: 0 },
    });

    const fighter = state.entities["ent_fighter_01"]!;
    expect(fighter.activeConditions).toEqual([
      { id: "persistent_damage", damageType: "fire", damage: { count: 2, sides: 6, modifier: 0 } },
      { id: "persistent_damage", damageType: "cold", damage: { count: 1, sides: 4, modifier: 0 } },
    ]);
    expect(fighter.conditions).toEqual(["persistent_damage"]);
  });

  it("persistent damage tick rides M9 weakness/resistance adjustment", () => {
    const config = baseConfig();
    config.party[0]!.resistances = { fire: 3 };
    let session = { state: createInitialState(config), nextSeq: 1 };
    session = {
      state: withCondition(session.state, {
        kind: "ApplyCondition", effectId: "e1", targetId: "ent_fighter_01",
        condition: "persistent_damage", damageType: "fire", damage: { count: 1, sides: 4, modifier: 0 },
      }),
      nextSeq: 2,
    };

    session = dispatch(
      session,
      { kind: "EndTurn", actionId: "act_end1", actorId: "ent_fighter_01" },
      fixedRng([10], 2),
    );
    // 2 rolled − 3 resistance → 0 damage taken.
    expect(session.state.entities["ent_fighter_01"]!.hp).toBe(20);
    const tickEvent = session.state.eventLog.find(
      (e) => e.type === "DamageDealt" && e.payload.persistent_tick,
    )!;
    expect(tickEvent.payload.amount).toBe(0);
  });

  it("flat_footed behavior is unchanged (frozen M1 shape): bare apply and remove", () => {
    let state = createInitialState(baseConfig());
    state = withCondition(state, {
      kind: "ApplyCondition", effectId: "e1", targetId: "ent_goblin_01", condition: "flat_footed",
    });
    expect(state.entities["ent_goblin_01"]!.conditions).toEqual(["flat_footed"]);
    expect(effectiveAc(state, "ent_goblin_01")).toBe(16 - 2);

    state = withCondition(state, {
      kind: "RemoveCondition", effectId: "e2", targetId: "ent_goblin_01", condition: "flat_footed",
    });
    expect(state.entities["ent_goblin_01"]!.conditions).toEqual([]);
    expect(effectiveAc(state, "ent_goblin_01")).toBe(16);
  });
});
