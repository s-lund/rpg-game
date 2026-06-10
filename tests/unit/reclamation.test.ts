import { describe, expect, it } from "vitest";
import {
  createCampaignState,
  createDefaultParty,
  getSiteControl,
  isSiteHeld,
  markSiteHeld,
  countHeldSites,
  M3_DEMO_GRAPH,
} from "../../src/core/index";

describe("site reclamation", () => {
  it("initializes all sites as hostile", () => {
    const state = createCampaignState(createDefaultParty(), M3_DEMO_GRAPH);
    for (const site of M3_DEMO_GRAPH.sites) {
      expect(getSiteControl(state, site.id)).toBe("hostile");
    }
  });

  it("marks current site held after victory path", () => {
    let state = createCampaignState(createDefaultParty(), M3_DEMO_GRAPH);
    state = markSiteHeld(state, M3_DEMO_GRAPH);
    expect(isSiteHeld(state, "site_cinder_gate")).toBe(true);
    expect(state.eventLog.some((e) => e.type === "SiteHeld")).toBe(true);
  });

  it("is idempotent when site already held", () => {
    let state = createCampaignState(createDefaultParty(), M3_DEMO_GRAPH);
    state = markSiteHeld(state, M3_DEMO_GRAPH);
    const logLen = state.eventLog.length;
    const again = markSiteHeld(state, M3_DEMO_GRAPH);
    expect(again.eventLog.length).toBe(logLen);
  });

  it("counts held sites", () => {
    let state = createCampaignState(createDefaultParty(), M3_DEMO_GRAPH);
    state = markSiteHeld(state, M3_DEMO_GRAPH);
    const counts = countHeldSites(state, M3_DEMO_GRAPH);
    expect(counts.held).toBe(1);
    expect(counts.total).toBe(M3_DEMO_GRAPH.sites.length);
  });
});
