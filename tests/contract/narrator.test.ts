/**
 * FROZEN — narrator contract (M5).
 * Narrator consumes only the event log (+ static beat data); disabling it
 * changes nothing mechanical. Story beats flow through campaign apply.
 * Do not modify, weaken, skip, or delete.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  applyCombatResultToCampaign,
  buildEncounterForSite,
  createCampaignState,
  createInitialState,
  createSeededRng,
  dispatch,
  formatBeat,
  formatEventLine,
  formatEvents,
  M3_DEMO_GRAPH,
  M4_DEMO_ENCOUNTERS,
  travelTo,
  triggerStoryBeat,
  type CampaignState,
  type GameEvent,
  type GameState,
} from "../../src/core/index";
import { createDefaultParty } from "../../src/core/characters/validate";
import type { EntityId } from "../../src/shared/ids";

const NARRATOR_DIR = join(process.cwd(), "src/core/narrator");
const FORBIDDEN_IMPORTS = ["three", "three/", "three/examples"];

function listTsFiles(dir: string): string[] {
  const files: string[] = [];
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) {
    return files;
  }
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      files.push(...listTsFiles(fullPath));
    } else if (entry.endsWith(".ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

function findForbiddenImports(source: string): string[] {
  const importPattern =
    /(?:import\s+.*?\s+from\s+['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\))/g;
  const hits: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = importPattern.exec(source)) !== null) {
    const specifier = match[1] ?? match[2];
    if (FORBIDDEN_IMPORTS.some((blocked) => specifier === blocked || specifier.startsWith(blocked))) {
      hits.push(specifier);
    }
  }
  return hits;
}

function campaignAt(siteId: CampaignState["currentSiteId"]): CampaignState {
  const party = createDefaultParty();
  const state = createCampaignState(party, M3_DEMO_GRAPH);
  return siteId === state.currentSiteId ? state : { ...state, currentSiteId: siteId };
}

function mechanicalSnapshot(campaign: CampaignState) {
  return {
    graphId: campaign.graphId,
    currentSiteId: campaign.currentSiteId,
    partyHp: campaign.party.members.map((m) => m.currentHp),
    partyIds: campaign.party.members.map((m) => m.id),
    eventLogLen: campaign.eventLog.length,
  };
}

function combatMechanicalSnapshot(state: GameState) {
  return {
    entities: Object.fromEntries(
      Object.entries(state.entities).map(([id, e]) => [
        id,
        { hp: e.hp, x: e.x, y: e.y, downed: e.downed, conditions: [...e.conditions] },
      ]),
    ),
    combat: { ...state.combat, turnOrder: [...state.combat.turnOrder] },
    eventLogLen: state.eventLog.length,
  };
}

const FIGHT_CONFIG = {
  width: 12,
  height: 12,
  party: [
    {
      id: "ent_fighter_01" as const,
      label: "Fighter",
      classId: "fighter" as const,
      x: 2,
      y: 5,
      maxHp: 20,
      ac: 18,
      attackBonus: 15,
      damage: { count: 1, sides: 8, modifier: 4 },
    },
    {
      id: "ent_rogue_01" as const,
      label: "Rogue",
      classId: "rogue" as const,
      x: 3,
      y: 5,
      maxHp: 16,
      ac: 16,
      attackBonus: 14,
      damage: { count: 1, sides: 6, modifier: 2 },
    },
  ],
  enemies: [
    {
      id: "ent_goblin_01" as const,
      label: "Goblin",
      x: 6,
      y: 5,
      maxHp: 12,
      ac: 14,
      attackBonus: 4,
      damage: { count: 1, sides: 6, modifier: 0 },
    },
  ],
};

function runStrikeScript(): GameState {
  const rng = createSeededRng(42);
  let session = { state: createInitialState(FIGHT_CONFIG), nextSeq: 1 };
  const script = [
    { kind: "Step" as const, actionId: "act_f_move", actorId: "ent_fighter_01" as const, x: 4, y: 5 },
    { kind: "EndTurn" as const, actionId: "act_f_end", actorId: "ent_fighter_01" as const },
    { kind: "Strike" as const, actionId: "act_f_strike", actorId: "ent_fighter_01" as const, targetId: "ent_goblin_01" as const },
  ];
  for (const action of script) {
    session = dispatch(session, action, rng);
  }
  return session.state;
}

describe("narrator contract (M5)", () => {
  it("narrator core never imports three.js", () => {
    const violations: string[] = [];
    for (const file of listTsFiles(NARRATOR_DIR)) {
      const source = readFileSync(file, "utf-8");
      const hits = findForbiddenImports(source);
      if (hits.length > 0) {
        violations.push(`${file}: ${hits.join(", ")}`);
      }
    }
    expect(violations).toEqual([]);
    expect(listTsFiles(NARRATOR_DIR).length).toBeGreaterThan(0);
  });

  it("formatters are pure and do not mutate inputs", () => {
    const event: GameEvent = {
      seq: 1,
      turn: 1,
      actorId: "ent_fighter_01",
      type: "DamageDealt",
      payload: {
        target_id: "ent_goblin_01",
        amount: 5,
        damage_type: "slashing",
        hp_after: 7,
        from_effect: "eff_test",
      },
      derivedFrom: "act_test",
    };
    const eventJson = JSON.stringify(event);
    const ctx = { entityLabels: { ent_fighter_01: "Fighter", ent_goblin_01: "Goblin" } };

    formatEventLine(event, ctx);
    formatBeat("beat_drowned_market_echoes", { entityLabels: {}, siteLabel: "Drowned Market" });
    formatEvents([event], ctx);

    expect(JSON.stringify(event)).toBe(eventJson);
  });

  it("calling narrator formatters does not change combat dispatch outcome", () => {
    const without = runStrikeScript();
    const withNarrator = runStrikeScript();
    const ctx = {
      entityLabels: Object.fromEntries(
        Object.entries(withNarrator.entities).map(([id, e]) => [id, e.label]),
      ),
    };
    formatEvents(withNarrator.eventLog, ctx);

    expect(combatMechanicalSnapshot(withNarrator)).toEqual(combatMechanicalSnapshot(without));
  });

  it("calling narrator formatters does not change transition outputs", () => {
    const campaign = campaignAt("site_drowned_market");
    const combat = runStrikeScript();
    const mergedWithout = applyCombatResultToCampaign(campaign, combat);

    const ctx = {
      entityLabels: Object.fromEntries(
        Object.entries(combat.entities).map(([id, e]) => [id, e.label]),
      ),
    };
    formatEvents(combat.eventLog, ctx);
    const mergedWith = applyCombatResultToCampaign(campaign, combat);

    expect(buildEncounterForSite(mergedWith, M3_DEMO_GRAPH, M4_DEMO_ENCOUNTERS)).toEqual(
      buildEncounterForSite(mergedWithout, M3_DEMO_GRAPH, M4_DEMO_ENCOUNTERS),
    );
    expect(mergedWith.party.members.map((m) => m.currentHp)).toEqual(
      mergedWithout.party.members.map((m) => m.currentHp),
    );
  });

  it("travelTo appends exactly one Traveled event via campaign apply", () => {
    const state = createCampaignState(createDefaultParty(), M3_DEMO_GRAPH);
    const result = travelTo(state, M3_DEMO_GRAPH, "site_drowned_market");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.state.currentSiteId).toBe("site_drowned_market");
    expect(result.events).toHaveLength(1);
    expect(result.events[0]!.type).toBe("Traveled");
    expect(result.events[0]!.payload.from_site_id).toBe("site_cinder_gate");
    expect(result.events[0]!.payload.to_site_id).toBe("site_drowned_market");
    expect(result.state.eventLog).toHaveLength(1);
  });

  it("triggerStoryBeat appends StoryBeatTriggered for valid site and beat", () => {
    let state = createCampaignState(createDefaultParty(), M3_DEMO_GRAPH);
    const travel = travelTo(state, M3_DEMO_GRAPH, "site_drowned_market");
    if (!travel.ok) throw new Error("travel failed");
    state = travel.state;

    const beat = triggerStoryBeat(state, M3_DEMO_GRAPH, "beat_drowned_market_echoes");
    expect(beat.ok).toBe(true);
    if (!beat.ok) return;

    expect(beat.events).toHaveLength(1);
    expect(beat.events[0]!.type).toBe("StoryBeatTriggered");
    expect(beat.events[0]!.payload.beat_id).toBe("beat_drowned_market_echoes");
    expect(beat.events[0]!.payload.site_id).toBe("site_drowned_market");
    expect(beat.state.eventLog).toHaveLength(2);
  });

  it("triggerStoryBeat rejects unknown beat and wrong site", () => {
    const atGate = createCampaignState(createDefaultParty(), M3_DEMO_GRAPH);
    const wrongBeat = triggerStoryBeat(atGate, M3_DEMO_GRAPH, "beat_unknown");
    expect(wrongBeat.ok).toBe(false);

    const wrongSite = triggerStoryBeat(atGate, M3_DEMO_GRAPH, "beat_drowned_market_echoes");
    expect(wrongSite.ok).toBe(false);
  });

  it("mechanical campaign state is identical whether narrator formatters run or not", () => {
    let stateA = createCampaignState(createDefaultParty(), M3_DEMO_GRAPH);
    let stateB = createCampaignState(createDefaultParty(), M3_DEMO_GRAPH);

    const travelA = travelTo(stateA, M3_DEMO_GRAPH, "site_drowned_market");
    const travelB = travelTo(stateB, M3_DEMO_GRAPH, "site_drowned_market");
    if (!travelA.ok || !travelB.ok) throw new Error("travel failed");
    stateA = travelA.state;
    stateB = travelB.state;

    formatEvents(travelB.events, {
      entityLabels: {},
      siteLabel: "Drowned Market",
    });

    const beatA = triggerStoryBeat(stateA, M3_DEMO_GRAPH, "beat_drowned_market_echoes");
    const beatB = triggerStoryBeat(stateB, M3_DEMO_GRAPH, "beat_drowned_market_echoes");
    if (!beatA.ok || !beatB.ok) throw new Error("beat failed");

    formatEvents(beatB.events, {
      entityLabels: {},
      siteLabel: "Drowned Market",
    });
    formatBeat("beat_drowned_market_echoes", { entityLabels: {}, siteLabel: "Drowned Market" });

    expect(mechanicalSnapshot(beatA.state)).toEqual(mechanicalSnapshot(beatB.state));
  });

  it("applyCombatResultToCampaign preserves campaign eventLog", () => {
    let campaign = campaignAt("site_cinder_gate");
    const travel = travelTo(campaign, M3_DEMO_GRAPH, "site_drowned_market");
    if (!travel.ok) throw new Error("travel failed");
    campaign = travel.state;

    const combat = createInitialState(
      buildEncounterForSite(campaign, M3_DEMO_GRAPH, M4_DEMO_ENCOUNTERS),
    );
    const fighterId = campaign.party.members[0].id as EntityId;
    const merged = applyCombatResultToCampaign(campaign, combat);

    expect(merged.eventLog).toHaveLength(1);
    expect(merged.eventLog[0]!.type).toBe("Traveled");
    expect(merged.currentSiteId).toBe("site_drowned_market");
    expect(merged.party.members.find((m) => m.id === fighterId)?.currentHp).toBeDefined();
  });
});
