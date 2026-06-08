import type { PartyDraft } from "./types";
import { validateParty } from "./validate";

const PARTY_SCHEMA = "emberwatch.party" as const;
const PARTY_VERSION = 1 as const;

interface SerializedParty {
  schema: typeof PARTY_SCHEMA;
  version: typeof PARTY_VERSION;
  members: PartyDraft["members"];
}

export function serializeParty(party: PartyDraft): string {
  const payload: SerializedParty = {
    schema: PARTY_SCHEMA,
    version: PARTY_VERSION,
    members: party.members,
  };
  return JSON.stringify(payload);
}

export function deserializeParty(json: string): PartyDraft {
  const parsed = JSON.parse(json) as SerializedParty;
  if (parsed.schema !== PARTY_SCHEMA || parsed.version !== PARTY_VERSION) {
    throw new Error("unsupported party serialization format");
  }
  if (!Array.isArray(parsed.members) || parsed.members.length !== 2) {
    throw new Error("party must contain exactly 2 members");
  }
  const party: PartyDraft = { members: parsed.members };
  const validation = validateParty(party);
  if (!validation.ok) {
    throw new Error(validation.errors.join("; "));
  }
  return party;
}
