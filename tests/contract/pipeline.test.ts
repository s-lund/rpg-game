/**
 * FROZEN — pipeline contract (M1).
 * State mutates only via apply(Effect); one Effect → one Event.
 * Do not modify, weaken, skip, or delete.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  apply,
  applyAll,
  createInitialState,
  dispatch,
  replayEvents,
  ALL_EFFECT_KINDS,
  type Effect,
  type GameState,
} from "../../src/core/index";

function makeState(): GameState {
  return createInitialState({
    width: 8,
    height: 8,
    party: [
      { id: "ent_fighter_01", label: "Fighter", x: 1, y: 1, maxHp: 20, ac: 18 },
      { id: "ent_rogue_01", label: "Rogue", x: 2, y: 1, maxHp: 16, ac: 16 },
    ],
    enemies: [
      { id: "ent_goblin_01", label: "Goblin", x: 5, y: 5, maxHp: 6, ac: 16 },
    ],
  });
}

function effectForKind(kind: Effect["kind"], state: GameState): Effect {
  const fighter = state.entities["ent_fighter_01"]!;
  const goblin = state.entities["ent_goblin_01"]!;

  switch (kind) {
    case "MoveTo":
      return {
        kind: "MoveTo",
        effectId: "eff_move_test",
        entityId: fighter.id,
        x: fighter.x + 1,
        y: fighter.y,
      };
    case "Damage":
      return {
        kind: "Damage",
        effectId: "eff_dmg_test",
        targetId: goblin.id,
        amount: 3,
        damageType: "slashing",
      };
    case "ApplyCondition":
      return {
        kind: "ApplyCondition",
        effectId: "eff_cond_test",
        targetId: goblin.id,
        condition: "flat_footed",
      };
    case "RemoveCondition":
      return {
        kind: "RemoveCondition",
        effectId: "eff_uncond_test",
        targetId: goblin.id,
        condition: "flat_footed",
      };
    case "SpendActionPoints":
      return {
        kind: "SpendActionPoints",
        effectId: "eff_ap_test",
        entityId: fighter.id,
        amount: 1,
      };
    case "SetActiveActor":
      return {
        kind: "SetActiveActor",
        effectId: "eff_turn_test",
        entityId: "ent_rogue_01",
      };
    case "EntityDowned":
      return {
        kind: "EntityDowned",
        effectId: "eff_down_test",
        entityId: goblin.id,
      };
    case "Heal":
      return {
        kind: "Heal",
        effectId: "eff_heal_test",
        targetId: fighter.id,
        amount: 4,
      };
    case "CombatEnded":
      return {
        kind: "CombatEnded",
        effectId: "eff_end_test",
        outcome: "victory",
      };
  }
}

describe("pipeline contract", () => {
  it("registers every effect kind for contract coverage", () => {
    expect(ALL_EFFECT_KINDS.length).toBeGreaterThan(0);
    expect(new Set(ALL_EFFECT_KINDS).size).toBe(ALL_EFFECT_KINDS.length);
  });

  it("apply returns exactly one event per effect and does not mutate input state", () => {
    for (const kind of ALL_EFFECT_KINDS) {
      const before = makeState();
      const frozen = structuredClone(before);
      const effect = effectForKind(kind, before);

      const result = apply(effect, before, { seq: 1, turn: 1, actorId: "ent_fighter_01", actionId: "act_test" });

      expect(result.events, `effect kind ${kind}`).toHaveLength(1);
      expect(result.events[0]!.type).toBeTruthy();
      expect(result.events[0]!.derivedFrom).toBe("act_test");
      expect(before).toEqual(frozen);
      expect(result.state).not.toBe(before);
    }
  });

  it("applyAll chains effects through apply only — event count equals effect count", () => {
    const state = makeState();
    const effects: Effect[] = [
      {
        kind: "SpendActionPoints",
        effectId: "eff_ap_1",
        entityId: "ent_fighter_01",
        amount: 1,
      },
      {
        kind: "MoveTo",
        effectId: "eff_move_1",
        entityId: "ent_fighter_01",
        x: 2,
        y: 1,
      },
    ];

    const { state: next, events } = applyAll(effects, state, {
      seqStart: 10,
      turn: 1,
      actorId: "ent_fighter_01",
      actionId: "act_stride_1",
    });

    expect(events).toHaveLength(effects.length);
    expect(next.entities["ent_fighter_01"]!.x).toBe(2);
    expect(next.entities["ent_fighter_01"]!.actionPoints).toBe(2);
  });

  it("dispatch records events append-only; replay reconstructs final state", () => {
    let session = { state: makeState(), nextSeq: 1 };

    session = dispatch(session, {
      kind: "Step",
      actionId: "act_step_1",
      actorId: "ent_fighter_01",
      x: 2,
      y: 2,
    });
    session = dispatch(session, {
      kind: "Strike",
      actionId: "act_strike_1",
      actorId: "ent_fighter_01",
      targetId: "ent_goblin_01",
    });

    const { state: replayed } = replayEvents(makeState(), session.state.eventLog);
    expect(replayed.entities).toEqual(session.state.entities);
    expect(replayed.combat).toEqual(session.state.combat);
  });

  it("only apply.ts performs entity/combat field writes on GameState", () => {
    const coreDir = join(process.cwd(), "src/core");
    const applyPath = join(coreDir, "effects", "apply.ts").replace(/\\/g, "/");
    const forbiddenPatterns = [
      /\.entities\[[^\]]+\]\s*=/,
      /\.entities\.\w+\s*=/,
      /state\.combat\s*=/,
      /state\.eventLog\s*=/,
    ];

    function scan(dir: string): string[] {
      const violations: string[] = [];
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          violations.push(...scan(full));
          continue;
        }
        if (!entry.endsWith(".ts")) continue;
        const normalized = full.replace(/\\/g, "/");
        if (normalized.endsWith("/apply.ts")) continue;

        const source = readFileSync(full, "utf-8");
        for (const pattern of forbiddenPatterns) {
          if (pattern.test(source)) {
            violations.push(`${normalized}: direct state mutation pattern ${pattern}`);
          }
        }
      }
      return violations;
    }

    expect(scan(coreDir)).toEqual([]);
    expect(applyPath).toContain("effects/apply.ts");
  });
});
