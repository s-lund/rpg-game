import type { DistrictId } from "../../shared/ids";
import type { PackDistrict } from "../../core/index";
import { buildPackDistrict } from "../build-district";

/** The Drowned Quay — single-level harbor district on the west coast. */
const drownedQuay = buildPackDistrict({
  id: "district_drowned_quay",
  label: "The Drowned Quay",
  levels: [{ id: "level_quay", label: "The Quay" }],
  areas: [
    {
      id: "area_quay_gate",
      label: "Quay Gate",
      tier: 1,
      encounterId: "enc_quay_gate",
      mapX: 72,
      mapY: 78,
    },
    {
      id: "area_fishrow",
      label: "Fishrow Market",
      tier: 1,
      siteKind: "shelter",
      mapX: 78,
      mapY: 50,
    },
    {
      id: "area_pier_row",
      label: "Pier Row",
      tier: 2,
      encounterId: "enc_pier_row",
      mapX: 46,
      mapY: 68,
    },
    {
      id: "area_salt_warehouse",
      label: "Salt Warehouse",
      tier: 2,
      encounterId: "enc_salt_warehouse",
      mapX: 58,
      mapY: 32,
    },
    {
      id: "area_sunken_chapel",
      label: "Sunken Chapel",
      tier: 2,
      encounterId: "enc_sunken_chapel",
      mapX: 26,
      mapY: 56,
    },
    {
      id: "area_harbormasters",
      label: "Harbormaster's Hall",
      tier: 3,
      encounterId: "enc_harbormasters",
      mapX: 30,
      mapY: 22,
    },
  ],
  connections: [
    { a: "area_quay_gate", b: "area_fishrow", sideA: "north", sideB: "south" },
    { a: "area_quay_gate", b: "area_pier_row", sideA: "west", sideB: "east" },
    { a: "area_fishrow", b: "area_salt_warehouse", sideA: "west", sideB: "east" },
    { a: "area_pier_row", b: "area_sunken_chapel", sideA: "north", sideB: "south" },
    { a: "area_salt_warehouse", b: "area_harbormasters", sideA: "west", sideB: "east" },
    { a: "area_sunken_chapel", b: "area_harbormasters", sideA: "north", sideB: "south" },
  ],
});

/** The Bell Spire — a tower climbed across three levels. */
const bellSpire = buildPackDistrict({
  id: "district_bell_spire",
  label: "The Bell Spire",
  levels: [
    { id: "level_ground", label: "Ground Hall" },
    { id: "level_stair", label: "The Long Stair" },
    { id: "level_crown", label: "The Crown" },
  ],
  areas: [
    {
      id: "area_spire_gatehouse",
      label: "Spire Gatehouse",
      tier: 1,
      levelId: "level_ground",
      encounterId: "enc_spire_gatehouse",
      mapX: 50,
      mapY: 78,
    },
    {
      id: "area_great_hall",
      label: "Hall of Echoes",
      tier: 2,
      levelId: "level_ground",
      encounterId: "enc_great_hall",
      mapX: 50,
      mapY: 42,
    },
    {
      id: "area_broken_stair",
      label: "The Broken Stair",
      tier: 2,
      levelId: "level_stair",
      encounterId: "enc_broken_stair",
      mapX: 38,
      mapY: 68,
    },
    {
      id: "area_bell_gallery",
      label: "Bell Gallery",
      tier: 3,
      levelId: "level_stair",
      encounterId: "enc_bell_gallery",
      mapX: 60,
      mapY: 34,
    },
    {
      id: "area_wardens_walk",
      label: "Warden's Walk",
      tier: 3,
      levelId: "level_crown",
      siteKind: "shelter",
      mapX: 40,
      mapY: 64,
    },
    {
      id: "area_spire_crown",
      label: "The Spire Crown",
      tier: 4,
      levelId: "level_crown",
      encounterId: "enc_spire_crown",
      mapX: 52,
      mapY: 28,
    },
  ],
  connections: [
    { a: "area_spire_gatehouse", b: "area_great_hall", sideA: "north", sideB: "south" },
    { a: "area_great_hall", b: "area_broken_stair", sideA: "north", sideB: "south" },
    { a: "area_broken_stair", b: "area_bell_gallery", sideA: "north", sideB: "south" },
    { a: "area_bell_gallery", b: "area_wardens_walk", sideA: "north", sideB: "south" },
    { a: "area_wardens_walk", b: "area_spire_crown", sideA: "north", sideB: "south" },
  ],
});

/** The Ember Vaults — an undercroft descending two levels. */
const emberVaults = buildPackDistrict({
  id: "district_ember_vaults",
  label: "The Ember Vaults",
  levels: [
    { id: "level_ossuary", label: "The Ossuary" },
    { id: "level_deep", label: "The Deep Vault" },
  ],
  areas: [
    {
      id: "area_vault_door",
      label: "The Vault Door",
      tier: 2,
      levelId: "level_ossuary",
      encounterId: "enc_vault_door",
      mapX: 50,
      mapY: 80,
    },
    {
      id: "area_bone_walk",
      label: "The Bone Walk",
      tier: 2,
      levelId: "level_ossuary",
      encounterId: "enc_bone_walk",
      mapX: 36,
      mapY: 50,
    },
    {
      id: "area_ember_cistern",
      label: "Ember Cistern",
      tier: 3,
      levelId: "level_ossuary",
      encounterId: "enc_ember_cistern",
      mapX: 60,
      mapY: 30,
    },
    {
      id: "area_reliquary",
      label: "Forgotten Reliquary",
      tier: 3,
      levelId: "level_deep",
      encounterId: "enc_reliquary",
      mapX: 36,
      mapY: 60,
    },
    {
      id: "area_ember_heart",
      label: "The Ember Heart",
      tier: 4,
      levelId: "level_deep",
      encounterId: "enc_ember_heart",
      mapX: 58,
      mapY: 28,
    },
  ],
  connections: [
    { a: "area_vault_door", b: "area_bone_walk", sideA: "north", sideB: "south" },
    { a: "area_bone_walk", b: "area_ember_cistern", sideA: "north", sideB: "south" },
    { a: "area_ember_cistern", b: "area_reliquary", sideA: "north", sideB: "south" },
    { a: "area_reliquary", b: "area_ember_heart", sideA: "north", sideB: "south" },
  ],
});

export const EMBERWATCH_DISTRICTS: Record<DistrictId, PackDistrict> = {
  district_drowned_quay: drownedQuay,
  district_bell_spire: bellSpire,
  district_ember_vaults: emberVaults,
};
