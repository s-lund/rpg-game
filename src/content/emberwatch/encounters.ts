import type { EncounterId } from "../../shared/ids";
import type { DamageType, EncounterTemplate, EntityBlueprint } from "../../core/index";

type FoeRole = "melee" | "skirmisher" | "bruiser" | "boss";

interface FoeOptions {
  role?: FoeRole;
  damageType?: DamageType;
}

/** Tier-scaled foe stats; same curve as the M6 generator so difficulty reads consistently. */
function foe(
  id: EntityBlueprint["id"],
  label: string,
  tier: number,
  x: number,
  y: number,
  options?: FoeOptions,
): EntityBlueprint {
  const role = options?.role ?? "melee";
  switch (role) {
    case "skirmisher":
      return {
        id,
        label,
        x,
        y,
        maxHp: 8 + tier,
        ac: 13 + tier,
        attackBonus: 4 + tier,
        strikeRange: 4,
        damageType: options?.damageType ?? "piercing",
        damage: { count: 1, sides: 6, modifier: 0 },
      };
    case "bruiser":
      return {
        id,
        label,
        x,
        y,
        maxHp: 14 + tier * 2,
        ac: 15 + tier,
        attackBonus: 5 + tier,
        strikeRange: 1,
        damageType: options?.damageType ?? "slashing",
        damage: { count: 1, sides: 8, modifier: 2 },
      };
    case "boss":
      return {
        id,
        label,
        x,
        y,
        maxHp: 22 + tier * 2,
        ac: 15 + tier,
        attackBonus: 5 + tier,
        strikeRange: 1,
        damageType: options?.damageType ?? "slashing",
        damage: { count: 1, sides: 10, modifier: 2 },
      };
    default:
      return {
        id,
        label,
        x,
        y,
        maxHp: 8 + tier * 2,
        ac: 14 + tier,
        attackBonus: 4 + tier,
        strikeRange: 1,
        damageType: options?.damageType ?? "slashing",
        damage: { count: 1, sides: 6, modifier: tier >= 2 ? 1 : 0 },
      };
  }
}

export const EMBERWATCH_ENCOUNTERS: Record<EncounterId, EncounterTemplate> = {
  // ── World layer ───────────────────────────────────────────────────────────
  enc_ashen_road: {
    id: "enc_ashen_road",
    width: 14,
    height: 10,
    battleMapId: "bmap_ashen_road",
    enemies: [
      foe("ent_road_wretch_1", "Road Wretch", 1, 10, 3, { role: "skirmisher" }),
      foe("ent_ash_bandit_1", "Ash Bandit", 1, 11, 4),
    ],
  },
  enc_watchers_bridge: {
    id: "enc_watchers_bridge",
    width: 14,
    height: 10,
    battleMapId: "bmap_watchers_bridge",
    enemies: [
      foe("ent_bridge_warden_1", "Bridge Warden", 2, 11, 4, { role: "bruiser" }),
      foe("ent_bridge_picket_1", "Crossbow Picket", 2, 12, 3, { role: "skirmisher" }),
      foe("ent_bridge_picket_2", "Crossbow Picket", 2, 12, 5, { role: "skirmisher" }),
    ],
  },
  enc_cinder_market: {
    id: "enc_cinder_market",
    width: 12,
    height: 12,
    battleMapId: "bmap_cinder_market",
    enemies: [
      foe("ent_market_looter_1", "Market Looter", 2, 3, 3),
      foe("ent_market_looter_2", "Market Looter", 2, 8, 7),
      foe("ent_looter_captain_1", "Looter Captain", 2, 5, 3, { role: "bruiser" }),
    ],
  },

  // ── The Drowned Quay ──────────────────────────────────────────────────────
  enc_quay_gate: {
    id: "enc_quay_gate",
    width: 14,
    height: 10,
    battleMapId: "bmap_quay_docks",
    enemies: [
      foe("ent_drowned_marauder_1", "Drowned Marauder", 1, 5, 2),
      foe("ent_tide_skirmisher_1", "Tide Skirmisher", 1, 6, 4, { role: "skirmisher" }),
    ],
  },
  enc_pier_row: {
    id: "enc_pier_row",
    width: 14,
    height: 10,
    battleMapId: "bmap_quay_docks",
    enemies: [
      foe("ent_pier_marauder_1", "Drowned Marauder", 2, 4, 3),
      foe("ent_pier_skirmisher_1", "Tide Skirmisher", 2, 8, 2, { role: "skirmisher" }),
      foe("ent_pier_bruiser_1", "Quay Bruiser", 2, 5, 5, { role: "bruiser" }),
    ],
  },
  enc_salt_warehouse: {
    id: "enc_salt_warehouse",
    width: 12,
    height: 10,
    battleMapId: "bmap_salt_warehouse",
    enemies: [
      foe("ent_warehouse_marauder_1", "Drowned Marauder", 2, 3, 3),
      foe("ent_warehouse_marauder_2", "Drowned Marauder", 2, 8, 3),
      foe("ent_warehouse_bruiser_1", "Quay Bruiser", 2, 6, 5, { role: "bruiser" }),
    ],
  },
  enc_sunken_chapel: {
    id: "enc_sunken_chapel",
    width: 12,
    height: 10,
    battleMapId: "bmap_sunken_chapel",
    enemies: [
      foe("ent_chapel_skirmisher_1", "Tide Skirmisher", 2, 4, 3, { role: "skirmisher" }),
      foe("ent_chapel_skirmisher_2", "Tide Skirmisher", 2, 7, 3, { role: "skirmisher" }),
      foe("ent_chapel_marauder_1", "Drowned Marauder", 2, 3, 1),
    ],
  },
  enc_harbormasters: {
    id: "enc_harbormasters",
    width: 12,
    height: 12,
    battleMapId: "bmap_harbor_hall",
    enemies: [
      foe("ent_harbor_shade_1", "Harbormaster's Shade", 3, 6, 2, { role: "boss", damageType: "cold" }),
      foe("ent_harbor_marauder_1", "Drowned Marauder", 3, 3, 4),
      foe("ent_harbor_marauder_2", "Drowned Marauder", 3, 8, 4),
      foe("ent_harbor_skirmisher_1", "Tide Skirmisher", 3, 4, 2, { role: "skirmisher" }),
    ],
  },

  // ── The Bell Spire ────────────────────────────────────────────────────────
  enc_spire_gatehouse: {
    id: "enc_spire_gatehouse",
    width: 12,
    height: 12,
    battleMapId: "bmap_spire_hall",
    enemies: [
      foe("ent_bell_sentinel_1", "Bell Sentinel", 1, 5, 3),
      foe("ent_spire_acolyte_1", "Spire Acolyte", 1, 7, 4, { role: "skirmisher" }),
    ],
  },
  enc_great_hall: {
    id: "enc_great_hall",
    width: 12,
    height: 12,
    battleMapId: "bmap_spire_hall",
    enemies: [
      foe("ent_hall_sentinel_1", "Bell Sentinel", 2, 4, 3),
      foe("ent_hall_sentinel_2", "Bell Sentinel", 2, 7, 3),
      foe("ent_hall_acolyte_1", "Spire Acolyte", 2, 6, 7, { role: "skirmisher" }),
    ],
  },
  enc_broken_stair: {
    id: "enc_broken_stair",
    width: 10,
    height: 12,
    battleMapId: "bmap_spire_stair",
    enemies: [
      foe("ent_stair_sentinel_1", "Bell Sentinel", 2, 2, 3),
      foe("ent_stair_acolyte_1", "Spire Acolyte", 2, 7, 2, { role: "skirmisher" }),
    ],
  },
  enc_bell_gallery: {
    id: "enc_bell_gallery",
    width: 10,
    height: 12,
    battleMapId: "bmap_spire_stair",
    enemies: [
      foe("ent_gallery_warden_1", "Gallery Warden", 3, 5, 1, { role: "bruiser" }),
      foe("ent_gallery_acolyte_1", "Spire Acolyte", 3, 8, 5, { role: "skirmisher" }),
      foe("ent_gallery_sentinel_1", "Bell Sentinel", 3, 1, 7),
    ],
  },
  enc_spire_crown: {
    id: "enc_spire_crown",
    width: 10,
    height: 10,
    battleMapId: "bmap_spire_crown",
    enemies: [
      foe("ent_spire_warden_1", "Spire Warden", 4, 5, 2, { role: "boss" }),
      foe("ent_crown_acolyte_1", "Spire Acolyte", 4, 2, 3, { role: "skirmisher" }),
      foe("ent_crown_acolyte_2", "Spire Acolyte", 4, 7, 3, { role: "skirmisher" }),
    ],
  },

  // ── The Ember Vaults ──────────────────────────────────────────────────────
  enc_vault_door: {
    id: "enc_vault_door",
    width: 12,
    height: 10,
    battleMapId: "bmap_ossuary",
    enemies: [
      foe("ent_door_husk_1", "Vault Husk", 2, 4, 3),
      foe("ent_door_shade_1", "Cinder Shade", 2, 7, 3, { role: "skirmisher", damageType: "cold" }),
    ],
  },
  enc_bone_walk: {
    id: "enc_bone_walk",
    width: 12,
    height: 10,
    battleMapId: "bmap_ossuary",
    enemies: [
      foe("ent_walk_husk_1", "Vault Husk", 2, 3, 3),
      foe("ent_walk_husk_2", "Vault Husk", 2, 8, 3),
      foe("ent_walk_shade_1", "Cinder Shade", 2, 6, 1, { role: "skirmisher", damageType: "cold" }),
    ],
  },
  enc_ember_cistern: {
    id: "enc_ember_cistern",
    width: 12,
    height: 10,
    battleMapId: "bmap_cistern",
    enemies: [
      foe("ent_cistern_keeper_1", "Cistern Keeper", 3, 6, 1, { role: "bruiser" }),
      foe("ent_cistern_shade_1", "Cinder Shade", 3, 10, 2, { role: "skirmisher", damageType: "cold" }),
      foe("ent_cistern_shade_2", "Cinder Shade", 3, 10, 4, { role: "skirmisher", damageType: "cold" }),
      foe("ent_cistern_husk_1", "Vault Husk", 3, 1, 4),
    ],
  },
  enc_reliquary: {
    id: "enc_reliquary",
    width: 12,
    height: 12,
    battleMapId: "bmap_deep_vault",
    enemies: [
      foe("ent_reliquary_husk_1", "Vault Husk", 3, 4, 3),
      foe("ent_reliquary_husk_2", "Vault Husk", 3, 7, 3),
      foe("ent_reliquary_shade_1", "Cinder Shade", 3, 6, 6, { role: "skirmisher", damageType: "cold" }),
    ],
  },
  enc_ember_heart: {
    id: "enc_ember_heart",
    width: 12,
    height: 12,
    battleMapId: "bmap_deep_vault",
    enemies: [
      foe("ent_ember_revenant_1", "Ember Revenant", 4, 6, 3, { role: "boss" }),
      foe("ent_heart_shade_1", "Cinder Shade", 4, 3, 3, { role: "skirmisher", damageType: "cold" }),
      foe("ent_heart_shade_2", "Cinder Shade", 4, 8, 3, { role: "skirmisher", damageType: "cold" }),
      foe("ent_heart_husk_1", "Vault Husk", 4, 5, 6),
    ],
  },
};
