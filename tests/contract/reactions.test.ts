/**
 * M10 contract — Reactive Strike / Attack of Opportunity
 * (rules/srd/reactive-strike.md; HOUSE RULE: every melee-armed combatant
 * threatens, one reaction per round). Reactions resolve as normal pipeline
 * effects inside the triggering Step's resolution — no side-channel mutation.
 */
import { describe, expect, it } from "vitest";
import {
  createInitialState,
  dispatch,
  replayEvents,
  type GameEvent,
  type InitialStateConfig,
  type Rng,
} from "../../src/core/index";
import type { EntityId } from "../../src/shared/ids";

function fixedRng(d20Values: number[], integerValue = 3): Rng {
  let i = 0;
  return {
    d20: () => d20Values[Math.min(i++, d20Values.length - 1)]!,
    integer: () => integerValue,
  };
}

/** Fighter starts adjacent to a melee goblin; open 10x6 field. */
function duelConfig(): InitialStateConfig {
  return {
    width: 10,
    height: 6,
    party: [
      { id: "ent_fighter_01" as EntityId, label: "Fighter", x: 2, y: 2, maxHp: 20, ac: 18 },
    ],
    enemies: [
      {
        id: "ent_goblin_01" as EntityId,
        label: "Goblin",
        x: 3,
        y: 2,
        maxHp: 12,
        ac: 14,
        attackBonus: 6,
        damage: { count: 1, sides: 6, modifier: 2 },
        strikeRange: 1,
      },
    ],
  };
}

function aooEvents(log: GameEvent[]): GameEvent[] {
  return log.filter(
    (e) =>
      e.type === "DamageDealt" &&
      (e.payload.attack_resolution as { reactionBy?: unknown } | undefined)?.reactionBy,
  );
}

describe("Reactive Strike contract", () => {
  it("leaving a melee enemy's reach provokes: reaction spent, strike resolves, move completes", () => {
    let session = { state: createInitialState(duelConfig()), nextSeq: 1 };
    // Fighter walks away: (2,2) → (0,2). Leaves goblin reach after the first step.
    session = dispatch(
      session,
      { kind: "Step", actionId: "act_flee", actorId: "ent_fighter_01", x: 0, y: 2 },
      fixedRng([15], 3), // goblin AoO: 15+6=21 vs AC 18 → hit, 3+2=5 damage
    );

    const fighter = session.state.entities["ent_fighter_01"]!;
    expect(fighter.x).toBe(0); // move not disrupted (RAW)
    expect(fighter.hp).toBe(15);

    const goblin = session.state.entities["ent_goblin_01"]!;
    expect(goblin.reactionAvailable).toBe(false);
    expect(session.state.eventLog.some((e) => e.type === "ReactionSpent")).toBe(true);

    const aoo = aooEvents(session.state.eventLog);
    expect(aoo).toHaveLength(1);
    const resolution = aoo[0]!.payload.attack_resolution as {
      reactionBy: { reactorId: string; reactorLabel: string };
    };
    expect(resolution.reactionBy.reactorId).toBe("ent_goblin_01");
  });

  it("no reaction when the mover never leaves reach", () => {
    let session = { state: createInitialState(duelConfig()), nextSeq: 1 };
    // Flee out of reach first: (2,2) → (0,2) provokes once (miss, d20 2).
    session = dispatch(
      session,
      { kind: "Step", actionId: "act_pre", actorId: "ent_fighter_01", x: 0, y: 2 },
      fixedRng([2], 3),
    );
    expect(session.state.entities["ent_fighter_01"]!.hp).toBe(20);
    expect(session.state.entities["ent_goblin_01"]!.reactionAvailable).toBe(false);

    // Reaction returns at the goblin's turn start.
    session = dispatch(session, { kind: "EndTurn", actionId: "act_end_f", actorId: "ent_fighter_01" });
    session = dispatch(session, { kind: "EndTurn", actionId: "act_end_g", actorId: "ent_goblin_01" });

    // Fighter at (0,2), goblin at (3,2): moving (0,2)→(0,0) never enters or
    // leaves the goblin's reach — no reaction, no events beyond AP+Move.
    const logBefore = session.state.eventLog.length;
    session = dispatch(
      session,
      { kind: "Step", actionId: "act_safe", actorId: "ent_fighter_01", x: 0, y: 0 },
      fixedRng([20], 6),
    );
    const newEvents = session.state.eventLog.slice(logBefore);
    expect(newEvents.map((e) => e.type)).toEqual(["ActionPointsSpent", "Moved"]);
    expect(session.state.entities["ent_goblin_01"]!.reactionAvailable).toBe(true);
  });

  it("one reaction per round: spent on the first provoke, back after the reactor's turn starts", () => {
    let session = { state: createInitialState(duelConfig()), nextSeq: 1 };
    session = dispatch(
      session,
      { kind: "Step", actionId: "act_flee1", actorId: "ent_fighter_01", x: 1, y: 2 },
      fixedRng([2], 3), // miss
    );
    expect(session.state.entities["ent_goblin_01"]!.reactionAvailable).toBe(false);

    // Move back adjacent and away again in the same turn: no second reaction.
    session = dispatch(
      session,
      { kind: "Step", actionId: "act_back", actorId: "ent_fighter_01", x: 2, y: 2 },
      fixedRng([20], 6),
    );
    const logBefore = session.state.eventLog.length;
    session = dispatch(
      session,
      { kind: "Step", actionId: "act_flee2", actorId: "ent_fighter_01", x: 1, y: 2 },
      fixedRng([20], 6),
    );
    const newEvents = session.state.eventLog.slice(logBefore);
    expect(newEvents.filter((e) => e.type === "ReactionSpent")).toHaveLength(0);

    // After the goblin's turn starts, its reaction is back.
    session = dispatch(session, { kind: "EndTurn", actionId: "act_end_f", actorId: "ent_fighter_01" });
    expect(session.state.entities["ent_goblin_01"]!.reactionAvailable).toBe(true);
  });

  it("a downed reactor cannot react", () => {
    const config = duelConfig();
    config.enemies[0]!.currentHp = 0; // goblin starts downed
    config.enemies.push({
      id: "ent_goblin_02" as EntityId,
      label: "Goblin 2",
      x: 8,
      y: 5,
      maxHp: 12,
      ac: 14,
      strikeRange: 1,
    });
    let session = { state: createInitialState(config), nextSeq: 1 };
    session = dispatch(
      session,
      { kind: "Step", actionId: "act_flee", actorId: "ent_fighter_01", x: 0, y: 2 },
      fixedRng([20], 6),
    );
    expect(session.state.eventLog.filter((e) => e.type === "ReactionSpent")).toHaveLength(0);
    expect(session.state.entities["ent_fighter_01"]!.hp).toBe(20);
  });

  it("ranged combatants (no melee weapon) never react", () => {
    const config = duelConfig();
    config.enemies[0]!.strikeRange = 6; // archer
    let session = { state: createInitialState(config), nextSeq: 1 };
    session = dispatch(
      session,
      { kind: "Step", actionId: "act_flee", actorId: "ent_fighter_01", x: 0, y: 2 },
      fixedRng([20], 6),
    );
    expect(session.state.eventLog.filter((e) => e.type === "ReactionSpent")).toHaveLength(0);
  });

  it("an AoO can down the mover, who stops at the square where it triggered", () => {
    const config = duelConfig();
    config.party[0]!.currentHp = 3;
    let session = { state: createInitialState(config), nextSeq: 1 };
    session = dispatch(
      session,
      { kind: "Step", actionId: "act_flee", actorId: "ent_fighter_01", x: 0, y: 2 },
      fixedRng([15], 3), // hit for 5 ≥ 3 hp → downed
    );

    const fighter = session.state.entities["ent_fighter_01"]!;
    expect(fighter.downed).toBe(true);
    // The trigger square is the start (2,2): the first step to (1,2) left reach.
    expect({ x: fighter.x, y: fighter.y }).toEqual({ x: 2, y: 2 });
    expect(session.state.eventLog.some((e) => e.type === "EntityDowned")).toBe(true);
    // Combat ended in defeat via the normal post-action check.
    expect(session.state.combat.phase).toBe("defeat");
  });

  it("two melee reactors on one path each fire exactly once", () => {
    const config = duelConfig();
    config.enemies.push({
      id: "ent_goblin_02" as EntityId,
      label: "Goblin 2",
      x: 1,
      y: 3,
      maxHp: 12,
      ac: 14,
      attackBonus: 6,
      damage: { count: 1, sides: 6, modifier: 2 },
      strikeRange: 1,
    });
    let session = { state: createInitialState(config), nextSeq: 1 };
    // (2,2) → (1,2) → (1,3)? That ENTERS goblin2's reach... walk (2,2)→(1,2)→(0,2):
    // leaves goblin1's reach at (2,2)→(1,2) and goblin2's reach at (1,2)→(0,2)
    // ((1,2) is adjacent to (1,3), (0,2) is not).
    session = dispatch(
      session,
      { kind: "Step", actionId: "act_flee", actorId: "ent_fighter_01", x: 0, y: 2 },
      fixedRng([15, 15], 1), // both hit for 1+2=3
    );

    const aoo = aooEvents(session.state.eventLog);
    expect(aoo).toHaveLength(2);
    const reactors = aoo.map(
      (e) => (e.payload.attack_resolution as { reactionBy: { reactorId: string } }).reactionBy.reactorId,
    );
    expect(new Set(reactors)).toEqual(new Set(["ent_goblin_01", "ent_goblin_02"]));
    expect(session.state.entities["ent_fighter_01"]!.hp).toBe(20 - 6);
    expect(session.state.eventLog.filter((e) => e.type === "ReactionSpent")).toHaveLength(2);
  });

  it("a Step with reactions replays identically from the event log", () => {
    let session = { state: createInitialState(duelConfig()), nextSeq: 1 };
    session = dispatch(
      session,
      { kind: "Step", actionId: "act_flee", actorId: "ent_fighter_01", x: 0, y: 2 },
      fixedRng([15], 3),
    );
    session = dispatch(session, { kind: "EndTurn", actionId: "act_end_f", actorId: "ent_fighter_01" });

    const { state: replayed } = replayEvents(createInitialState(duelConfig()), session.state.eventLog);
    expect(replayed.entities).toEqual(session.state.entities);
    expect(replayed.combat).toEqual(session.state.combat);
  });
});
