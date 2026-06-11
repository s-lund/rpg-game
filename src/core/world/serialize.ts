import type { CampaignState } from "./types";
import { deriveEntityBlueprint } from "../characters/derive";
import { M7_SUBSET } from "../characters/subset";
import { validateParty } from "../characters/validate";
import type { CharacterDraft, PartyDraft } from "../characters/types";
import type { DistrictId, SiteId } from "../../shared/ids";
import type { MapLayer, SiteControl } from "./types";
import { normalizeDistrictFields } from "./district-presence";

const CAMPAIGN_SCHEMA = "emberwatch.campaign" as const;
const CAMPAIGN_VERSION = 3 as const;

interface SerializedCampaignV1 {
  schema: typeof CAMPAIGN_SCHEMA;
  version: 1;
  graphId: string;
  currentSiteId: CampaignState["currentSiteId"];
  party: PartyDraft;
}

interface SerializedCampaignV2 {
  schema: typeof CAMPAIGN_SCHEMA;
  version: 2;
  graphId: string;
  currentSiteId: CampaignState["currentSiteId"];
  party: PartyDraft;
  siteControl?: Record<SiteId, SiteControl>;
}

interface SerializedCampaignV3 {
  schema: typeof CAMPAIGN_SCHEMA;
  version: typeof CAMPAIGN_VERSION;
  graphId: string;
  currentSiteId: CampaignState["currentSiteId"];
  party: PartyDraft;
  siteControl?: Record<SiteId, SiteControl>;
  mapLayer?: MapLayer;
  activeDistrictId?: DistrictId;
  currentAreaSiteId?: SiteId;
}

type SerializedCampaign = SerializedCampaignV1 | SerializedCampaignV2 | SerializedCampaignV3;

export function serializeCampaign(state: CampaignState): string {
  const payload: SerializedCampaignV3 = {
    schema: CAMPAIGN_SCHEMA,
    version: CAMPAIGN_VERSION,
    graphId: state.graphId,
    currentSiteId: state.currentSiteId,
    party: state.party,
    siteControl: state.siteControl,
    mapLayer: state.mapLayer,
    activeDistrictId: state.activeDistrictId,
    currentAreaSiteId: state.currentAreaSiteId,
  };
  return JSON.stringify(payload);
}

export function deserializeCampaign(json: string): CampaignState {
  const parsed = JSON.parse(json) as SerializedCampaign;
  if (parsed.schema !== CAMPAIGN_SCHEMA) {
    throw new Error("unsupported campaign serialization format");
  }
  if (parsed.version !== 1 && parsed.version !== 2 && parsed.version !== 3) {
    throw new Error("unsupported campaign serialization format");
  }
  if (!parsed.graphId || !parsed.currentSiteId) {
    throw new Error("campaign missing graphId or currentSiteId");
  }
  if (!parsed.party || !Array.isArray(parsed.party.members) || parsed.party.members.length !== 4) {
    throw new Error("campaign party must contain exactly 4 members");
  }

  const partyWithHp = ensurePartyHpFromSave(parsed.party);
  const validation = validateParty(partyWithHp);
  if (!validation.ok) {
    throw new Error(validation.errors.join("; "));
  }

  const siteControl: CampaignState["siteControl"] =
    (parsed.version === 2 || parsed.version === 3) && parsed.siteControl
      ? { ...parsed.siteControl }
      : {};

  const v3 = parsed.version === 3 ? (parsed as SerializedCampaignV3) : null;

  return normalizeDistrictFields({
    party: partyWithHp,
    graphId: parsed.graphId,
    currentSiteId: parsed.currentSiteId,
    mapLayer: v3?.mapLayer ?? "world",
    activeDistrictId: v3?.activeDistrictId,
    currentAreaSiteId: v3?.currentAreaSiteId,
    siteControl,
    eventLog: [],
    nextSeq: 1,
  });
}

function ensurePartyHpFromSave(party: PartyDraft): PartyDraft {
  const members = party.members.map((member) => {
    const draft = member as CharacterDraft & { currentHp?: number };
    if (typeof draft.currentHp === "number") {
      return draft as CharacterDraft;
    }
    const slot = M7_SUBSET.partySlots.find((s) => s.classId === member.classId);
    const spawn = slot?.spawn ?? { x: 0, y: 0 };
    const maxHp = deriveEntityBlueprint({ ...member, currentHp: 0 }, spawn).maxHp;
    return { ...member, currentHp: maxHp };
  });
  return { members: members as PartyDraft["members"] };
}
