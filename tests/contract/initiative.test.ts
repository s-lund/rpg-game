/**
 * M10 contract — rolled initiative (rules/srd/initiative.md): turnOrder is
 * the ranked Perception rolls, deterministic from the seed, stored on the
 * initial state, and a full fight replays identically from the event log.
 */
import { describe, expect, it } from "vitest";
import {
  createInitialState,
  createSeededRng,
  dispatch,
  replayEvents,
  type InitialStateConfig,
  type Rng,
} from "../../src/core/index";
import type { EntityId } from "../../src/shared/ids";

function config(): InitialStateConfig {
  return {
    width: 8,
    height: 8,
    party: [
      { id: "ent_fighter_01" as EntityId, label: "Fighter", x: 1, y: 1, maxHp: 20, ac: 18, initiativeModifier: 6 },
      { id: "ent_rogue_01" as EntityId, label: "Rogue", x: 2, y: 1, maxHp: 16, ac: 16, initiativeModifier: 7 },
    ],
    enemies: [
      { id: "ent_goblin_01" as EntityId, label: "Goblin", x: 5, y: 5, maxHp: 6, ac: 16, initiativeModifier: 3 },
      { id: "ent_goblin_02" as EntityId, label: "Goblin 2", x: 6, y: 5, maxHp: 6, ac: 16, initiativeModifier: 3 },
    ],
  };
}

describe("initiative contract", () => {
  it("is deterministic from the seed: same seed → same order and rolls", () => {
    const a = createInitialState({ ...config(), rng: createSeededRng(42) });
    const b = createInitialState({ ...config(), rng: createSeededRng(42) });
    expect(a.combat.turnOrder).toEqual(b.combat.turnOrder);
    expect(a.combat.initiative).toEqual(b.combat.initiative);
  });

  it("ranks by total descending and stores d20 + modifier per entity", () => {
    const state = createInitialState({ ...config(), rng: createSeededRng(7) });
    const initiative = state.combat.initiative!;
    expect(Object.keys(initiative)).toHaveLength(4);

    for (const [id, roll] of Object.entries(initiative)) {
      expect(roll.total).toBe(roll.d20 + roll.modifier);
      expect(roll.d20).toBeGreaterThanOrEqual(1);
      expect(roll.d20).toBeLessThanOrEqual(20);
      expect(state.combat.turnOrder).toContain(id);
    }

    const totals = state.combat.turnOrder.map((id) => initiative[id]!.total);
    for (let i = 1; i < totals.length; i++) {
      expect(totals[i - 1]!).toBeGreaterThanOrEqual(totals[i]!);
    }
  });

  it("breaks PC-vs-enemy ties in the enemy's favor (SRD), same team by slot order", () => {
    // Every d20 roll is 10 → fighter 16, rogue 17, goblins 13/13.
    const allTens: Rng = { d20: () => 10, integer: (min) => min };
    const state = createInitialState({ ...config(), rng: allTens });
    expect(state.combat.turnOrder).toEqual([
      "ent_rogue_01",
      "ent_fighter_01",
      "ent_goblin_01",
      "ent_goblin_02",
    ]);

    // Force a cross-team tie: equal modifiers everywhere → all totals equal;
    // enemies act first, each side keeping its slot order.
    const tiedConfig = config();
    for (const b of [...tiedConfig.party, ...tiedConfig.enemies]) b.initiativeModifier = 5;
    const tied = createInitialState({ ...tiedConfig, rng: allTens });
    expect(tied.combat.turnOrder).toEqual([
      "ent_goblin_01",
      "ent_goblin_02",
      "ent_fighter_01",
      "ent_rogue_01",
    ]);
    expect(tied.combat.activeActorId).toBe("ent_goblin_01");
  });

  it("without an rng, keeps the legacy party-then-enemies order (frozen tests)", () => {
    const state = createInitialState(config());
    expect(state.combat.turnOrder).toEqual([
      "ent_fighter_01",
      "ent_rogue_01",
      "ent_goblin_01",
      "ent_goblin_02",
    ]);
    expect(state.combat.initiative).toBeUndefined();
  });

  it("a fight on rolled initiative replays identically from the event log", () => {
    const initial = createInitialState({ ...config(), rng: createSeededRng(99) });
    let session = { state: initial, nextSeq: 1 };
    const firstActor = session.state.combat.activeActorId!;

    session = dispatch(
      session,
      { kind: "EndTurn", actionId: "act_end_1", actorId: firstActor },
      createSeededRng(1),
    );
    const secondActor = session.state.combat.activeActorId!;
    expect(secondActor).toBe(session.state.combat.turnOrder[1]);
    session = dispatch(
      session,
      { kind: "EndTurn", actionId: "act_end_2", actorId: secondActor },
      createSeededRng(2),
    );

    // Replay starts from a freshly-rebuilt initial state (same seed).
    const rebuilt = createInitialState({ ...config(), rng: createSeededRng(99) });
    const { state: replayed } = replayEvents(rebuilt, session.state.eventLog);
    expect(replayed.entities).toEqual(session.state.entities);
    expect(replayed.combat).toEqual(session.state.combat);
  });
});
