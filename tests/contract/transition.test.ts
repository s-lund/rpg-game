/**
 * FROZEN — world↔combat transition contract (M4).
 * Party/campaign state owned by core; site loads correct encounter;
 * combat end merges HP into CampaignState; serialize round-trips.
 * Do not modify, weaken, skip, or delete.
 */
import { describe, expect, it } from "vitest";
import {
  apply,
  applyCombatResultToCampaign,
  buildEncounterForSite,
  createCampaignState,
  createInitialState,
  M3_DEMO_GRAPH,
  M4_DEMO_ENCOUNTERS,
  serializeCampaign,
  deserializeCampaign,
  type CampaignState,
  type GameState,
} from "../../src/core/index";
import { createDefaultParty } from "../../src/core/characters/validate";
import type { EntityId } from "../../src/shared/ids";

function campaignAt(siteId: CampaignState["currentSiteId"]): CampaignState {
  const party = createDefaultParty();
  party.members[0].name = "Bran";
  party.members[1].name = "Lyra";
  const state = createCampaignState(party, M3_DEMO_GRAPH);
  return siteId === state.currentSiteId ? state : { ...state, currentSiteId: siteId };
}

function enterCombat(campaign: CampaignState): GameState {
  const config = buildEncounterForSite(campaign, M3_DEMO_GRAPH, M4_DEMO_ENCOUNTERS);
  return createInitialState(config);
}

describe("transition contract (M4)", () => {
  it("each demo site loads its own encounter enemies", () => {
    const enemySets: string[][] = [];

    for (const site of M3_DEMO_GRAPH.sites) {
      const campaign = campaignAt(site.id);
      const config = buildEncounterForSite(campaign, M3_DEMO_GRAPH, M4_DEMO_ENCOUNTERS);
      const enemyIds = config.enemies.map((e) => e.id).sort();
      enemySets.push(enemyIds);
      expect(config.enemies.length).toBeGreaterThan(0);
      expect(config.width).toBeGreaterThan(0);
      expect(config.height).toBeGreaterThan(0);
    }

    const unique = new Set(enemySets.map((ids) => ids.join(",")));
    expect(unique.size).toBe(M3_DEMO_GRAPH.sites.length);
  });

  it("party identity survives enter and exit combat", () => {
    const campaign = campaignAt("site_drowned_market");
    const beforeIds = campaign.party.members.map((m) => m.id);
    const beforeNames = campaign.party.members.map((m) => m.name);

    const combat = enterCombat(campaign);
    const after = applyCombatResultToCampaign(campaign, combat);

    expect(after.party.members.map((m) => m.id)).toEqual(beforeIds);
    expect(after.party.members.map((m) => m.name)).toEqual(beforeNames);
  });

  it("combat damage merges currentHp back into campaign party", () => {
    const campaign = campaignAt("site_cinder_gate");
    let combat = enterCombat(campaign);

    const fighterId = campaign.party.members[0].id as EntityId;
    const hpBefore = campaign.party.members[0].currentHp;
    const damageAmount = 5;
    const { state } = apply(
      {
        kind: "Damage",
        effectId: "eff_transition_test",
        targetId: fighterId,
        amount: damageAmount,
        damageType: "slashing",
      },
      combat,
      { seq: 1, turn: 1, actorId: fighterId, actionId: "act_transition_test" },
    );
    combat = state;

    const fighterEntity = combat.entities[fighterId]!;
    const expectedHp = fighterEntity.hp;

    const merged = applyCombatResultToCampaign(campaign, combat);
    const mergedFighter = merged.party.members.find((m) => m.id === fighterId)!;

    expect(mergedFighter.currentHp).toBe(expectedHp);
    expect(mergedFighter.currentHp).toBe(hpBefore - damageAmount);
  });

  it("currentSiteId unchanged after combat exit", () => {
    const campaign = campaignAt("site_ash_foundry");
    const combat = enterCombat(campaign);
    const merged = applyCombatResultToCampaign(campaign, combat);

    expect(merged.currentSiteId).toBe("site_ash_foundry");
    expect(merged.graphId).toBe(campaign.graphId);
  });

  it("serialize round-trip preserves site, names, and currentHp after combat", () => {
    const campaign = campaignAt("site_drowned_market");
    let combat = enterCombat(campaign);

    const rogueId = campaign.party.members[1].id as EntityId;
    const { state } = apply(
      {
        kind: "Damage",
        effectId: "eff_transition_serialize",
        targetId: rogueId,
        amount: 3,
        damageType: "piercing",
      },
      combat,
      { seq: 1, turn: 1, actorId: rogueId, actionId: "act_transition_serialize" },
    );
    combat = state;

    const merged = applyCombatResultToCampaign(campaign, combat);
    const json = serializeCampaign(merged);
    const restored = deserializeCampaign(json);

    expect(restored.currentSiteId).toBe("site_drowned_market");
    expect(restored.party.members[0].name).toBe("Bran");
    expect(restored.party.members[1].name).toBe("Lyra");
    expect(restored.party.members[1].currentHp).toBe(combat.entities[rogueId]!.hp);
  });
});
