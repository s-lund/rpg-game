import { isSiteHeld } from "./reclamation";
import { resolveSiteKind } from "./site-kinds";
import type { CampaignState, WorldGraph, WorldSite } from "./types";
import { getNeighbors } from "./validate";
import type { SiteId } from "../../shared/ids";

/** Sites the party can move through without fighting (held, shelter, quest). */
export function isSitePassable(state: CampaignState, site: WorldSite): boolean {
  if (isSiteHeld(state, site.id)) return true;
  const kind = resolveSiteKind(site);
  return kind === "shelter" || kind === "quest";
}

function siteById(graph: WorldGraph, siteId: SiteId): WorldSite | undefined {
  return graph.sites.find((s) => s.id === siteId);
}

/**
 * BFS path from current site to target. Intermediate nodes must be passable;
 * the destination may be hostile (fight on arrival).
 */
export function findTravelPath(
  state: CampaignState,
  graph: WorldGraph,
  targetSiteId: SiteId,
): SiteId[] | null {
  const start = state.currentSiteId;
  if (start === targetSiteId) return [start];

  const target = siteById(graph, targetSiteId);
  if (!target) return null;

  const visited = new Set<SiteId>([start]);
  const queue: { siteId: SiteId; path: SiteId[] }[] = [{ siteId: start, path: [start] }];

  while (queue.length > 0) {
    const { siteId, path } = queue.shift()!;
    for (const nextId of getNeighbors(graph, siteId)) {
      if (visited.has(nextId)) continue;

      const nextSite = siteById(graph, nextId);
      if (!nextSite) continue;

      const nextPath = [...path, nextId];
      if (nextId === targetSiteId) {
        return nextPath;
      }

      if (!isSitePassable(state, nextSite)) continue;

      visited.add(nextId);
      queue.push({ siteId: nextId, path: nextPath });
    }
  }

  return null;
}

export function getTravelDestinations(state: CampaignState, graph: WorldGraph): SiteId[] {
  const destinations: SiteId[] = [];
  for (const site of graph.sites) {
    if (site.id === state.currentSiteId) continue;
    if (findTravelPath(state, graph, site.id)) {
      destinations.push(site.id);
    }
  }
  return destinations.sort();
}

export function canReachSite(
  state: CampaignState,
  graph: WorldGraph,
  targetSiteId: SiteId,
): boolean {
  return findTravelPath(state, graph, targetSiteId) !== null;
}
