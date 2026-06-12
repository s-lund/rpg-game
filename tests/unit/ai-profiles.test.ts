/**
 * M12 Phase B — per-archetype AI profile signatures. These are UNIT tests (not
 * the frozen behavior contract): they pin each profile's characteristic choice
 * on a scripted board, comparing it against the baseline on the SAME state via
 * the explicit profileId argument so the profile data is the isolated cause.
 * Reuses the terrain()/enemyActs() helper pattern from
 * tests/contract/ai-behavior.test.ts (copied, not imported — contract files
 * stay untouched).
 */
import { describe, expect, it } from "vitest";
import {
  chooseAiAction,
  createInitialState,
  evaluateCover,
  type InitialStateConfig,
} from "../../src/core/index";
import type { EntityId } from "../../src/shared/ids";

/** Map rows → terrain: "." floor · "#" wall · "c" raised prop. */
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

function enemyActs(config: InitialStateConfig, actorId: string) {
  const state = createInitialState(config);
  state.combat.activeActorId = actorId as EntityId;
  return state;
}

const meleeHero = (id: string, x: number, y: number, over: Record<string, unknown> = {}) => ({
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

const rangedEnemy = (id: string, x: number, y: number, over: Record<string, unknown> = {}) => ({
  id: id as EntityId,
  label: id,
  x,
  y,
  maxHp: 14,
  ac: 14,
  attackBonus: 7,
  strikeRange: 4,
  damage: { count: 1, sides: 6, modifier: 1 },
  ...over,
});

const manhattan = (ax: number, ay: number, bx: number, by: number) =>
  Math.abs(ax - bx) + Math.abs(ay - by);

describe("AI profile — skirmisher", () => {
  it("kites away from a target it cannot reach this turn when wounded, where the baseline advances", () => {
    // Hero is 9 tiles east; with strikeRange 4 and 3 AP the enemy cannot get a
    // shot this turn from anywhere, so the approach gradient governs the move.
    const config: InitialStateConfig = {
      width: 14,
      height: 3,
      party: [meleeHero("ent_hero", 12, 1)],
      enemies: [rangedEnemy("ent_skirm", 3, 1, { strikeRange: 4, currentHp: 3 })], // 3/14 < 0.4
    };
    const state = enemyActs(config, "ent_skirm");

    const baseline = chooseAiAction(state, "ent_skirm" as EntityId, "baseline");
    const skirmisher = chooseAiAction(state, "ent_skirm" as EntityId, "skirmisher");

    expect(baseline?.kind).toBe("Step");
    expect(skirmisher?.kind).toBe("Step");
    if (baseline?.kind !== "Step" || skirmisher?.kind !== "Step") return;
    // Baseline closes the gap (moves toward the hero, east of x=3); the wounded
    // skirmisher's retreat switch flips approach negative and it kites west.
    expect(baseline.x).toBeGreaterThan(3);
    expect(skirmisher.x).toBeLessThan(3);
  });

  it("does not retreat while at full HP (retreat is gated on the HP threshold)", () => {
    const config: InitialStateConfig = {
      width: 14,
      height: 3,
      party: [meleeHero("ent_hero", 12, 1)],
      enemies: [rangedEnemy("ent_skirm", 3, 1, { strikeRange: 4 })], // full HP
    };
    const state = enemyActs(config, "ent_skirm");

    const skirmisher = chooseAiAction(state, "ent_skirm" as EntityId, "skirmisher");
    expect(skirmisher?.kind).toBe("Step");
    if (skirmisher?.kind !== "Step") return;
    expect(skirmisher.x).toBeGreaterThan(3); // advances like baseline when healthy
  });
});

describe("AI profile — bruiser", () => {
  it("body-blocks into a tile adjacent to two heroes where the baseline avoids the double melee zone", () => {
    // (5,2) is the only tile adjacent to BOTH heroes and lets the bruiser strike
    // one of them; single-zone tiles like (4,1) also enable a strike. The choice
    // between them is decided entirely by meleeZoneAvoid (negative for bruisers).
    const config: InitialStateConfig = {
      width: 10,
      height: 6,
      party: [meleeHero("ent_a", 5, 1), meleeHero("ent_b", 5, 3)],
      enemies: [
        {
          id: "ent_brute" as EntityId,
          label: "ent_brute",
          x: 3,
          y: 2,
          maxHp: 18,
          ac: 15,
          attackBonus: 8,
          strikeRange: 1,
          damage: { count: 1, sides: 8, modifier: 2 },
        },
      ],
    };
    const state = enemyActs(config, "ent_brute");

    const baseline = chooseAiAction(state, "ent_brute" as EntityId, "baseline");
    const bruiser = chooseAiAction(state, "ent_brute" as EntityId, "bruiser");

    expect(baseline?.kind).toBe("Step");
    expect(bruiser?.kind).toBe("Step");
    if (baseline?.kind !== "Step" || bruiser?.kind !== "Step") return;

    const adjBoth = (s: { x: number; y: number }) =>
      manhattan(s.x, s.y, 5, 1) === 1 && manhattan(s.x, s.y, 5, 3) === 1;
    expect(adjBoth(bruiser)).toBe(true); // plants on the chokepoint between both heroes
    expect(adjBoth(baseline)).toBe(false); // baseline refuses the doubly-threatened tile
  });
});

describe("AI profile — caster", () => {
  it("casts its ranged spell from distance instead of closing", () => {
    const config: InitialStateConfig = {
      width: 10,
      height: 5,
      party: [meleeHero("ent_hero", 6, 2)],
      enemies: [
        rangedEnemy("ent_caster", 2, 2, {
          strikeRange: 1,
          knownSpells: ["ray_of_frost"],
          spellAttackBonus: 7,
          spellDc: 17,
        }),
      ],
    };
    const state = enemyActs(config, "ent_caster");

    const action = chooseAiAction(state, "ent_caster" as EntityId, "caster");
    expect(action?.kind).toBe("CastSpell");
    if (action?.kind === "CastSpell") {
      expect(action.spellId).toBe("ray_of_frost");
    }
  });

  it("steps out of melee reach rather than casting in a hero's threatened zone", () => {
    // A weak melee hero (so a Reactive Strike is survivable): the high
    // meleeZoneAvoid + aooRisk still make casting from in-reach worse than
    // disengaging one tile and then casting from safety.
    const config: InitialStateConfig = {
      width: 10,
      height: 5,
      party: [meleeHero("ent_hero", 4, 2, { attackBonus: 5, damage: { count: 1, sides: 4, modifier: 0 } })],
      enemies: [
        rangedEnemy("ent_caster", 3, 2, {
          ac: 18,
          strikeRange: 1,
          knownSpells: ["ray_of_frost"],
          spellAttackBonus: 7,
          spellDc: 17,
        }),
      ],
    };
    const state = enemyActs(config, "ent_caster");

    const action = chooseAiAction(state, "ent_caster" as EntityId, "caster");
    expect(action?.kind).toBe("Step");
    if (action?.kind === "Step") {
      // Destination is out of the hero's melee reach.
      expect(manhattan(action.x, action.y, 4, 2)).toBeGreaterThan(1);
    }
  });
});

describe("AI profile — wounded", () => {
  it("advances at full HP but pulls back behind cover once below the HP threshold", () => {
    // Prop at (5,2) shadows the row-2 tiles west of it from the ranged hero at
    // the east edge. The enemy can never get a shot this turn (strikeRange 4,
    // hero 8+ tiles away), so the approach gradient governs the move.
    const layout = terrain([
      "..............",
      "..............",
      ".....c........",
      "..............",
      "..............",
    ]);
    const base = (over: Record<string, unknown>): InitialStateConfig => ({
      ...layout,
      party: [meleeHero("ent_archer", 12, 2, { strikeRange: 6 })],
      enemies: [rangedEnemy("ent_stalker", 4, 2, { strikeRange: 4, aiProfileId: "wounded", ...over })],
    });

    const full = chooseAiAction(enemyActs(base({}), "ent_stalker"), "ent_stalker" as EntityId, "wounded");
    const hurt = chooseAiAction(
      enemyActs(base({ currentHp: 4 }), "ent_stalker"), // 4/14 < 0.5
      "ent_stalker" as EntityId,
      "wounded",
    );

    expect(full?.kind).toBe("Step");
    expect(hurt?.kind).toBe("Step");
    if (full?.kind !== "Step" || hurt?.kind !== "Step") return;

    // Full HP: closes toward the hero (distance shrinks below the start's 8).
    expect(manhattan(full.x, full.y, 12, 2)).toBeLessThan(8);
    // Hurt: retreats west of the start AND ends behind the prop's cover.
    expect(hurt.x).toBeLessThan(4);
    const stateForCover = enemyActs(base({ currentHp: 4 }), "ent_stalker");
    const cover = evaluateCover(stateForCover.map, { x: 12, y: 2 }, { x: hurt.x, y: hurt.y });
    expect(cover.tier).not.toBe("none");
  });
});
