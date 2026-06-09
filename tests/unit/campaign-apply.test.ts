import { describe, expect, it } from "vitest";
import { M3_DEMO_GRAPH } from "../../src/core/scenarios/m3-demo";
import { applyCampaignEffect } from "../../src/core/world/campaign-apply";
import { createCampaignState, travelTo, triggerStoryBeat } from "../../src/core/world/travel";
import { createDefaultParty } from "../../src/core/characters/validate";

describe("campaign apply", () => {
  it("travel emits Traveled and updates site", () => {
    const state = createCampaignState(createDefaultParty(), M3_DEMO_GRAPH);
    const result = travelTo(state, M3_DEMO_GRAPH, "site_drowned_market");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.currentSiteId).toBe("site_drowned_market");
    expect(result.events[0]!.type).toBe("Traveled");
  });

  it("RecordStoryBeat does not change site or party", () => {
    let state = createCampaignState(createDefaultParty(), M3_DEMO_GRAPH);
    const travel = travelTo(state, M3_DEMO_GRAPH, "site_drowned_market");
    if (!travel.ok) throw new Error("travel failed");
    state = travel.state;
    const hpBefore = state.party.members.map((m) => m.currentHp);

    const beat = triggerStoryBeat(state, M3_DEMO_GRAPH, "beat_drowned_market_echoes");
    expect(beat.ok).toBe(true);
    if (!beat.ok) return;

    expect(beat.state.currentSiteId).toBe("site_drowned_market");
    expect(beat.state.party.members.map((m) => m.currentHp)).toEqual(hpBefore);
    expect(beat.events[0]!.type).toBe("StoryBeatTriggered");
  });

  it("applyCampaignEffect is append-only on eventLog", () => {
    const state = createCampaignState(createDefaultParty(), M3_DEMO_GRAPH);
    const actorId = state.party.members[0]!.id;
    const { state: next, events } = applyCampaignEffect(
      { kind: "TravelTo", effectId: "eff_test", targetSiteId: "site_drowned_market" },
      state,
      { seq: 1, actorId, actionId: "act_test" },
    );
    expect(events).toHaveLength(1);
    expect(next.eventLog).toHaveLength(1);
    expect(state.eventLog).toHaveLength(0);
  });
});
