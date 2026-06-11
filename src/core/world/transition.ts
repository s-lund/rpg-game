import type { EncounterId } from "../../shared/ids";
import { derivePartyBlueprints } from "../characters/derive";
import type { GameState, InitialStateConfig } from "../types";
import type { EncounterTemplate } from "./encounters";
import type { CampaignState, WorldGraph } from "./types";

export function buildEncounterForSite(
  campaign: CampaignState,
  graph: WorldGraph,
  encounters: Record<EncounterId, EncounterTemplate>,
): InitialStateConfig {
  const site = graph.sites.find((s) => s.id === campaign.currentSiteId);
  if (!site) {
    throw new Error(`unknown site: ${campaign.currentSiteId}`);
  }

  if (!site.encounterId) {
    throw new Error(`site ${site.id} has no encounter`);
  }
  const template = encounters[site.encounterId];
  if (!template) {
    throw new Error(`unknown encounter: ${site.encounterId}`);
  }

  return {
    width: template.width,
    height: template.height,
    party: derivePartyBlueprints(campaign.party),
    enemies: template.enemies.map((e) => ({ ...e })),
  };
}

export function applyCombatResultToCampaign(
  campaign: CampaignState,
  gameState: GameState,
): CampaignState {
  const members = campaign.party.members.map((member) => {
    const entity = gameState.entities[member.id];
    if (!entity || entity.team !== "party") {
      return member;
    }
    const clampedHp = Math.max(0, Math.min(entity.hp, entity.maxHp));
    return {
      ...member,
      currentHp: clampedHp,
      ...(entity.spellSlots ? { spellSlots: entity.spellSlots.map((slot) => ({ ...slot })) } : {}),
    };
  });

  return {
    ...campaign,
    party: { members: members as CampaignState["party"]["members"] },
  };
}
