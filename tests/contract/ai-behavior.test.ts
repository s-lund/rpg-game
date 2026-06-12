/**
 * M12 contract — tactical AI behavior properties (the punishing baseline,
 * decisions resolved 2026-06-12 under M12 in ROADMAP.md). These pin BEHAVIOR,
 * not weights: retuning src/core/ai/profile.ts is allowed only while every
 * property here stays green.
 *
 * Properties frozen here:
 *  - never targets without line of effect
 *  - steps out of reach before shooting when AP allows (AoO economy)
 *  - finishes a kill over spreading damage
 *  - focuses lowest effective HP
 *  - moves toward unreachable targets instead of idling
 *  - prefers a cover tile over an open tile when both reach the same shot
 *  - never assumes more AP than the entity has (slowed entity)
 *  - every enumerated candidate is legal (dry-resolves to effects)
 *  - deterministic: pure function of state; an AI-vs-AI fight replays
 *    identically from the event log with no AI events
 */
import { describe, expect, it } from "vitest";
import {
  chooseAiAction,
  chooseEnemyAction,
  createInitialState,
  createSeededRng,
  dispatch,
  enumerateAiCandidates,
  evaluateCover,
  replayEvents,
  resolveAction,
  type InitialStateConfig,
  type Rng,
} from "../../src/core/index";
import type { EntityId } from "../../src/shared/ids";

function fixedRng(d20 = 10, integer = 3): Rng {
  return { d20: () => d20, integer: () => integer };
}

/**
 * Map rows → InitialStateConfig terrain (the los-cover.test.ts helper
 * pattern): "." floor · "#" wall · "c" raised prop. Entities are placed via
 * the config, not the grid.
 */
function terrain(rows: string[]): Pick<InitialStateConfig, "width" | "height" | "blockedTiles" | "coverTiles"> {
  const blockedTiles: { x: number; y: number }[] = [];
  const coverTiles: { x: number; y: number; kind: "wall" | "raised" }[] = [];
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === "#") {
        blockedTiles.push({ x, y });
        coverTiles.push({ x, y, kind: "wall" });
      } else if (ch === "c") {
        blockedTiles.push({ x, y });
        coverTiles.push({ x, y, kind: "raised" });
      }
    });
  });
  return { width: rows[0]!.length, height: rows.length, blockedTiles, coverTiles };
}

function enemyActs(config: InitialStateConfig, enemyId: string) {
  const state = createInitialState(config);
  state.combat.activeActorId = enemyId as EntityId;
  return state;
}

const archer = (id: string, x: number, y: number, over: Record<string, unknown> = {}) => ({
  id: id as EntityId,
  label: id,
  x,
  y,
  maxHp: 14,
  ac: 14,
  attackBonus: 7,
  strikeRange: 6,
  damage: { count: 1, sides: 6, modifier: 1 },
  ...over,
});

const bruiser = (id: string, x: number, y: number, over: Record<string, unknown> = {}) => ({
  id: id as EntityId,
  label: id,
  x,
  y,
  maxHp: 16,
  ac: 14,
  attackBonus: 8,
  strikeRange: 1,
  damage: { count: 1, sides: 6, modifier: 2 },
  ...over,
});

const hero = (id: string, x: number, y: number, over: Record<string, unknown> = {}) => ({
  id: id as EntityId,
  label: id,
  x,
  y,
  maxHp: 20,
  ac: 16,
  attackBonus: 8,
  strikeRange: 1,
  damage: { count: 1, sides: 8, modifier: 4 },
  ...over,
});

describe("AI behavior — line of effect", () => {
  it("never targets through a wall: no strike candidate exists, and the turn is not idled away", () => {
    const config: InitialStateConfig = {
      ...terrain([
        ".........",
        "....#....",
        ".........",
      ]),
      party: [hero("ent_hidden", 8, 1)],
      enemies: [archer("ent_sniper", 0, 1)],
    };
    const state = enemyActs(config, "ent_sniper");

    const candidates = enumerateAiCandidates(state, "ent_sniper" as EntityId);
    expect(candidates.some((c) => c.action.kind === "Strike")).toBe(false);

    const action = chooseEnemyAction(state, "ent_sniper" as EntityId);
    expect(action?.kind).toBe("Step"); // flank the wall, don't idle
  });
});

describe("AI behavior — AoO economy", () => {
  it("steps out of reach before shooting when AP allows, then takes the clean shot", () => {
    const config: InitialStateConfig = {
      width: 10,
      height: 6,
      party: [hero("ent_fighter", 2, 2)],
      enemies: [archer("ent_skirm", 3, 2)],
    };
    const state = enemyActs(config, "ent_skirm");

    const first = chooseEnemyAction(state, "ent_skirm" as EntityId);
    expect(first?.kind).toBe("Step");
    if (first?.kind !== "Step") return;
    // The destination is out of the fighter's melee reach.
    expect(Math.abs(first.x - 2) + Math.abs(first.y - 2)).toBeGreaterThan(1);

    // After the (provoking) disengage, the follow-up is the shot.
    let session = { state, nextSeq: 1 };
    session = dispatch(session, first, fixedRng(2, 3)); // AoO misses
    const second = chooseEnemyAction(session.state, "ent_skirm" as EntityId);
    expect(second?.kind).toBe("Strike");
  });
});

describe("AI behavior — target selection", () => {
  it("finishes a kill over spreading damage onto an easier-to-hit target", () => {
    const config: InitialStateConfig = {
      width: 10,
      height: 6,
      party: [
        hero("ent_wounded", 5, 1, { maxHp: 20, currentHp: 3, ac: 16 }),
        hero("ent_soft", 5, 3, { maxHp: 20, ac: 12 }),
      ],
      enemies: [archer("ent_sniper", 2, 2, { attackBonus: 8, damage: { count: 1, sides: 6, modifier: 2 } })],
    };
    const state = enemyActs(config, "ent_sniper");

    const action = chooseEnemyAction(state, "ent_sniper" as EntityId);
    expect(action?.kind).toBe("Strike");
    if (action?.kind === "Strike") {
      expect(action.targetId).toBe("ent_wounded");
    }
  });

  it("focuses the lowest effective HP among otherwise equal targets", () => {
    const config: InitialStateConfig = {
      width: 10,
      height: 6,
      party: [
        hero("ent_full", 5, 1, { maxHp: 18 }),
        hero("ent_low", 5, 3, { maxHp: 18, currentHp: 6 }),
      ],
      enemies: [archer("ent_sniper", 2, 2, { attackBonus: 8, damage: { count: 1, sides: 6, modifier: 2 } })],
    };
    const state = enemyActs(config, "ent_sniper");

    const action = chooseEnemyAction(state, "ent_sniper" as EntityId);
    expect(action?.kind).toBe("Strike");
    if (action?.kind === "Strike") {
      expect(action.targetId).toBe("ent_low");
    }
  });
});

describe("AI behavior — movement", () => {
  it("moves toward an unreachable target instead of idling", () => {
    const config: InitialStateConfig = {
      width: 14,
      height: 3,
      party: [hero("ent_far", 12, 1)],
      enemies: [bruiser("ent_brute", 1, 1)],
    };
    const state = enemyActs(config, "ent_brute");

    const action = chooseEnemyAction(state, "ent_brute" as EntityId);
    expect(action?.kind).toBe("Step");
    if (action?.kind === "Step") {
      // Full AP spent closing the gap on an open lane.
      expect(Math.abs(action.x - 12) + Math.abs(action.y - 1)).toBe(8);
    }
  });

  it("prefers a cover tile over an open tile when both reach the same shot", () => {
    const config: InitialStateConfig = {
      ...terrain([
        ".......",
        ".......",
        "...c...",
        ".......",
        ".......",
      ]),
      // The hero is a ranged threat at (0,2); the prop at (3,2) shadows the
      // tiles east of it on that row.
      party: [hero("ent_archer", 0, 2, { strikeRange: 6, damage: { count: 1, sides: 6, modifier: 2 } })],
      enemies: [archer("ent_skirm", 5, 3)],
    };
    const state = enemyActs(config, "ent_skirm");

    const action = chooseEnemyAction(state, "ent_skirm" as EntityId);
    expect(action?.kind).toBe("Step");
    if (action?.kind !== "Step") return;
    // The chosen tile has standard cover against the hero's sightline.
    const cover = evaluateCover(state.map, { x: 0, y: 2 }, { x: action.x, y: action.y });
    expect(cover.tier).toBe("standard");
    // And the shot is still on: after stepping, the AI shoots.
    let session = { state, nextSeq: 1 };
    session = dispatch(session, action, fixedRng(2, 3));
    expect(chooseEnemyAction(session.state, "ent_skirm" as EntityId)?.kind).toBe("Strike");
  });
});

describe("AI behavior — action economy", () => {
  it("never assumes more AP than the entity has: a slowed entity plans within 1 action", () => {
    const config: InitialStateConfig = {
      width: 10,
      height: 3,
      party: [hero("ent_far", 8, 1)],
      enemies: [bruiser("ent_slowpoke", 2, 1)],
    };
    const state = enemyActs(config, "ent_slowpoke");
    const slow = state.entities["ent_slowpoke" as EntityId]!;
    slow.actionPoints = 1; // slowed 2 at turn start
    slow.conditions.push("slowed");
    slow.activeConditions.push({ id: "slowed", value: 2 });

    for (const candidate of enumerateAiCandidates(state, "ent_slowpoke" as EntityId)) {
      if (candidate.action.kind === "Step") {
        // 1 AP buys exactly one tile.
        expect(
          Math.abs(candidate.action.x - 2) + Math.abs(candidate.action.y - 1),
        ).toBeLessThanOrEqual(1);
      }
    }

    const action = chooseEnemyAction(state, "ent_slowpoke" as EntityId);
    expect(action).not.toBeNull();
    const resolved = resolveAction(action!, state, fixedRng());
    expect(resolved.effects.length).toBeGreaterThan(0);
  });

  it("every enumerated candidate is legal — each dry-resolves to a non-empty effect list", () => {
    const scenarios: { config: InitialStateConfig; actorId: string }[] = [
      // Melee approach with blocked terrain.
      {
        config: {
          ...terrain(["........", "...#....", "........"]),
          party: [hero("ent_a", 6, 1)],
          enemies: [bruiser("ent_b", 1, 1)],
        },
        actorId: "ent_b",
      },
      // Ranged duel in reach (AoO pricing on the table).
      {
        config: {
          width: 8,
          height: 4,
          party: [hero("ent_a", 2, 2)],
          enemies: [archer("ent_b", 3, 2)],
        },
        actorId: "ent_b",
      },
      // Enemy caster: attack spell + cone + friendly fire in play.
      {
        config: {
          width: 8,
          height: 5,
          party: [hero("ent_a", 4, 2), hero("ent_c", 5, 2, { currentHp: 5 })],
          enemies: [
            archer("ent_b", 2, 2, {
              strikeRange: 1,
              spellAttackBonus: 7,
              spellDc: 17,
              knownSpells: ["ray_of_frost", "breathe_fire"],
            }),
            bruiser("ent_d", 3, 2),
          ],
        },
        actorId: "ent_b",
      },
      // Prone actor in reach: Stand vs fight from the ground.
      {
        config: {
          width: 8,
          height: 4,
          party: [hero("ent_a", 2, 2)],
          enemies: [bruiser("ent_b", 3, 2)],
        },
        actorId: "ent_b",
      },
    ];
    // Make the last scenario's actor prone.
    const proneState = createInitialState(scenarios[3]!.config);
    proneState.combat.activeActorId = "ent_b" as EntityId;
    proneState.entities["ent_b" as EntityId]!.conditions.push("prone");
    proneState.entities["ent_b" as EntityId]!.activeConditions.push({ id: "prone" });

    const states = scenarios
      .slice(0, 3)
      .map(({ config, actorId }) => enemyActs(config, actorId))
      .concat([proneState]);

    for (const state of states) {
      const actorId = state.combat.activeActorId!;
      const candidates = enumerateAiCandidates(state, actorId);
      expect(candidates.length).toBeGreaterThan(0);
      for (const candidate of candidates) {
        const { effects } = resolveAction(candidate.action, state, fixedRng());
        expect(effects.length, `${candidate.family} ${JSON.stringify(candidate.action)}`).toBeGreaterThan(0);
      }
    }
  });
});

describe("AI behavior — determinism and replay", () => {
  it("is a pure function of state: repeated calls return the identical action", () => {
    const config: InitialStateConfig = {
      width: 10,
      height: 6,
      party: [hero("ent_fighter", 2, 2), hero("ent_archer2", 1, 4, { strikeRange: 6 })],
      enemies: [archer("ent_skirm", 6, 2), bruiser("ent_brute", 7, 3)],
    };
    const state = enemyActs(config, "ent_skirm");

    const first = chooseEnemyAction(state, "ent_skirm" as EntityId);
    for (let i = 0; i < 5; i++) {
      expect(chooseEnemyAction(state, "ent_skirm" as EntityId)).toEqual(first);
    }
  });

  it("a full AI-vs-AI fight finishes and replays identically from the event log (no AI events)", () => {
    const config: InitialStateConfig = {
      width: 8,
      height: 6,
      party: [
        hero("ent_fighter", 1, 2),
        hero("ent_archer2", 1, 4, { strikeRange: 6, damage: { count: 1, sides: 6, modifier: 2 } }),
      ],
      enemies: [bruiser("ent_brute", 6, 2), archer("ent_skirm", 6, 4)],
      rng: createSeededRng(7),
    };

    let session = { state: createInitialState(config), nextSeq: 1 };
    const diceRng = createSeededRng(42);

    let guard = 0;
    while (session.state.combat.phase === "active" && guard++ < 300) {
      const actorId = session.state.combat.activeActorId!;
      const action = chooseAiAction(session.state, actorId);
      expect(action).not.toBeNull();
      const before = session.state.eventLog.length;
      session = dispatch(session, action!, diceRng);
      // The AI never proposes an action the resolver rejects.
      expect(session.state.eventLog.length).toBeGreaterThan(before);
    }
    expect(session.state.combat.phase).not.toBe("active");

    // Replay needs only the event log and the same seeded initial state.
    const { state: replayed } = replayEvents(
      createInitialState({ ...config, rng: createSeededRng(7) }),
      session.state.eventLog,
    );
    expect(replayed.entities).toEqual(session.state.entities);
    expect(replayed.combat).toEqual(session.state.combat);
  });
});
