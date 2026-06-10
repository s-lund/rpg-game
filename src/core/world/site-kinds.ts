import { isSiteHeld } from "./reclamation";
import type { CampaignState, SiteKind, WorldSite } from "./types";

export function resolveSiteKind(site: WorldSite): SiteKind {
  return site.siteKind ?? "combat";
}

export function siteHasCombatEncounter(site: WorldSite): boolean {
  return resolveSiteKind(site) === "combat" && Boolean(site.encounterId);
}

export function shouldFightOnArrival(state: CampaignState, site: WorldSite): boolean {
  return siteHasCombatEncounter(site) && !isSiteHeld(state, site.id);
}
