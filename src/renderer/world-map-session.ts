import {
  createCampaignState,
  travelTo,
  type CampaignState,
  type PartyDraft,
  type SiteId,
  type WorldGraph,
} from "../core/index";

/** Thin bridge: owns campaign state, emits updates to read-only consumers. */
export class WorldMapSession {
  private state: CampaignState;
  private readonly listeners = new Set<(state: CampaignState) => void>();

  constructor(graph: WorldGraph, party: PartyDraft, initialState?: CampaignState) {
    this.state = initialState ?? createCampaignState(party, graph);
    if (this.state.graphId !== graph.id) {
      throw new Error(`campaign graphId mismatch: ${this.state.graphId} vs ${graph.id}`);
    }
  }

  getState(): CampaignState {
    return this.state;
  }

  subscribe(listener: (state: CampaignState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  travelTo(graph: WorldGraph, targetSiteId: SiteId): boolean {
    const result = travelTo(this.state, graph, targetSiteId);
    if (!result.ok) {
      return false;
    }
    this.state = result.state;
    for (const listener of this.listeners) {
      listener(this.state);
    }
    return true;
  }
}
