import type { AreaId, SiteId } from "../../shared/ids";
import type { District } from "./types";
import type { WorldGraph, WorldSite } from "../world/types";
import { getNeighbors } from "../world/validate";

export function areaIdForSite(site: WorldSite): AreaId | null {
  return site.areaId ?? null;
}

export function siteForArea(graph: WorldGraph, areaId: AreaId): WorldSite | undefined {
  return graph.sites.find((s) => s.areaId === areaId);
}

/** Whether this interior site is the district entrance (may exit to world map). */
export function isDistrictEntrance(district: District, areaSiteId: SiteId): boolean {
  const slug = district.entranceAreaId.replace("area_", "");
  return areaSiteId === (`site_${slug}` as SiteId);
}

export function getInteriorNeighbors(graph: WorldGraph, siteId: SiteId): WorldSite[] {
  const ids = getNeighbors(graph, siteId);
  return ids
    .map((id) => graph.sites.find((s) => s.id === id))
    .filter((s): s is WorldSite => s !== undefined);
}

export function exitLabelForNeighbor(
  district: District,
  fromAreaId: AreaId,
  toAreaId: AreaId,
): string {
  const edge = district.edges.find((e) => e.from === fromAreaId && e.to === toAreaId);
  if (!edge) return "Continue";
  if (edge.via.includes("north")) return "North";
  if (edge.via.includes("south")) return "South";
  if (edge.via.includes("east")) return "East";
  if (edge.via.includes("west")) return "West";
  return edge.via.replace("exit_", "");
}
