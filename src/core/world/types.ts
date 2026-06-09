import type { BeatId, EncounterId, SiteId } from "../../shared/ids";
import type { PartyDraft } from "../characters/types";
import type { GameEvent } from "../types";

export interface WorldSite {
  id: SiteId;
  label: string;
  tier: number;
  encounterId: EncounterId;
  beatId?: BeatId;
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
  eventLog: GameEvent[];
  nextSeq: number;
}

export type TravelResult =
  | { ok: true; state: CampaignState; events: GameEvent[] }
  | { ok: false; errors: string[] };
