import { describe, expect, it } from "vitest";
import {
  chooseEnemyAction,
  createInitialState,
  dispatch,
  isTileBlocked,
  replayEvents,
} from "../../src/core/index";

function configWithWall() {
  return {
    width: 8,
    height: 8,
    party: [{ id: "ent_fighter_01" as const, label: "Fighter", x: 1, y: 1, maxHp: 20, ac: 18 }],
    enemies: [{ id: "ent_goblin_01" as const, label: "Goblin", x: 6, y: 6, maxHp: 12, ac: 10 }],
    blockedTiles: [
      { x: 2, y: 1 },
      { x: 3, y: 4 },
    ],
  };
}

describe("blocked terrain", () => {
  it("records blocked tiles on the map", () => {
    const state = createInitialState(configWithWall());
    expect(isTileBlocked(state, 2, 1)).toBe(true);
    expect(isTileBlocked(state, 1, 2)).toBe(false);
  });

  it("leaves blocked undefined when no blocked tiles are configured", () => {
    const state = createInitialState({ ...configWithWall(), blockedTiles: [] });
    expect(state.map.blocked).toBeUndefined();
    expect(isTileBlocked(state, 2, 1)).toBe(false);
  });

  it("rejects a Step onto a blocked tile", () => {
    const session = {
      state: createInitialState(configWithWall()),
      nextSeq: 1,
    };

    const after = dispatch(session, {
      kind: "Step",
      actionId: "act_into_wall",
      actorId: "ent_fighter_01",
      x: 2,
      y: 1,
    });

    const fighter = after.state.entities["ent_fighter_01"]!;
    expect(fighter.x).toBe(1);
    expect(fighter.y).toBe(1);
    expect(fighter.actionPoints).toBe(3);
    expect(after.state.eventLog).toHaveLength(0);
  });

  it("still allows a Step onto an open tile beside the wall", () => {
    const session = {
      state: createInitialState(configWithWall()),
      nextSeq: 1,
    };

    const after = dispatch(session, {
      kind: "Step",
      actionId: "act_around_wall",
      actorId: "ent_fighter_01",
      x: 1,
      y: 2,
    });

    expect(after.state.entities["ent_fighter_01"]!.y).toBe(2);
  });

  it("enemy AI never steps onto a blocked tile", () => {
    // Goblin at (4,4) wants the fighter at (2,4); the direct tile west (3,4) is blocked.
    const state = createInitialState({
      width: 8,
      height: 8,
      party: [{ id: "ent_fighter_01" as const, label: "Fighter", x: 2, y: 4, maxHp: 20, ac: 18 }],
      enemies: [
        {
          id: "ent_goblin_01" as const,
          label: "Goblin",
          x: 4,
          y: 4,
          maxHp: 12,
          ac: 10,
          attackBonus: 4,
        },
      ],
      blockedTiles: [{ x: 3, y: 4 }],
    });
    const enemyTurn = {
      ...state,
      combat: { ...state.combat, activeActorId: "ent_goblin_01" as const },
    };

    const action = chooseEnemyAction(enemyTurn, "ent_goblin_01");
    expect(action).not.toBeNull();
    if (action?.kind === "Step") {
      expect(`${action.x},${action.y}`).not.toBe("3,4");
    }
  });

  it("blocked tiles survive event-log replay", () => {
    const initial = createInitialState(configWithWall());
    let session = { state: initial, nextSeq: 1 };
    session = dispatch(session, {
      kind: "Step",
      actionId: "act_legal_move",
      actorId: "ent_fighter_01",
      x: 1,
      y: 3,
    });

    const { state: replayed } = replayEvents(initial, session.state.eventLog);
    expect(replayed.map.blocked).toEqual(initial.map.blocked);
    expect(replayed.entities["ent_fighter_01"]!.y).toBe(3);
  });
});
