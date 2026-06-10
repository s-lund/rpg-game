import { describe, expect, it } from "vitest";
import {
  createCampaignState,
  createDefaultParty,
  generateDistrictFromBrief,
  DEFAULT_DISTRICT_BRIEF,
  M3_DEMO_GRAPH,
  resolveSiteKind,
  shouldFightOnArrival,
  siteHasCombatEncounter,
  markSiteHeld,
} from "../../src/core/index";

describe("site kinds", () => {
  it("M3 demo sites are combat nodes", () => {
    for (const site of M3_DEMO_GRAPH.sites) {
      expect(resolveSiteKind(site)).toBe("combat");
      expect(siteHasCombatEncounter(site)).toBe(true);
    }
  });

  it("generated district includes a shelter site without combat", () => {
    const pkg = generateDistrictFromBrief(DEFAULT_DISTRICT_BRIEF, 42);
    const shelter = pkg.interiorGraph.sites.find((s) => resolveSiteKind(s) === "shelter");
    expect(shelter).toBeDefined();
    expect(siteHasCombatEncounter(shelter!)).toBe(false);
  });

  it("held sites should not fight on arrival", () => {
    const pkg = generateDistrictFromBrief(DEFAULT_DISTRICT_BRIEF, 42);
    let state = createCampaignState(createDefaultParty(), pkg.worldGraph, pkg.interiorGraph);
    const combatSite = pkg.interiorGraph.sites.find((s) => siteHasCombatEncounter(s))!;
    state = {
      ...state,
      mapLayer: "district",
      activeDistrictId: pkg.district.id,
      currentAreaSiteId: combatSite.id,
    };
    state = markSiteHeld(state, pkg.interiorGraph, combatSite.id);
    expect(shouldFightOnArrival(state, combatSite)).toBe(false);
  });
});
