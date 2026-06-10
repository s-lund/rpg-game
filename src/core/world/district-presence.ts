import type { SiteId } from "../../shared/ids";
import type { District } from "../district/types";
import { isDistrictEntrance } from "../district/navigate";
import { findTravelPath } from "./pathfinding";
import type { CampaignState, MapLayer, TravelResult, WorldGraph } from "./types";
import { getNeighbors } from "./validate";

export function enterDistrict(
  state: CampaignState,
  district: District,
  interiorGraph: WorldGraph,
  worldSiteId: SiteId,
): CampaignState {
  return {
    ...state,
    mapLayer: "district",
    activeDistrictId: district.id,
    currentSiteId: worldSiteId,
    currentAreaSiteId: interiorGraph.startSiteId,
  };
}

export function exitDistrictToWorld(state: CampaignState): CampaignState {
  if (state.mapLayer !== "district") return state;
  return {
    ...state,
    mapLayer: "world",
    activeDistrictId: undefined,
    currentAreaSiteId: undefined,
  };
}

export function validateMoveInDistrict(
  state: CampaignState,
  interiorGraph: WorldGraph,
  targetSiteId: SiteId,
): string[] {
  if (state.mapLayer !== "district") {
    return ["not inside a district"];
  }
  if (!state.currentAreaSiteId) {
    return ["no current area in district"];
  }
  const neighbors = getNeighbors(interiorGraph, state.currentAreaSiteId);
  if (!neighbors.includes(targetSiteId)) {
    return [`${targetSiteId} is not adjacent from ${state.currentAreaSiteId}`];
  }
  return [];
}

export function moveInDistrict(
  state: CampaignState,
  interiorGraph: WorldGraph,
  targetSiteId: SiteId,
): TravelResult {
  const errors = validateMoveInDistrict(state, interiorGraph, targetSiteId);
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    state: { ...state, currentAreaSiteId: targetSiteId },
    events: [],
  };
}

/** Map travel within a district — may skip through held/safe areas (same rules as world map). */
export function travelWithinDistrict(
  state: CampaignState,
  interiorGraph: WorldGraph,
  targetSiteId: SiteId,
): TravelResult {
  if (state.mapLayer !== "district") {
    return { ok: false, errors: ["not inside a district"] };
  }
  if (!state.currentAreaSiteId) {
    return { ok: false, errors: ["no current area in district"] };
  }
  if (targetSiteId === state.currentAreaSiteId) {
    return { ok: true, state, events: [] };
  }
  const path = findTravelPath(
    { ...state, currentSiteId: state.currentAreaSiteId },
    interiorGraph,
    targetSiteId,
  );
  if (!path) {
    return { ok: false, errors: [`no route to ${targetSiteId} through cleared or safe areas`] };
  }
  return {
    ok: true,
    state: { ...state, currentAreaSiteId: targetSiteId },
    events: [],
  };
}

export function validateExitDistrict(
  state: CampaignState,
  district: District,
): string[] {
  if (state.mapLayer !== "district") {
    return ["not inside a district"];
  }
  if (!state.currentAreaSiteId) {
    return ["no current area"];
  }
  if (!isDistrictEntrance(district, state.currentAreaSiteId)) {
    return ["can only return to world map from the district entrance"];
  }
  return [];
}

export function activeInteriorSiteId(state: CampaignState): SiteId | null {
  if (state.mapLayer !== "district") return null;
  return state.currentAreaSiteId ?? null;
}

export function ensureMapLayer(state: CampaignState): MapLayer {
  return state.mapLayer ?? "world";
}

export function normalizeDistrictFields(state: CampaignState): CampaignState {
  const mapLayer = state.mapLayer ?? "world";
  if (mapLayer === "world") {
    return {
      ...state,
      mapLayer,
      activeDistrictId: undefined,
      currentAreaSiteId: undefined,
    };
  }
  return { ...state, mapLayer };
}
