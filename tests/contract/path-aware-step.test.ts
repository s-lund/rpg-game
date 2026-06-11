/**
 * M9 contract — path-aware Step: a Step needs a passable route within AP
 * (blocked terrain cannot be crossed), and the AP cost is the route length.
 */
import { describe, expect, it } from "vitest";
import {
  createInitialState,
  dispatch,
  findStepPath,
  type InitialStateConfig,
} from "../../src/core/index";
import type { EntityId } from "../../src/shared/ids";

/**
 * 7x5 map with a wall column at x=2 (y=0..2). The fighter at (1,1) can reach
 * (3,1) only by detouring under the wall: (1,1)→(1,2)→(1,3)→(2,3)→(3,3)→(3,2)→(3,1).
 */
function walledConfig(): InitialStateConfig {
  return {
    width: 7,
    height: 5,
    party: [
      { id: "ent_fighter_01" as EntityId, label: "Fighter", x: 1, y: 1, maxHp: 20, ac: 18 },
      { id: "ent_rogue_01" as EntityId, label: "Rogue", x: 1, y: 2, maxHp: 16, ac: 16 },
    ],
    enemies: [
      { id: "ent_goblin_01" as EntityId, label: "Goblin", x: 5, y: 4, maxHp: 6, ac: 10 },
    ],
    blockedTiles: [
      { x: 2, y: 0 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
    ],
  };
}

describe("path-aware Step contract", () => {
  it("rejects a Step whose only straight line crosses a wall and no route fits the AP", () => {
    // Manhattan distance (1,1)→(3,1) is 2 ≤ 3 AP, but the wall forces a 6-tile detour.
    let session = { state: createInitialState(walledConfig()), nextSeq: 1 };
    session = dispatch(session, {
      kind: "Step",
      actionId: "act_step_through_wall",
      actorId: "ent_fighter_01",
      x: 3,
      y: 1,
    });

    const fighter = session.state.entities["ent_fighter_01"]!;
    expect(fighter.x).toBe(1);
    expect(fighter.y).toBe(1);
    expect(fighter.actionPoints).toBe(3);
    expect(session.state.eventLog).toHaveLength(0);
  });

  it("spends AP equal to the actual route length, not the straight-line distance", () => {
    // (1,1)→(3,4): manhattan 5 > 3 AP... pick a reachable detour instead:
    // (1,1)→(2,3)? route (1,3),(2,3) blocked? (2,3) is open. Use target (2,3): route length 3.
    let session = { state: createInitialState(walledConfig()), nextSeq: 1 };
    session = dispatch(session, {
      kind: "Step",
      actionId: "act_step_detour",
      actorId: "ent_fighter_01",
      x: 2,
      y: 3,
    });

    const fighter = session.state.entities["ent_fighter_01"]!;
    expect(fighter.x).toBe(2);
    expect(fighter.y).toBe(3);
    // Manhattan distance is 3 and the shortest open route is also 3 — all AP spent.
    expect(fighter.actionPoints).toBe(0);
    const apEvent = session.state.eventLog.find((e) => e.type === "ActionPointsSpent")!;
    expect(apEvent.payload.amount).toBe(3);
  });

  it("findStepPath routes around walls and respects the AP budget", () => {
    const state = createInitialState(walledConfig());
    // With 6 AP the detour to (3,1) exists and is 6 long.
    const path = findStepPath(state, "ent_fighter_01", 3, 1, 6);
    expect(path).not.toBeNull();
    expect(path!).toHaveLength(6);
    expect(path![path!.length - 1]).toEqual({ x: 3, y: 1 });
    // Every step tile is open.
    for (const tile of path!) {
      expect([
        "2,0",
        "2,1",
        "2,2",
      ]).not.toContain(`${tile.x},${tile.y}`);
    }
    // With only 3 AP there is no route.
    expect(findStepPath(state, "ent_fighter_01", 3, 1, 3)).toBeNull();
  });

  it("allies can be moved through, enemies cannot", () => {
    const config: InitialStateConfig = {
      width: 7,
      height: 3,
      party: [
        { id: "ent_fighter_01" as EntityId, label: "Fighter", x: 0, y: 1, maxHp: 20, ac: 18 },
        { id: "ent_rogue_01" as EntityId, label: "Rogue", x: 1, y: 1, maxHp: 16, ac: 16 },
      ],
      enemies: [
        { id: "ent_goblin_01" as EntityId, label: "Goblin", x: 3, y: 1, maxHp: 6, ac: 10 },
      ],
      // Corridor: only row y=1 is open.
      blockedTiles: [
        { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 },
        { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 },
      ],
    };
    const state = createInitialState(config);

    // Through the ally at (1,1) to (2,1): allowed, cost 2.
    const throughAlly = findStepPath(state, "ent_fighter_01", 2, 1, 3);
    expect(throughAlly).not.toBeNull();
    expect(throughAlly!).toHaveLength(2);

    // Through the enemy at (3,1) to (4,1): blocked.
    expect(findStepPath(state, "ent_fighter_01", 4, 1, 6)).toBeNull();
  });

  it("open-ground Steps behave exactly as before (cost = manhattan distance)", () => {
    const config = walledConfig();
    config.blockedTiles = [];
    let session = { state: createInitialState(config), nextSeq: 1 };
    session = dispatch(session, {
      kind: "Step",
      actionId: "act_step_open",
      actorId: "ent_fighter_01",
      x: 3,
      y: 1,
    });

    const fighter = session.state.entities["ent_fighter_01"]!;
    expect(fighter.x).toBe(3);
    expect(fighter.actionPoints).toBe(1); // distance 2
  });
});
