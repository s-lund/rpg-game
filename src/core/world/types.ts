import type { SiteId } from "../../shared/ids";
import type { PartyDraft } from "../characters/types";

export interface WorldSite {
  id: SiteId;
  label: string;
  tier: number;
  /** Map position as percentage of overworld width (0–100). */
  mapX: number;
  /** Map position as percentage of overworld height (0–100). */
  mapY: number;
}

export interface WorldEdge {
  from: SiteId;
  to: SiteId;
  bidirectional: boolean;
}

export interface WorldGraph {
  id: string;
  sites: WorldSite[];
  edges: WorldEdge[];
  startSiteId: SiteId;
}

export interface CampaignState {
  party: PartyDraft;
  graphId: string;
  currentSiteId: SiteId;
}

export type TravelResult =
  | { ok: true; state: CampaignState }
  | { ok: false; errors: string[] };
