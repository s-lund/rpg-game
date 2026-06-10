import { describe, expect, it } from "vitest";
import {
  createCampaignState,
  createDefaultParty,
  findTravelPath,
  getTravelDestinations,
  markSiteHeld,
  M3_DEMO_GRAPH,
  travelTo,
} from "../../src/core/index";

describe("world pathfinding", () => {
  it("cannot reach distant site when intermediates are hostile", () => {
    const state = createCampaignState(createDefaultParty(), M3_DEMO_GRAPH);
    expect(findTravelPath(state, M3_DEMO_GRAPH, "site_bell_tower_ruins")).toBeNull();
    expect(getTravelDestinations(state, M3_DEMO_GRAPH).sort()).toEqual([
      "site_ash_foundry",
      "site_drowned_market",
    ]);
  });

  it("can reach distant site when corridor is held", () => {
    let state = createCampaignState(createDefaultParty(), M3_DEMO_GRAPH);
    state = { ...state, currentSiteId: "site_drowned_market" };
    state = markSiteHeld(state, M3_DEMO_GRAPH);
    state = { ...state, currentSiteId: "site_ash_foundry" };
    state = markSiteHeld(state, M3_DEMO_GRAPH);

    const path = findTravelPath(state, M3_DEMO_GRAPH, "site_bell_tower_ruins");
    expect(path).toEqual([
      "site_ash_foundry",
      "site_bell_tower_ruins",
    ]);

    const result = travelTo(state, M3_DEMO_GRAPH, "site_bell_tower_ruins");
    expect(result.ok).toBe(true);
  });

  it("can skip ahead to a distant held site", () => {
    let state = createCampaignState(createDefaultParty(), M3_DEMO_GRAPH);
    state = { ...state, currentSiteId: "site_drowned_market" };
    state = markSiteHeld(state, M3_DEMO_GRAPH);

    expect(findTravelPath(state, M3_DEMO_GRAPH, "site_ash_foundry")).toEqual([
      "site_drowned_market",
      "site_ash_foundry",
    ]);
  });
});
