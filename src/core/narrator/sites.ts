import type { SiteId } from "../../shared/ids";

/** Short ambient prose per overworld site (PROCEDURAL template catalog). */
const SITE_AMBIENCE: Record<SiteId, string> = {
  site_cinder_gate:
    "Soot-stained archways frame the frontier. Embers drift on a stale wind.",
  site_drowned_market:
    "Shallow water reflects collapsed stall-fronts. The air smells of rust and salt.",
  site_ash_foundry:
    "Heat ghosts rise from slag heaps. Somewhere, metal still ticks as it cools.",
  site_bell_tower_ruins:
    "A cracked bell hangs mute above the ward. Pigeons scatter from empty niches.",
};

export function formatSiteAmbience(siteId: SiteId, siteLabel?: string): string {
  return SITE_AMBIENCE[siteId] ?? `The ruins of ${siteLabel ?? siteId} wait in silence.`;
}
