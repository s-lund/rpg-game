import type { SiteId } from "../../shared/ids";
import type { PartyDraft } from "../characters/types";
import type { CampaignState, TravelResult, WorldGraph } from "./types";
import { getNeighbors, validateWorldGraph } from "./validate";

export function createCampaignState(party: PartyDraft, graph: WorldGraph): CampaignState {
  const validation = validateWorldGraph(graph);
  if (!validation.ok) {
    throw new Error(validation.errors.join("; "));
  }

  return {
    party,
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
