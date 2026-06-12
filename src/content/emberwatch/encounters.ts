import type { EncounterId } from "../../shared/ids";
import type { DamageType, EncounterTemplate, EntityBlueprint, SaveKind } from "../../core/index";

type FoeRole = "melee" | "skirmisher" | "bruiser" | "boss" | "caster";

/** Elemental theming (M9): ember creatures resist fire / fear cold; drowned the reverse. */
type FoeTheme = "ember" | "drowned";

interface FoeOptions {
  role?: FoeRole;
  damageType?: DamageType;
  theme?: FoeTheme;
  /** Override the role's default on-hit condition (M10). */
  onHit?: EntityBlueprint["onHitCondition"];
  /** Override the role's default M12 AI profile (e.g. cowardly melee → "wounded"). */
  aiProfile?: string;
}

/**
 * M12 Phase B: role → tactical AI profile (src/core/ai/profile.ts). Skirmishers
 * kite, bruisers body-block, casters hang back; melee and bosses play the
 * punishing baseline (undefined → "baseline"). An explicit options.aiProfile
 * overrides the role default where the fiction calls for it.
 */
function foeProfile(role: FoeRole, options?: FoeOptions): Pick<EntityBlueprint, "aiProfileId"> {
  if (options?.aiProfile) return { aiProfileId: options.aiProfile };
  switch (role) {
    case "skirmisher":
      return { aiProfileId: "skirmisher" };
    case "bruiser":
      return { aiProfileId: "bruiser" };
    case "caster":
      return { aiProfileId: "caster" };
    default:
      return {}; // melee, boss → baseline
  }
}

/** Tier-scaled save modifiers by role — skirmishers dodge, bruisers endure. */
function foeSaves(role: FoeRole, tier: number): Record<SaveKind, number> {
  switch (role) {
    case "skirmisher":
      return { fortitude: 2 + tier, reflex: 5 + tier, will: 2 + tier };
    case "bruiser":
      return { fortitude: 5 + tier, reflex: 2 + tier, will: 3 + tier };
    case "boss":
      return { fortitude: 5 + tier, reflex: 4 + tier, will: 5 + tier };
    case "caster":
      return { fortitude: 2 + tier, reflex: 3 + tier, will: 5 + tier };
    default:
      return { fortitude: 4 + tier, reflex: 3 + tier, will: 2 + tier };
  }
}

function foeTheme(theme?: FoeTheme): Pick<EntityBlueprint, "resistances" | "weaknesses"> {
  if (theme === "ember") {
    return { resistances: { fire: 3 }, weaknesses: { cold: 2 } };
  }
  if (theme === "drowned") {
    return { resistances: { cold: 3 }, weaknesses: { fire: 2 } };
  }
  return {};
}

/** Role-scaled Perception for initiative — skirmishers are alert, bruisers are not. */
function foeInitiative(role: FoeRole, tier: number): number {
  switch (role) {
    case "skirmisher":
      return 5 + tier;
    case "bruiser":
      return 2 + tier;
    case "boss":
      return 4 + tier;
    case "caster":
      return 4 + tier;
    default:
      return 3 + tier;
  }
}

/**
 * M10 condition sources (decision 2026-06-11): bruiser slams knock prone,
 * bosses frighten on a hit. Other roles only via an explicit onHit option.
 */
function foeOnHit(role: FoeRole, options?: FoeOptions): Pick<EntityBlueprint, "onHitCondition"> {
  if (options?.onHit) return { onHitCondition: options.onHit };
  if (role === "bruiser") return { onHitCondition: { condition: "prone" } };
  if (role === "boss") return { onHitCondition: { condition: "frightened", value: 2 } };
  return {};
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
  const shared = {
    saves: foeSaves(role, tier),
    initiativeModifier: foeInitiative(role, tier),
    ...foeTheme(options?.theme),
    ...foeOnHit(role, options),
    ...foeProfile(role, options),
  };
  switch (role) {
    case "caster":
      return {
        id,
        label,
        x,
        y,
        // Squishy backline: low HP/AC, a weak melee jab, and a ranged cantrip.
        maxHp: 7 + tier,
        ac: 13 + tier,
        attackBonus: 3 + tier,
        strikeRange: 1,
        damageType: options?.damageType ?? "cold",
        damage: { count: 1, sides: 4, modifier: 0 },
        knownSpells: ["ray_of_frost"],
        spellAttackBonus: 5 + tier,
        spellDc: 14 + tier,
        ...shared,
      };
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
        ...shared,
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
        ...shared,
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
        ...shared,
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
        ...shared,
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
      foe("ent_road_wretch_1", "Road Wretch", 1, 10, 3, { role: "skirmisher", theme: "ember" }),
      foe("ent_ash_bandit_1", "Ash Bandit", 1, 11, 4, { theme: "ember" }),
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
      // Looters break and run for the carts once bloodied (wounded profile);
      // the captain holds the line (bruiser).
      foe("ent_market_looter_1", "Market Looter", 2, 3, 3, { aiProfile: "wounded" }),
      foe("ent_market_looter_2", "Market Looter", 2, 8, 7, { aiProfile: "wounded" }),
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
      foe("ent_drowned_marauder_1", "Drowned Marauder", 1, 5, 2, { theme: "drowned" }),
      foe("ent_tide_skirmisher_1", "Tide Skirmisher", 1, 6, 4, { role: "skirmisher", theme: "drowned" }),
    ],
  },
  enc_pier_row: {
    id: "enc_pier_row",
    width: 14,
    height: 10,
    battleMapId: "bmap_quay_docks",
    enemies: [
      foe("ent_pier_marauder_1", "Drowned Marauder", 2, 4, 3, { theme: "drowned" }),
      foe("ent_pier_skirmisher_1", "Tide Skirmisher", 2, 8, 2, { role: "skirmisher", theme: "drowned" }),
      foe("ent_pier_bruiser_1", "Quay Bruiser", 2, 5, 5, { role: "bruiser", theme: "drowned" }),
    ],
  },
  enc_salt_warehouse: {
    id: "enc_salt_warehouse",
    width: 12,
    height: 10,
    battleMapId: "bmap_salt_warehouse",
    enemies: [
      foe("ent_warehouse_marauder_1", "Drowned Marauder", 2, 3, 3, { theme: "drowned" }),
      foe("ent_warehouse_marauder_2", "Drowned Marauder", 2, 8, 3, { theme: "drowned" }),
      foe("ent_warehouse_bruiser_1", "Quay Bruiser", 2, 6, 5, { role: "bruiser", theme: "drowned" }),
    ],
  },
  enc_sunken_chapel: {
    id: "enc_sunken_chapel",
    width: 12,
    height: 10,
    battleMapId: "bmap_sunken_chapel",
    enemies: [
      foe("ent_chapel_skirmisher_1", "Tide Skirmisher", 2, 4, 3, { role: "skirmisher", theme: "drowned" }),
      foe("ent_chapel_skirmisher_2", "Tide Skirmisher", 2, 7, 3, { role: "skirmisher", theme: "drowned" }),
      foe("ent_chapel_marauder_1", "Drowned Marauder", 2, 3, 1, { theme: "drowned" }),
    ],
  },
  enc_harbormasters: {
    id: "enc_harbormasters",
    width: 12,
    height: 12,
    battleMapId: "bmap_harbor_hall",
    enemies: [
      foe("ent_harbor_shade_1", "Harbormaster's Shade", 3, 6, 2, { role: "boss", damageType: "cold", theme: "drowned" }),
      foe("ent_harbor_marauder_1", "Drowned Marauder", 3, 3, 4, { theme: "drowned" }),
      foe("ent_harbor_marauder_2", "Drowned Marauder", 3, 8, 4, { theme: "drowned" }),
      foe("ent_harbor_skirmisher_1", "Tide Skirmisher", 3, 4, 2, { role: "skirmisher", theme: "drowned" }),
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
      // Backline frost-caster, hangs behind the pillar line and rays the softest hero.
      foe("ent_hall_adept_1", "Spire Adept", 2, 6, 2, { role: "caster" }),
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
      foe("ent_door_husk_1", "Vault Husk", 2, 4, 3, { theme: "ember" }),
      foe("ent_door_shade_1", "Cinder Shade", 2, 7, 3, {
        role: "skirmisher",
        damageType: "cold",
        theme: "ember",
        // Decision 2026-06-11: Cinder Shade hits set you burning.
        onHit: { condition: "persistent_damage", damageType: "fire", damage: { count: 1, sides: 4, modifier: 0 } },
      }),
    ],
  },
  enc_bone_walk: {
    id: "enc_bone_walk",
    width: 12,
    height: 10,
    battleMapId: "bmap_ossuary",
    enemies: [
      foe("ent_walk_husk_1", "Vault Husk", 2, 3, 3, { theme: "ember" }),
      foe("ent_walk_husk_2", "Vault Husk", 2, 8, 3, { theme: "ember" }),
      foe("ent_walk_shade_1", "Cinder Shade", 2, 6, 1, {
        role: "skirmisher",
        damageType: "cold",
        theme: "ember",
        // Decision 2026-06-11: Cinder Shade hits set you burning.
        onHit: { condition: "persistent_damage", damageType: "fire", damage: { count: 1, sides: 4, modifier: 0 } },
      }),
    ],
  },
  enc_ember_cistern: {
    id: "enc_ember_cistern",
    width: 12,
    height: 10,
    battleMapId: "bmap_cistern",
    enemies: [
      foe("ent_cistern_keeper_1", "Cistern Keeper", 3, 6, 1, { role: "bruiser", theme: "ember" }),
      foe("ent_cistern_shade_1", "Cinder Shade", 3, 10, 2, {
        role: "skirmisher",
        damageType: "cold",
        theme: "ember",
        // Decision 2026-06-11: Cinder Shade hits set you burning.
        onHit: { condition: "persistent_damage", damageType: "fire", damage: { count: 1, sides: 4, modifier: 0 } },
      }),
      foe("ent_cistern_shade_2", "Cinder Shade", 3, 10, 4, {
        role: "skirmisher",
        damageType: "cold",
        theme: "ember",
        // Decision 2026-06-11: Cinder Shade hits set you burning.
        onHit: { condition: "persistent_damage", damageType: "fire", damage: { count: 1, sides: 4, modifier: 0 } },
      }),
      foe("ent_cistern_husk_1", "Vault Husk", 3, 1, 4, { theme: "ember" }),
    ],
  },
  enc_reliquary: {
    id: "enc_reliquary",
    width: 12,
    height: 12,
    battleMapId: "bmap_deep_vault",
    enemies: [
      foe("ent_reliquary_husk_1", "Vault Husk", 3, 4, 3, { theme: "ember" }),
      foe("ent_reliquary_husk_2", "Vault Husk", 3, 7, 3, { theme: "ember" }),
      foe("ent_reliquary_shade_1", "Cinder Shade", 3, 6, 6, {
        role: "skirmisher",
        damageType: "cold",
        theme: "ember",
        // Decision 2026-06-11: Cinder Shade hits set you burning.
        onHit: { condition: "persistent_damage", damageType: "fire", damage: { count: 1, sides: 4, modifier: 0 } },
      }),
    ],
  },
  enc_ember_heart: {
    id: "enc_ember_heart",
    width: 12,
    height: 12,
    battleMapId: "bmap_deep_vault",
    enemies: [
      foe("ent_ember_revenant_1", "Ember Revenant", 4, 6, 3, { role: "boss", theme: "ember" }),
      foe("ent_heart_shade_1", "Cinder Shade", 4, 3, 3, {
        role: "skirmisher",
        damageType: "cold",
        theme: "ember",
        // Decision 2026-06-11: Cinder Shade hits set you burning.
        onHit: { condition: "persistent_damage", damageType: "fire", damage: { count: 1, sides: 4, modifier: 0 } },
      }),
      foe("ent_heart_shade_2", "Cinder Shade", 4, 8, 3, {
        role: "skirmisher",
        damageType: "cold",
        theme: "ember",
        // Decision 2026-06-11: Cinder Shade hits set you burning.
        onHit: { condition: "persistent_damage", damageType: "fire", damage: { count: 1, sides: 4, modifier: 0 } },
      }),
      foe("ent_heart_husk_1", "Vault Husk", 4, 5, 6, { theme: "ember" }),
    ],
  },
};
