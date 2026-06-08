import { describe, expect, it } from "vitest";
import {
  apply,
  applyCombatResultToCampaign,
  buildEncounterForSite,
  createCampaignState,
  createInitialState,
  M3_DEMO_GRAPH,
  M4_DEMO_ENCOUNTERS,
  validateWorldGraphEncounters,
} from "../../src/core/index";
import type { EntityId } from "../../src/shared/ids";
import { createDefaultParty } from "../../src/core/characters/validate";

describe("world transition", () => {
  it("validateWorldGraphEncounters rejects unknown encounterId", () => {
    const badGraph = {
      ...M3_DEMO_GRAPH,
      sites: [
        {
          ...M3_DEMO_GRAPH.sites[0]!,
          encounterId: "enc_missing" as const,
        },
      ],
    };
    const result = validateWorldGraphEncounters(badGraph, M4_DEMO_ENCOUNTERS);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("enc_missing"))).toBe(true);
    }
  });

  it("validateWorldGraphEncounters accepts M3 demo graph", () => {
    const result = validateWorldGraphEncounters(M3_DEMO_GRAPH, M4_DEMO_ENCOUNTERS);
    expect(result).toEqual({ ok: true });
  });

  it("per-site enemy configs differ by enemy ids", () => {
    const campaign = createCampaignState(createDefaultParty(), M3_DEMO_GRAPH);
    const gateConfig = buildEncounterForSite(campaign, M3_DEMO_GRAPH, M4_DEMO_ENCOUNTERS);
    const marketCampaign = {
      ...campaign,
      currentSiteId: "site_drowned_market" as const,
    };
    const marketConfig = buildEncounterForSite(
      marketCampaign,
      M3_DEMO_GRAPH,
      M4_DEMO_ENCOUNTERS,
    );
    expect(gateConfig.enemies.map((e) => e.id)).not.toEqual(marketConfig.enemies.map((e) => e.id));
  });

  it("applyCombatResultToCampaign clamps hp to 0..maxHp", () => {
    const campaign = createCampaignState(createDefaultParty(), M3_DEMO_GRAPH);
    const config = buildEncounterForSite(campaign, M3_DEMO_GRAPH, M4_DEMO_ENCOUNTERS);
    let combat = createInitialState(config);

    const fighterId = campaign.party.members[0].id as EntityId;
    const overkill = 999;
    const { state } = apply(
      {
        kind: "Damage",
        effectId: "eff_overkill",
        targetId: fighterId,
        amount: overkill,
        damageType: "slashing",
      },
      combat,
      { seq: 1, turn: 1, actorId: fighterId, actionId: "act_overkill" },
    );
    combat = state;

    const merged = applyCombatResultToCampaign(campaign, combat);
    expect(merged.party.members[0].currentHp).toBe(0);
  });

  it("buildEncounterForSite uses campaign currentHp for party entities", () => {
    const campaign = createCampaignState(createDefaultParty(), M3_DEMO_GRAPH);
    campaign.party.members[0].currentHp = 7;
    const config = buildEncounterForSite(campaign, M3_DEMO_GRAPH, M4_DEMO_ENCOUNTERS);
    const fighterBlueprint = config.party.find((p) => p.id === campaign.party.members[0].id)!;
    expect(fighterBlueprint.currentHp).toBe(7);

    const state = createInitialState(config);
    expect(state.entities[campaign.party.members[0].id]!.hp).toBe(7);
  });
});
