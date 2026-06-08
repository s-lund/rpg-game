import type { CampaignState } from "./types";
import { validateParty } from "../characters/validate";
import type { PartyDraft } from "../characters/types";

const CAMPAIGN_SCHEMA = "emberwatch.campaign" as const;
const CAMPAIGN_VERSION = 1 as const;

interface SerializedCampaign {
  schema: typeof CAMPAIGN_SCHEMA;
  version: typeof CAMPAIGN_VERSION;
  graphId: string;
  currentSiteId: CampaignState["currentSiteId"];
  party: PartyDraft;
}

export function serializeCampaign(state: CampaignState): string {
  const payload: SerializedCampaign = {
    schema: CAMPAIGN_SCHEMA,
    version: CAMPAIGN_VERSION,
    graphId: state.graphId,
    currentSiteId: state.currentSiteId,
    party: state.party,
  };
  return JSON.stringify(payload);
}

export function deserializeCampaign(json: string): CampaignState {
  const parsed = JSON.parse(json) as SerializedCampaign;
  if (parsed.schema !== CAMPAIGN_SCHEMA || parsed.version !== CAMPAIGN_VERSION) {
    throw new Error("unsupported campaign serialization format");
  }
  if (!parsed.graphId || !parsed.currentSiteId) {
    throw new Error("campaign missing graphId or currentSiteId");
  }
  if (!parsed.party || !Array.isArray(parsed.party.members) || parsed.party.members.length !== 2) {
    throw new Error("campaign party must contain exactly 2 members");
  }

  const validation = validateParty(parsed.party);
  if (!validation.ok) {
    throw new Error(validation.errors.join("; "));
  }

  return {
    party: parsed.party,
    graphId: parsed.graphId,
    currentSiteId: parsed.currentSiteId,
  };
}
