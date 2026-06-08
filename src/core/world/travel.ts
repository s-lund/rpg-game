import type { SiteId } from "../../shared/ids";
import { deriveEntityBlueprint } from "../characters/derive";
import { M2_SUBSET } from "../characters/subset";
import type { CharacterDraft, PartyDraft } from "../characters/types";
import type { CampaignState, TravelResult, WorldGraph } from "./types";
import { getNeighbors, validateWorldGraph } from "./validate";

function ensurePartyHp(party: PartyDraft): PartyDraft {
  const members = party.members.map((member) => {
    if (typeof member.currentHp === "number") {
      return member;
    }
    const slot = M2_SUBSET.partySlots.find((s) => s.classId === member.classId);
    const spawn = slot?.spawn ?? { x: 0, y: 0 };
    const maxHp = deriveEntityBlueprint(member, spawn).maxHp;
    return { ...member, currentHp: maxHp };
  });
  return { members: members as [CharacterDraft, CharacterDraft] };
}

export function createCampaignState(party: PartyDraft, graph: WorldGraph): CampaignState {
  const validation = validateWorldGraph(graph);
  if (!validation.ok) {
    throw new Error(validation.errors.join("; "));
  }

  return {
    party: ensurePartyHp(party),
    graphId: graph.id,
    currentSiteId: graph.startSiteId,
  };
}

export function canTravelTo(
  state: CampaignState,
  graph: WorldGraph,
  targetSiteId: SiteId,
): boolean {
  if (state.graphId !== graph.id) {
    return false;
  }
  return getNeighbors(graph, state.currentSiteId).includes(targetSiteId);
}

export function travelTo(
  state: CampaignState,
  graph: WorldGraph,
  targetSiteId: SiteId,
): TravelResult {
  if (state.graphId !== graph.id) {
    return { ok: false, errors: [`campaign graphId mismatch: ${state.graphId} vs ${graph.id}`] };
  }

  const neighbors = getNeighbors(graph, state.currentSiteId);
  if (!neighbors.includes(targetSiteId)) {
    return {
      ok: false,
      errors: [`${targetSiteId} is not a neighbor of ${state.currentSiteId}`],
    };
  }

  return {
    ok: true,
    state: {
      ...state,
      currentSiteId: targetSiteId,
    },
  };
}
