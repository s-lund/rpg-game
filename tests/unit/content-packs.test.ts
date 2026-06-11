import { describe, expect, it } from "vitest";
import {
  buildPackEncounter,
  createCampaignState,
  createDefaultParty,
  createInitialState,
  resolveEncounterBattleMap,
  validateContentPack,
  type CampaignState,
  type ContentPack,
} from "../../src/core/index";
import { EMBERWATCH_PACK } from "../../src/content/emberwatch/pack";
import { MIRRORMARSH_PACK } from "../../src/content/mirrormarsh/pack";
import {
  DEFAULT_PACK_ID,
  findPackByGraphId,
  listPacks,
  PACK_REGISTRY,
} from "../../src/content/registry";

describe("Emberwatch content pack", () => {
  it("passes full pack validation", () => {
    const result = validateContentPack(EMBERWATCH_PACK);
    if (!result.ok) {
      // surfacing errors makes authored-content mistakes diagnosable
      expect(result.errors).toEqual([]);
    }
    expect(result.ok).toBe(true);
  });

  it("every combat encounter has a themed battle map", () => {
    for (const encounter of Object.values(EMBERWATCH_PACK.encounters)) {
      expect(encounter.battleMapId, `encounter ${encounter.id}`).toBeDefined();
      const resolved = resolveEncounterBattleMap(EMBERWATCH_PACK, encounter.id);
      expect(resolved, `battle map for ${encounter.id}`).not.toBeNull();
    }
  });

  it("multi-level districts assign every site to a declared level", () => {
    const spire = EMBERWATCH_PACK.districts["district_bell_spire"]!;
    expect(spire.levels.map((l) => l.id)).toEqual([
      "level_ground",
      "level_stair",
      "level_crown",
    ]);
    for (const site of spire.interiorGraph.sites) {
      expect(site.levelId, `site ${site.id}`).toBeDefined();
    }

    const vaults = EMBERWATCH_PACK.districts["district_ember_vaults"]!;
    expect(vaults.levels).toHaveLength(2);
  });

  it("builds a playable encounter with party on spawn tiles and walls blocked", () => {
    const party = createDefaultParty();
    const campaign: CampaignState = {
      ...createCampaignState(party, EMBERWATCH_PACK.worldGraph),
      currentSiteId: "site_ashen_road",
    };

    const { config, battleMap } = buildPackEncounter(
      campaign,
      EMBERWATCH_PACK.worldGraph,
      EMBERWATCH_PACK,
    );

    expect(battleMap).not.toBeNull();
    expect(config.width).toBe(battleMap!.width);
    expect(config.blockedTiles!.length).toBeGreaterThan(0);

    // party sits exactly on the battle map's spawn tiles
    const spawnKeys = new Set(battleMap!.partySpawns.map((s) => `${s.x},${s.y}`));
    for (const member of config.party) {
      expect(spawnKeys.has(`${member.x},${member.y}`)).toBe(true);
    }

    // and the combat state carries the blocked terrain
    const state = createInitialState(config);
    expect(state.map.blocked).toBeDefined();
  });

  it("rejects a pack with a dangling battle map reference", () => {
    const broken: ContentPack = {
      ...EMBERWATCH_PACK,
      encounters: {
        ...EMBERWATCH_PACK.encounters,
        enc_ashen_road: {
          ...EMBERWATCH_PACK.encounters["enc_ashen_road"]!,
          battleMapId: "bmap_does_not_exist",
        },
      },
    };
    const result = validateContentPack(broken);
    expect(result.ok).toBe(false);
  });

  it("alt pack (Mirrormarsh) also passes full validation", () => {
    const result = validateContentPack(MIRRORMARSH_PACK);
    if (!result.ok) {
      expect(result.errors).toEqual([]);
    }
    expect(result.ok).toBe(true);
  });

  it("registry resolves packs and finds them by graph id", () => {
    expect(DEFAULT_PACK_ID).toBe("pack_emberwatch");
    expect(listPacks().map((p) => p.id)).toContain("pack_mirrormarsh");
    expect(findPackByGraphId("graph_world_mirrormarsh")?.pack.id).toBe("pack_mirrormarsh");
    expect(findPackByGraphId("graph_world_nope")).toBeNull();

    // every art asset id referenced by a pack has a manifest entry shipped with it
    for (const { pack, manifestEntries } of Object.values(PACK_REGISTRY)) {
      expect(manifestEntries[pack.art.worldMap], `${pack.id} world art`).toBeDefined();
      for (const levels of Object.values(pack.art.districtMaps)) {
        for (const assetId of Object.values(levels)) {
          expect(manifestEntries[assetId], `${pack.id} asset ${assetId}`).toBeDefined();
        }
      }
    }
  });

  it("rejects a pack whose district lacks level art", () => {
    const broken: ContentPack = {
      ...EMBERWATCH_PACK,
      art: {
        ...EMBERWATCH_PACK.art,
        districtMaps: {
          ...EMBERWATCH_PACK.art.districtMaps,
          district_bell_spire: { level_ground: "map_emberwatch_spire_ground" },
        },
      },
    };
    const result = validateContentPack(broken);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("level"))).toBe(true);
    }
  });
});
