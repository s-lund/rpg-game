import { describe, expect, it } from "vitest";
import {
  applyCombatResultToCampaign,
  buildEncounterForSite,
  createCampaignState,
  createDefaultParty,
  createInitialState,
  DEFAULT_DISTRICT_BRIEF,
  generateDistrictFromBrief,
  validateDistrict,
  validateWorldGraph,
  validateWorldGraphEncounters,
} from "../../src/core/index";

describe("district generator", () => {
  it("produces a district that passes validation", () => {
    for (const seed of [1, 42, 99, 12345]) {
      const pkg = generateDistrictFromBrief(DEFAULT_DISTRICT_BRIEF, seed);
      expect(validateDistrict(pkg.district)).toEqual({ ok: true });
      expect(validateWorldGraph(pkg.worldGraph)).toEqual({ ok: true });
      expect(validateWorldGraph(pkg.interiorGraph)).toEqual({ ok: true });
      expect(validateWorldGraphEncounters(pkg.interiorGraph, pkg.encounters)).toEqual({ ok: true });
    }
  });

  it("tier increases toward center areas", () => {
    const pkg = generateDistrictFromBrief(DEFAULT_DISTRICT_BRIEF, 42);
    const tiers = pkg.district.areas.map((a) => a.tier);
    expect(pkg.worldGraph.sites).toHaveLength(1);
    expect(pkg.interiorGraph.sites.length).toBeGreaterThan(1);
    expect(tiers[0]).toBeLessThanOrEqual(tiers[tiers.length - 1]!);
    expect(tiers[tiers.length - 1]).toBe(DEFAULT_DISTRICT_BRIEF.maxTier);
  });

  it("generated encounters work through transition API", () => {
    const pkg = generateDistrictFromBrief(DEFAULT_DISTRICT_BRIEF, 7);
    const campaign = createCampaignState(createDefaultParty(), pkg.worldGraph, pkg.interiorGraph);
    const interiorCampaign = { ...campaign, currentSiteId: pkg.interiorGraph.startSiteId };
    const config = buildEncounterForSite(interiorCampaign, pkg.interiorGraph, pkg.encounters);
    const combat = createInitialState(config);
    const merged = applyCombatResultToCampaign(campaign, combat);
    expect(merged.currentSiteId).toBe(pkg.worldGraph.startSiteId);
    expect(pkg.interiorGraph.startSiteId).toBeDefined();
    expect(merged.party.members.length).toBe(2);
  });
});
