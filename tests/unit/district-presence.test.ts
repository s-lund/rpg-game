import { describe, expect, it } from "vitest";
import {
  createCampaignState,
  createDefaultParty,
  enterDistrict,
  exitDistrictToWorld,
  generateDistrictFromBrief,
  DEFAULT_DISTRICT_BRIEF,
  isDistrictEntrance,
  moveInDistrict,
  validateExitDistrict,
} from "../../src/core/index";

describe("district presence", () => {
  const pkg = generateDistrictFromBrief(DEFAULT_DISTRICT_BRIEF, 42);

  it("enters district at interior entrance", () => {
    const world = createCampaignState(createDefaultParty(), pkg.worldGraph, pkg.interiorGraph);
    const worldSite = pkg.worldGraph.sites[0]!;
    const inside = enterDistrict(world, pkg.district, pkg.interiorGraph, worldSite.id);
    expect(inside.mapLayer).toBe("district");
    expect(inside.currentAreaSiteId).toBe(pkg.interiorGraph.startSiteId);
  });

  it("can only exit to world map from district entrance", () => {
    let state = createCampaignState(createDefaultParty(), pkg.worldGraph, pkg.interiorGraph);
    const worldSite = pkg.worldGraph.sites[0]!;
    state = enterDistrict(state, pkg.district, pkg.interiorGraph, worldSite.id);
    const entrance = pkg.interiorGraph.startSiteId;
    expect(validateExitDistrict(state, pkg.district)).toEqual([]);
    expect(isDistrictEntrance(pkg.district, entrance)).toBe(true);

    const deeper = pkg.interiorGraph.sites[2]!;
    state = { ...state, currentAreaSiteId: deeper.id };
    expect(validateExitDistrict(state, pkg.district).length).toBeGreaterThan(0);

    state = exitDistrictToWorld(state);
    expect(state.mapLayer).toBe("world");
  });

  it("moves between adjacent interior areas", () => {
    let state = createCampaignState(createDefaultParty(), pkg.worldGraph, pkg.interiorGraph);
    state = enterDistrict(state, pkg.district, pkg.interiorGraph, pkg.worldGraph.sites[0]!.id);
    const neighborSiteId = pkg.interiorGraph.edges[0]!.to;
    const neighborSite = pkg.interiorGraph.sites.find((s) => s.id === neighborSiteId)!;
    const moved = moveInDistrict(state, pkg.interiorGraph, neighborSite.id);
    expect(moved.ok).toBe(true);
  });
});
