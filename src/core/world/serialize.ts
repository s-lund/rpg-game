import type { CampaignState } from "./types";
import { deriveEntityBlueprint } from "../characters/derive";
import { M2_SUBSET } from "../characters/subset";
import { validateParty } from "../characters/validate";
import type { CharacterDraft, PartyDraft } from "../characters/types";

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

  const partyWithHp = ensurePartyHpFromSave(parsed.party);
  const validation = validateParty(partyWithHp);
  if (!validation.ok) {
    throw new Error(validation.errors.join("; "));
  }

  return {
    party: partyWithHp,
    graphId: parsed.graphId,
    currentSiteId: parsed.currentSiteId,
  };
}

function ensurePartyHpFromSave(party: PartyDraft): PartyDraft {
  const members = party.members.map((member) => {
    const draft = member as CharacterDraft & { currentHp?: number };
    if (typeof draft.currentHp === "number") {
      return draft as CharacterDraft;
    }
    const slot = M2_SUBSET.partySlots.find((s) => s.classId === member.classId);
    const spawn = slot?.spawn ?? { x: 0, y: 0 };
    const maxHp = deriveEntityBlueprint({ ...member, currentHp: 0 }, spawn).maxHp;
    return { ...member, currentHp: maxHp };
  });
  return { members: members as [CharacterDraft, CharacterDraft] };
}
