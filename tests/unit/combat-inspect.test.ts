import { describe, expect, it } from "vitest";
import { createInitialState, estimateHitPercent, inspectTarget } from "../../src/core/index";
import type { EntityId } from "../../src/shared/ids";

describe("combat inspect", () => {
  it("returns hit percent and damage band for ranged strike", () => {
    const state = createInitialState({
      width: 12,
      height: 12,
      party: [
        {
          id: "ent_archer" as EntityId,
          label: "Archer",
          x: 1,
          y: 5,
          maxHp: 20,
          ac: 16,
          attackBonus: 10,
          strikeRange: 6,
          damage: { count: 1, sides: 6, modifier: 4 },
        },
      ],
      enemies: [
        {
          id: "ent_foe" as EntityId,
          label: "Foe",
          x: 6,
          y: 5,
          maxHp: 12,
          ac: 16,
          strikeRange: 1,
          damage: { count: 1, sides: 4, modifier: 0 },
        },
      ],
    });

    const info = inspectTarget(state, "ent_archer", "ent_foe", "strike");
    expect(info?.inRange).toBe(true);
    expect(info?.hitPercent).toBe(estimateHitPercent(10, 16));
    expect(info?.damageMin).toBe(5);
    expect(info?.damageMax).toBe(10);
  });

  it("reports out of range when distance exceeds strike range", () => {
    const state = createInitialState({
      width: 12,
      height: 12,
      party: [
        {
          id: "ent_archer" as EntityId,
          label: "Archer",
          x: 1,
          y: 5,
          maxHp: 20,
          ac: 16,
          attackBonus: 10,
          strikeRange: 6,
          damage: { count: 1, sides: 6, modifier: 4 },
        },
      ],
      enemies: [
        {
          id: "ent_foe" as EntityId,
          label: "Foe",
          x: 10,
          y: 5,
          maxHp: 12,
          ac: 16,
          strikeRange: 1,
          damage: { count: 1, sides: 4, modifier: 0 },
        },
      ],
    });

    const info = inspectTarget(state, "ent_archer", "ent_foe", "strike");
    expect(info?.inRange).toBe(false);
  });

  it("folds prop cover into hit percent and effective AC", () => {
    const state = createInitialState({
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
          maxHp: 12,
          ac: 16,
          strikeRange: 1,
          damage: { count: 1, sides: 4, modifier: 0 },
        },
      ],
    });

    const info = inspectTarget(state, "ent_archer", "ent_foe", "strike");
    expect(info?.lineOfEffect).toBe(true);
    expect(info?.coverAcBonus).toBe(2);
    expect(info?.effectiveAc).toBe(18);
    expect(info?.coverLabel).toContain("+2 AC");
    expect(info?.hitPercent).toBe(estimateHitPercent(10, 18));
  });
});
