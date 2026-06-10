import {
  createCampaignState,
  normalizeDistrictFields,
  travelTo,
  triggerStoryBeat,
  type BeatId,
  type CampaignState,
  type GameEvent,
  type PartyDraft,
  type SiteId,
  type WorldGraph,
} from "../core/index";

/** Thin bridge: owns campaign state, emits updates to read-only consumers. */
export class WorldMapSession {
  private state: CampaignState;
  private readonly listeners = new Set<(state: CampaignState) => void>();
  private readonly eventListeners = new Set<(events: GameEvent[]) => void>();

  constructor(graph: WorldGraph, party: PartyDraft, initialState?: CampaignState) {
    this.state = initialState ?? createCampaignState(party, graph);
    if (this.state.graphId !== graph.id) {
      throw new Error(`campaign graphId mismatch: ${this.state.graphId} vs ${graph.id}`);
    }
    this.state = normalizeCampaignState(this.state);
  }

  getState(): CampaignState {
    return this.state;
  }

  subscribe(listener: (state: CampaignState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribeEvents(listener: (events: GameEvent[]) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  travelTo(graph: WorldGraph, targetSiteId: SiteId): boolean {
    const result = travelTo(this.state, graph, targetSiteId);
    if (!result.ok) {
      return false;
    }
    this.state = result.state;
    this.emit(result.events);
    return true;
  }

  triggerStoryBeat(graph: WorldGraph, beatId: BeatId): boolean {
    const result = triggerStoryBeat(this.state, graph, beatId);
    if (!result.ok) {
      return false;
    }
    this.state = result.state;
    this.emit(result.events);
    return true;
  }

  replaceState(state: CampaignState): void {
    this.state = normalizeCampaignState(state);
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  private emit(events: GameEvent[]): void {
    if (events.length === 0) return;
    for (const listener of this.listeners) {
      listener(this.state);
    }
    for (const listener of this.eventListeners) {
      listener(events);
    }
  }
}

function normalizeCampaignState(state: CampaignState): CampaignState {
  const eventLog = state.eventLog ?? [];
  const nextSeq =
    typeof state.nextSeq === "number" && Number.isFinite(state.nextSeq)
      ? state.nextSeq
      : eventLog.length + 1;
  return normalizeDistrictFields({
    ...state,
    siteControl: state.siteControl ?? {},
    eventLog,
    nextSeq,
  });
}
