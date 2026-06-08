import { deriveEntityBlueprint } from "./derive";
import { M2_SUBSET } from "./subset";
import type { CharacterDraft, PartyDraft } from "./types";
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
  const party = ensurePartyHpFromSave({ members: parsed.members });
  const validation = validateParty(party);
  if (!validation.ok) {
    throw new Error(validation.errors.join("; "));
  }
  return party;
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
