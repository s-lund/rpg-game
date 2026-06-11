import type { AreaId, BeatId, DistrictId, EncounterId, LevelId, SiteId } from "../../shared/ids";
import type { PartyDraft } from "../characters/types";
import type { GameEvent } from "../types";

export type SiteKind = "combat" | "shelter" | "quest";

export interface WorldSite {
  id: SiteId;
  label: string;
  tier: number;
  /** Required for combat sites; omitted for shelter/quest nodes. */
  encounterId?: EncounterId;
  siteKind?: SiteKind;
  areaId?: AreaId;
  /** World-map site that enters this district (no combat on world layer). */
  districtId?: DistrictId;
  /** District-interior level this site sits on (towers, dungeons). Omit on single-level maps. */
  levelId?: LevelId;
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

export type SiteControl = "hostile" | "held";

export type MapLayer = "world" | "district";

export interface CampaignState {
  party: PartyDraft;
  graphId: string;
  /** Position on the world map (strategic layer). */
  currentSiteId: SiteId;
  mapLayer: MapLayer;
  /** Active district and interior position when mapLayer === "district". */
  activeDistrictId?: DistrictId;
  currentAreaSiteId?: SiteId;
  siteControl: Record<SiteId, SiteControl>;
  eventLog: GameEvent[];
  nextSeq: number;
}

export type TravelResult =
  | { ok: true; state: CampaignState; events: GameEvent[] }
  | { ok: false; errors: string[] };
