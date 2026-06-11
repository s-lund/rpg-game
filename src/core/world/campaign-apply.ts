import type { BeatId, EntityId, SiteId } from "../../shared/ids";
import type { GameEvent } from "../types";
import { canReachSite } from "./pathfinding";
import type { CampaignState, WorldGraph } from "./types";

export type CampaignEffect =
  | { kind: "TravelTo"; effectId: string; targetSiteId: SiteId }
  | { kind: "RecordStoryBeat"; effectId: string; beatId: BeatId; siteId: SiteId }
  | { kind: "MarkSiteHeld"; effectId: string; siteId: SiteId }
  /** Free re-preparation at a safe haven — PROCEDURAL stand-in until M19 rest. */
  | { kind: "PrepareSpellSlots"; effectId: string; siteId: SiteId };

export interface CampaignApplyContext {
  seq: number;
  actorId: EntityId;
  actionId: string;
}

export interface CampaignApplyResult {
  state: CampaignState;
  events: GameEvent[];
}

function cloneCampaign(state: CampaignState): CampaignState {
  return {
    ...state,
    party: {
      members: state.party.members.map((m) => ({ ...m })) as CampaignState["party"]["members"],
    },
    siteControl: { ...state.siteControl },
    eventLog: [...state.eventLog],
  };
}

function campaignActorId(state: CampaignState): EntityId {
  return state.party.members[0]!.id as EntityId;
}

function buildCampaignEvent(
  effect: CampaignEffect,
  state: CampaignState,
  ctx: CampaignApplyContext,
): GameEvent {
  const base = {
    seq: ctx.seq,
    turn: 0,
    actorId: ctx.actorId,
    derivedFrom: ctx.actionId,
  };

  switch (effect.kind) {
    case "TravelTo":
      return {
        ...base,
        type: "Traveled",
        payload: {
          from_site_id: state.currentSiteId,
          to_site_id: effect.targetSiteId,
          from_effect: effect.effectId,
        },
      };
    case "RecordStoryBeat":
      return {
        ...base,
        type: "StoryBeatTriggered",
        payload: {
          beat_id: effect.beatId,
          site_id: effect.siteId,
          from_effect: effect.effectId,
        },
      };
    case "MarkSiteHeld":
      return {
        ...base,
        type: "SiteHeld",
        payload: {
          site_id: effect.siteId,
          from_effect: effect.effectId,
        },
      };
    case "PrepareSpellSlots":
      return {
        ...base,
        type: "SpellSlotsPrepared",
        payload: {
          site_id: effect.siteId,
          from_effect: effect.effectId,
        },
      };
  }
}

function reduceCampaign(effect: CampaignEffect, draft: CampaignState): void {
  switch (effect.kind) {
    case "TravelTo":
      draft.currentSiteId = effect.targetSiteId;
      break;
    case "RecordStoryBeat":
      break;
    case "MarkSiteHeld":
      draft.siteControl = { ...draft.siteControl, [effect.siteId]: "held" };
      break;
    case "PrepareSpellSlots":
      draft.party = {
        members: draft.party.members.map((member) =>
          member.spellSlots
            ? {
                ...member,
                spellSlots: member.spellSlots.map((slot) => ({ ...slot, expended: false })),
              }
            : member,
        ) as CampaignState["party"]["members"],
      };
      break;
  }
}

export function applyCampaignEffect(
  effect: CampaignEffect,
  state: CampaignState,
  ctx: CampaignApplyContext,
): CampaignApplyResult {
  const event = buildCampaignEvent(effect, state, ctx);
  const next = cloneCampaign(state);
  reduceCampaign(effect, next);
  next.eventLog = [...next.eventLog, event];
  return { state: next, events: [event] };
}

export function validateTravelTo(
  state: CampaignState,
  graph: WorldGraph,
  targetSiteId: SiteId,
): string[] {
  if (state.mapLayer === "district") {
    return ["cannot travel on world map while inside a district"];
  }
  if (state.graphId !== graph.id) {
    return [`campaign graphId mismatch: ${state.graphId} vs ${graph.id}`];
  }
  if (!canReachSite(state, graph, targetSiteId)) {
    return [`no route to ${targetSiteId} through cleared or safe sites`];
  }
  return [];
}

export function validateStoryBeat(
  state: CampaignState,
  graph: WorldGraph,
  beatId: BeatId,
): string[] {
  if (state.graphId !== graph.id) {
    return [`campaign graphId mismatch: ${state.graphId} vs ${graph.id}`];
  }
  const site = graph.sites.find((s) => s.id === state.currentSiteId);
  if (!site) {
    return [`unknown site: ${state.currentSiteId}`];
  }
  if (!site.beatId) {
    return [`site ${state.currentSiteId} has no story beat`];
  }
  if (site.beatId !== beatId) {
    return [`beat ${beatId} does not match site beat ${site.beatId}`];
  }
  const knownBeat = graph.sites.some((s) => s.beatId === beatId);
  if (!knownBeat) {
    return [`unknown beat: ${beatId}`];
  }
  return [];
}

export function defaultCampaignActorId(state: CampaignState): EntityId {
  return campaignActorId(state);
}
