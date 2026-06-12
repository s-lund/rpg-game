/**
 * M12 Phase B — headless staging smoke test. Builds the staged encounters from
 * the SHIPPED content packs (real battle maps, real enemy blueprints) and runs
 * an AI-vs-AI fight to completion via chooseAiAction on both teams (the smoke
 * test the milestone prompt calls for). It pins three things that the gate-2
 * playtest relies on:
 *   1. the encounter resolves — the AI never proposes an action the resolver
 *      rejects, and the fight reaches victory/defeat within a sane bound;
 *   2. the authored archetype profiles actually reach the right entities;
 *   3. the wired enemy caster actually casts its spell in a real built fight.
 * Unit test (not contract): it drives shipped data, not a frozen property.
 */
import { describe, expect, it } from "vitest";
import {
  chooseAiAction,
  createInitialState,
  createSeededRng,
  dispatch,
  resolveEncounterBattleMap,
  type ContentPack,
  type EntityBlueprint,
  type InitialStateConfig,
} from "../../src/core/index";
import type { EntityId } from "../../src/shared/ids";
import { EMBERWATCH_PACK } from "../../src/content/emberwatch/pack";
import { MIRRORMARSH_PACK } from "../../src/content/mirrormarsh/pack";

/** A strong, aggressive scripted party so the fight actually concludes. */
function scriptedParty(spawns: { x: number; y: number }[]): EntityBlueprint[] {
  const ranged = (i: number) => i === 1 || i === 3; // two archers, two melee
  return spawns.slice(0, 4).map((s, i) => ({
    id: `ent_hero_${i}` as EntityId,
    label: `Hero ${i}`,
    x: s.x,
    y: s.y,
    maxHp: 34,
    ac: 18,
    attackBonus: 10,
    strikeRange: ranged(i) ? 6 : 1,
    damageType: "slashing" as const,
    damage: { count: 1, sides: 8, modifier: 5 },
    saves: { fortitude: 9, reflex: 9, will: 9 },
  }));
}

interface SmokeResult {
  finished: boolean;
  profiles: Record<string, string | undefined>;
  enemyCastSpells: number;
}

function runEncounter(pack: ContentPack, encounterId: string): SmokeResult {
  const template = pack.encounters[encounterId as never] as { enemies: EntityBlueprint[] };
  const battleMap = resolveEncounterBattleMap(pack, encounterId as never);
  if (!battleMap) throw new Error(`no battle map for ${encounterId}`);

  const config: InitialStateConfig = {
    width: battleMap.width,
    height: battleMap.height,
    party: scriptedParty(battleMap.partySpawns),
    enemies: template.enemies.map((e) => ({ ...e })),
    blockedTiles: battleMap.blocked.map((b) => ({ ...b })),
    coverTiles: battleMap.cover.map((c) => ({ ...c })),
    rng: createSeededRng(7),
  };

  const profiles: Record<string, string | undefined> = {};
  for (const enemy of template.enemies) profiles[enemy.id] = enemy.aiProfileId;

  let session = { state: createInitialState(config), nextSeq: 1 };
  const dice = createSeededRng(123);
  let enemyCastSpells = 0;
  let guard = 0;
  while (session.state.combat.phase === "active" && guard++ < 600) {
    const actorId = session.state.combat.activeActorId!;
    const actor = session.state.entities[actorId]!;
    const action = chooseAiAction(session.state, actorId);
    expect(action, `actor ${actorId} produced no action`).not.toBeNull();
    if (actor.team === "enemy" && action!.kind === "CastSpell") enemyCastSpells++;
    const before = session.state.eventLog.length;
    session = dispatch(session, action!, dice);
    // Every chosen action is legal: it advances the event log.
    expect(session.state.eventLog.length, `stalled on ${JSON.stringify(action)}`).toBeGreaterThan(before);
  }

  return { finished: session.state.combat.phase !== "active", profiles, enemyCastSpells };
}

describe("M12 staging smoke — Emberwatch", () => {
  it("Cinder Market resolves; looters are wounded-profile, the captain is a bruiser", () => {
    const result = runEncounter(EMBERWATCH_PACK, "enc_cinder_market");
    expect(result.finished).toBe(true);
    expect(result.profiles["ent_market_looter_1"]).toBe("wounded");
    expect(result.profiles["ent_market_looter_2"]).toBe("wounded");
    expect(result.profiles["ent_looter_captain_1"]).toBe("bruiser");
  });

  it("Watcher's Bridge resolves over its walled chokepoint; the warden bruisers, pickets skirmish", () => {
    const result = runEncounter(EMBERWATCH_PACK, "enc_watchers_bridge");
    expect(result.finished).toBe(true);
    expect(result.profiles["ent_bridge_warden_1"]).toBe("bruiser");
    expect(result.profiles["ent_bridge_picket_1"]).toBe("skirmisher");
  });

  it("Great Hall resolves and the Spire Adept actually casts; the acolyte skirmishes", () => {
    const result = runEncounter(EMBERWATCH_PACK, "enc_great_hall");
    expect(result.finished).toBe(true);
    expect(result.profiles["ent_hall_adept_1"]).toBe("caster");
    expect(result.profiles["ent_hall_acolyte_1"]).toBe("skirmisher");
    expect(result.enemyCastSpells).toBeGreaterThan(0); // the caster cast Ray of Frost at least once
  });
});

describe("M12 staging smoke — Mirrormarsh", () => {
  it("Grain Vault resolves; bog stalker is wounded-profile, the chanter casts", () => {
    const result = runEncounter(MIRRORMARSH_PACK, "enc_grain_vault");
    expect(result.finished).toBe(true);
    expect(result.profiles["ent_vault_stalker_1"]).toBe("wounded");
    expect(result.profiles["ent_vault_chanter_1"]).toBe("caster");
    expect(result.enemyCastSpells).toBeGreaterThan(0);
  });
});
