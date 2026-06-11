import type { BeatId, SiteId } from "../../shared/ids";
import { deriveEntityBlueprint } from "../characters/derive";
import { M7_SUBSET } from "../characters/subset";
import type { PartyDraft } from "../characters/types";
import {
  applyCampaignEffect,
  defaultCampaignActorId,
  validateStoryBeat,
  validateTravelTo,
} from "./campaign-apply";
import { resolveSiteKind } from "./site-kinds";
import type { CampaignState, TravelResult, WorldGraph } from "./types";
import { validateWorldGraph } from "./validate";

function ensurePartyHp(party: PartyDraft): PartyDraft {
  const members = party.members.map((member) => {
    if (typeof member.currentHp === "number") {
      return member;
    }
    const slot = M7_SUBSET.partySlots.find((s) => s.classId === member.classId);
    const spawn = slot?.spawn ?? { x: 0, y: 0 };
    const maxHp = deriveEntityBlueprint(member, spawn).maxHp;
    return { ...member, currentHp: maxHp };
  });
  return { members: members as PartyDraft["members"] };
}

export function createCampaignState(
  party: PartyDraft,
  graph: WorldGraph,
  interiorGraph?: WorldGraph,
): CampaignState {
  const validation = validateWorldGraph(graph);
  if (!validation.ok) {
    throw new Error(validation.errors.join("; "));
  }

  const siteControl: CampaignState["siteControl"] = {};
  for (const site of graph.sites) {
    siteControl[site.id] = "hostile";
  }
  if (interiorGraph) {
    for (const site of interiorGraph.sites) {
      siteControl[site.id] = "hostile";
    }
  }

  return {
    party: ensurePartyHp(party),
    graphId: graph.id,
    currentSiteId: graph.startSiteId,
    mapLayer: "world",
    siteControl,
    eventLog: [],
    nextSeq: 1,
  };
}

export function canTravelTo(
  state: CampaignState,
  graph: WorldGraph,
  targetSiteId: SiteId,
): boolean {
  return validateTravelTo(state, graph, targetSiteId).length === 0;
}

export function travelTo(
  state: CampaignState,
  graph: WorldGraph,
  targetSiteId: SiteId,
): TravelResult {
  const errors = validateTravelTo(state, graph, targetSiteId);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const effectId = `eff_travel_${state.nextSeq}`;
  const actionId = `act_travel_${targetSiteId}`;
  const { state: next, events } = applyCampaignEffect(
    { kind: "TravelTo", effectId, targetSiteId },
    state,
    {
      seq: state.nextSeq,
      actorId: defaultCampaignActorId(state),
      actionId,
    },
  );

  return {
    ok: true,
    state: { ...next, nextSeq: next.nextSeq + 1 },
    events,
  };
}

/**
 * Free re-preparation at a safe haven (shelter site) — interim recovery,
 * flagged PROCEDURAL until M19 rest (rules/srd/spell-slots.md). No-op when
 * nothing is expended, so arrival never spams events.
 */
export function prepareSpellSlotsAtHaven(
  state: CampaignState,
  graph: WorldGraph,
): TravelResult {
  const site = graph.sites.find((s) => s.id === state.currentSiteId);
  if (!site) {
    return { ok: false, errors: [`unknown site: ${state.currentSiteId}`] };
  }
  if (resolveSiteKind(site) !== "shelter") {
    return { ok: false, errors: [`site ${site.id} is not a safe haven`] };
  }
  const anyExpended = state.party.members.some((m) =>
    m.spellSlots?.some((slot) => slot.expended),
  );
  if (!anyExpended) {
    return { ok: true, state, events: [] };
  }

  const effectId = `eff_prepare_${state.nextSeq}`;
  const actionId = `act_prepare_${site.id}`;
  const { state: next, events } = applyCampaignEffect(
    { kind: "PrepareSpellSlots", effectId, siteId: site.id },
    state,
    {
      seq: state.nextSeq,
      actorId: defaultCampaignActorId(state),
      actionId,
    },
  );

  return {
    ok: true,
    state: { ...next, nextSeq: next.nextSeq + 1 },
    events,
  };
}

export function triggerStoryBeat(
  state: CampaignState,
  graph: WorldGraph,
  beatId: BeatId,
): TravelResult {
  const errors = validateStoryBeat(state, graph, beatId);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const effectId = `eff_beat_${state.nextSeq}`;
  const actionId = `act_beat_${beatId}`;
  const { state: next, events } = applyCampaignEffect(
    {
      kind: "RecordStoryBeat",
      effectId,
      beatId,
      siteId: state.currentSiteId,
    },
    state,
    {
      seq: state.nextSeq,
      actorId: defaultCampaignActorId(state),
      actionId,
    },
  );

  return {
    ok: true,
    state: { ...next, nextSeq: next.nextSeq + 1 },
    events,
  };
}
