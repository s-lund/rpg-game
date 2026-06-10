import type { SiteId } from "../../shared/ids";
import {
  applyCampaignEffect,
  defaultCampaignActorId,
} from "./campaign-apply";
import type { CampaignState, SiteControl, WorldGraph } from "./types";

export function getSiteControl(state: CampaignState, siteId: SiteId): SiteControl {
  return state.siteControl[siteId] ?? "hostile";
}

export function isSiteHeld(state: CampaignState, siteId: SiteId): boolean {
  return getSiteControl(state, siteId) === "held";
}

export function countHeldSites(
  state: CampaignState,
  graph: WorldGraph,
): { held: number; total: number } {
  let held = 0;
  for (const site of graph.sites) {
    if (isSiteHeld(state, site.id)) {
      held += 1;
    }
  }
  return { held, total: graph.sites.length };
}

export function validateMarkSiteHeld(
  state: CampaignState,
  graph: WorldGraph,
  siteId: SiteId,
): string[] {
  if (state.mapLayer !== "district" && state.graphId !== graph.id) {
    return [`campaign graphId mismatch: ${state.graphId} vs ${graph.id}`];
  }
  const site = graph.sites.find((s) => s.id === siteId);
  if (!site) {
    return [`unknown site: ${siteId}`];
  }
  return [];
}

export function markSiteHeld(state: CampaignState, graph: WorldGraph, siteId?: SiteId): CampaignState {
  const targetId = siteId ?? state.currentAreaSiteId ?? state.currentSiteId;
  const errors = validateMarkSiteHeld(state, graph, targetId);
  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }
  if (isSiteHeld(state, targetId)) {
    return state;
  }

  const effectId = `eff_mark_held_${state.nextSeq}`;
  const { state: next } = applyCampaignEffect(
    { kind: "MarkSiteHeld", effectId, siteId: targetId },
    state,
    {
      seq: state.nextSeq,
      actorId: defaultCampaignActorId(state),
      actionId: `act_mark_held_${state.nextSeq}`,
    },
  );
  return { ...next, nextSeq: state.nextSeq + 1 };
}
