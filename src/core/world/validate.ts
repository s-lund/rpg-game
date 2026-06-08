import type { SiteId } from "../../shared/ids";
import type { ValidationResult } from "../characters/types";
import type { WorldGraph } from "./types";

export function validateWorldGraph(graph: WorldGraph): ValidationResult {
  const errors: string[] = [];

  if (graph.sites.length === 0) {
    errors.push("graph must contain at least one site");
  }

  const siteIds = new Set<SiteId>();
  for (const site of graph.sites) {
    if (siteIds.has(site.id)) {
      errors.push(`duplicate site id: ${site.id}`);
    }
    siteIds.add(site.id);

    if (typeof site.mapX !== "number" || typeof site.mapY !== "number") {
      errors.push(`site ${site.id} missing map position`);
    } else if (site.mapX < 0 || site.mapX > 100 || site.mapY < 0 || site.mapY > 100) {
      errors.push(`site ${site.id} map position out of bounds`);
    }
  }

  if (!siteIds.has(graph.startSiteId)) {
    errors.push(`startSiteId not found: ${graph.startSiteId}`);
  }

  for (const edge of graph.edges) {
    if (!siteIds.has(edge.from)) {
      errors.push(`edge from unknown site: ${edge.from}`);
    }
    if (!siteIds.has(edge.to)) {
      errors.push(`edge to unknown site: ${edge.to}`);
    }
    if (edge.from === edge.to) {
      errors.push(`self-loop edge at ${edge.from}`);
    }
  }

  if (errors.length === 0 && graph.sites.length > 0) {
    const reachable = collectReachable(graph, graph.startSiteId);
    for (const site of graph.sites) {
      if (!reachable.has(site.id)) {
        errors.push(`unreachable site from start: ${site.id}`);
      }
    }
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

function collectReachable(graph: WorldGraph, start: SiteId): Set<SiteId> {
  const visited = new Set<SiteId>();
  const queue: SiteId[] = [start];
  visited.add(start);

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const neighbor of getNeighbors(graph, current)) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return visited;
}

export function getNeighbors(graph: WorldGraph, siteId: SiteId): SiteId[] {
  const neighbors = new Set<SiteId>();

  for (const edge of graph.edges) {
    if (edge.from === siteId) {
      neighbors.add(edge.to);
    }
    if (edge.bidirectional && edge.to === siteId) {
      neighbors.add(edge.from);
    }
  }

  return [...neighbors].sort();
}

export function loadWorldGraph(raw: WorldGraph): WorldGraph {
  const validation = validateWorldGraph(raw);
  if (!validation.ok) {
    throw new Error(validation.errors.join("; "));
  }
  return raw;
}
