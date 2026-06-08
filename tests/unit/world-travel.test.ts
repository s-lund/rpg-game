import { describe, expect, it } from "vitest";
import { createDefaultParty } from "../../src/core/characters/validate";
import { M3_DEMO_GRAPH } from "../../src/core/scenarios/m3-demo";
import { deserializeCampaign, serializeCampaign } from "../../src/core/world/serialize";
import {
  canTravelTo,
  createCampaignState,
  travelTo,
} from "../../src/core/world/travel";
import { getNeighbors } from "../../src/core/world/validate";

describe("world travel", () => {
  it("createCampaignState starts at graph startSiteId", () => {
    const party = createDefaultParty();
    const state = createCampaignState(party, M3_DEMO_GRAPH);
    expect(state.currentSiteId).toBe("site_cinder_gate");
    expect(state.graphId).toBe("m3_demo");
    expect(state.party).toEqual(party);
  });

  it("travelTo updates currentSiteId for valid neighbor", () => {
    const state = createCampaignState(createDefaultParty(), M3_DEMO_GRAPH);
    const result = travelTo(state, M3_DEMO_GRAPH, "site_drowned_market");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.currentSiteId).toBe("site_drowned_market");
    }
  });

  it("travelTo rejects non-neighbor site", () => {
    const state = createCampaignState(createDefaultParty(), M3_DEMO_GRAPH);
    const result = travelTo(state, M3_DEMO_GRAPH, "site_bell_tower_ruins");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("neighbor"))).toBe(true);
    }
  });

  it("travelTo rejects unknown site", () => {
    const state = createCampaignState(createDefaultParty(), M3_DEMO_GRAPH);
    const result = travelTo(state, M3_DEMO_GRAPH, "site_nowhere");
    expect(result.ok).toBe(false);
  });

  it("canTravelTo reflects neighbor graph", () => {
    const state = createCampaignState(createDefaultParty(), M3_DEMO_GRAPH);
    expect(canTravelTo(state, M3_DEMO_GRAPH, "site_drowned_market")).toBe(true);
    expect(canTravelTo(state, M3_DEMO_GRAPH, "site_bell_tower_ruins")).toBe(false);
  });

  it("neighbors update after chained travel A → B → C", () => {
    let state = createCampaignState(createDefaultParty(), M3_DEMO_GRAPH);

    const toMarket = travelTo(state, M3_DEMO_GRAPH, "site_drowned_market");
    expect(toMarket.ok).toBe(true);
    if (!toMarket.ok) return;
    state = toMarket.state;
    expect(getNeighbors(M3_DEMO_GRAPH, state.currentSiteId).sort()).toEqual([
      "site_ash_foundry",
      "site_cinder_gate",
    ]);

    const toFoundry = travelTo(state, M3_DEMO_GRAPH, "site_ash_foundry");
    expect(toFoundry.ok).toBe(true);
    if (!toFoundry.ok) return;
    state = toFoundry.state;
    expect(getNeighbors(M3_DEMO_GRAPH, state.currentSiteId).sort()).toEqual([
      "site_bell_tower_ruins",
      "site_drowned_market",
    ]);

    const toBell = travelTo(state, M3_DEMO_GRAPH, "site_bell_tower_ruins");
    expect(toBell.ok).toBe(true);
    if (!toBell.ok) return;
    state = toBell.state;
    expect(state.currentSiteId).toBe("site_bell_tower_ruins");
    expect(getNeighbors(M3_DEMO_GRAPH, state.currentSiteId)).toEqual(["site_ash_foundry"]);
  });

  it("serialize round-trip preserves site after travel", () => {
    const party = createDefaultParty();
    party.members[0].name = "Bran";
    party.members[1].name = "Lyra";
    let state = createCampaignState(party, M3_DEMO_GRAPH);

    const step1 = travelTo(state, M3_DEMO_GRAPH, "site_drowned_market");
    if (!step1.ok) throw new Error("travel failed");
    const step2 = travelTo(step1.state, M3_DEMO_GRAPH, "site_ash_foundry");
    if (!step2.ok) throw new Error("travel failed");

    const json = serializeCampaign(step2.state);
    const restored = deserializeCampaign(json);

    expect(restored.currentSiteId).toBe("site_ash_foundry");
    expect(restored.graphId).toBe("m3_demo");
    expect(restored.party.members[0].name).toBe("Bran");
    expect(restored.party.members[1].name).toBe("Lyra");
    expect(restored.party.members[0].abilities).toEqual(
      step2.state.party.members[0].abilities,
    );
  });

  it("deserializeCampaign rejects bad schema", () => {
    expect(() =>
      deserializeCampaign(JSON.stringify({ schema: "wrong", version: 1 })),
    ).toThrow();
  });

  it("deserializeCampaign rejects invalid party", () => {
    const bad = JSON.stringify({
      schema: "emberwatch.campaign",
      version: 1,
      graphId: "m3_demo",
      currentSiteId: "site_cinder_gate",
      party: { members: [] },
    });
    expect(() => deserializeCampaign(bad)).toThrow();
  });
});
