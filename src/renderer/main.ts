import * as THREE from "three";
import {
  applyCombatResultToCampaign,
  buildEncounterForSite,
  buildPackEncounter,
  createCampaignState,
  DEFAULT_DISTRICT_BRIEF,
  deserializeCampaign,
  formatBeat,
  formatCombatLogBatch,
  formatSiteAmbience,
  generateDistrictFromBrief,
  chooseEnemyAction,
  inspectTarget,
  spellDef,
  coneSpellDef,
  coneTiles,
  prepareSpellSlotsAtHaven,
  resolveSiteKind,
  markSiteHeld,
  shouldFightOnArrival,
  enterDistrict,
  exitDistrictToWorld,
  travelWithinDistrict,
  validateExitDistrict,
  isDistrictEntrance,
  M3_DEMO_GRAPH,
  M4_DEMO_ENCOUNTERS,
  serializeCampaign,
  type CampaignState,
  type ContentPack,
  type EncounterTemplate,
  type GameEvent,
  type GameState,
  type InitialStateConfig,
  type PackDistrict,
  type PartyDraft,
  type ResolvedBattleMap,
  type SiteId,
  type WorldGraph,
} from "../core/index";
import type { DistrictId, EncounterId, LevelId, PackId } from "../shared/ids";
import type { BeatId, EntityId } from "../shared/ids";
import { DevOverlay } from "./dev-overlay";
import {
  loadManifest,
  mergeManifests,
  resolveAssetPath,
  summarizeManifest,
  type AssetManifest,
} from "./assets/load-manifest";
import { ScenePresence } from "./scene-presence";
import { CombatSession } from "./combat-session";
import { CombatScene } from "./combat-scene";
import {
  actionModeToInspectKind,
  CombatHud,
  inspectModeForActor,
  type CombatActionMode,
} from "./combat-hud";
import { CreationScreen } from "./creation-screen";
import { WorldMapSession } from "./world-map-session";
import { GameOverScreen } from "./game-over-screen";
import { StrategicMapScreen, WorldMapScreen } from "./world-map-screen";
import { NarratorPanel } from "./narrator-panel";
import { CombatLogPanel } from "./combat-log-panel";
import type { District } from "../core/index";
import {
  DEFAULT_PACK_ID,
  findPackByGraphId,
  getPack,
  listPacks,
  PACK_REGISTRY,
} from "../content/registry";

const CAMPAIGN_STORAGE_KEY = "emberwatch.campaign";
const PACK_STORAGE_KEY = "emberwatch.pack";
const DEFAULT_DISTRICT_SEED = 42;

interface ActiveWorldContent {
  /** Active content pack; null → legacy procedural / M3 fallback content. */
  pack: ContentPack | null;
  worldGraph: WorldGraph;
  encounters: Record<EncounterId, EncounterTemplate>;
  /** Legacy single-district fields (procedural generator fallback). */
  legacyDistrict: District | null;
  legacyInteriorGraph: WorldGraph | null;
  isGenerated: boolean;
}

interface ActiveDistrictEntry {
  district: District;
  interiorGraph: WorldGraph;
  levels: PackDistrict["levels"];
  districtId: DistrictId;
}

const ISO_YAW = Math.PI / 4;
const ISO_PITCH = Math.atan(1 / Math.sqrt(2));
const GRID_SIZE = 12;
const TILE_SIZE = 1;
const COMBAT_END_LINGER_MS = 2000;
const ENEMY_ACTION_DELAY_MS = 650;
const DEFAULT_SCENE_BG = 0x0a0a0f;

function createIsometricCamera(
  width: number,
  height: number,
  gridExtent: number,
): THREE.OrthographicCamera {
  const aspect = width / height;
  const frustum = gridExtent * TILE_SIZE * 1.2;
  const camera = new THREE.OrthographicCamera(
    (-frustum * aspect) / 2,
    (frustum * aspect) / 2,
    frustum / 2,
    -frustum / 2,
    0.1,
    200,
  );

  const distance = 30;
  camera.position.set(
    distance * Math.sin(ISO_YAW) * Math.cos(ISO_PITCH),
    distance * Math.sin(ISO_PITCH),
    distance * Math.cos(ISO_YAW) * Math.cos(ISO_PITCH),
  );
  camera.lookAt(0, 0, 0);

  return camera;
}

function cssHexColor(color: string | undefined, fallback: number): number {
  if (!color) return fallback;
  const match = /^#([0-9a-f]{6})$/i.exec(color.trim());
  return match ? Number.parseInt(match[1]!, 16) : fallback;
}

function buildPackWorld(packId: PackId): ActiveWorldContent {
  const { pack } = getPack(packId);
  return {
    pack,
    worldGraph: pack.worldGraph,
    encounters: pack.encounters,
    legacyDistrict: null,
    legacyInteriorGraph: null,
    isGenerated: false,
  };
}

function buildGeneratedWorld(seed: number): ActiveWorldContent {
  try {
    const pkg = generateDistrictFromBrief(DEFAULT_DISTRICT_BRIEF, seed);
    return {
      pack: null,
      worldGraph: pkg.worldGraph,
      encounters: pkg.encounters,
      legacyDistrict: pkg.district,
      legacyInteriorGraph: pkg.interiorGraph,
      isGenerated: true,
    };
  } catch {
    return {
      pack: null,
      worldGraph: M3_DEMO_GRAPH,
      encounters: M4_DEMO_ENCOUNTERS,
      legacyDistrict: null,
      legacyInteriorGraph: null,
      isGenerated: false,
    };
  }
}

/** Content for a saved campaign's graph id: pack first, then legacy fallbacks. */
function resolveWorldContent(graphId: string, seed = DEFAULT_DISTRICT_SEED): ActiveWorldContent {
  const registered = findPackByGraphId(graphId);
  if (registered) {
    return buildPackWorld(registered.pack.id);
  }
  if (graphId === M3_DEMO_GRAPH.id) {
    return {
      pack: null,
      worldGraph: M3_DEMO_GRAPH,
      encounters: M4_DEMO_ENCOUNTERS,
      legacyDistrict: null,
      legacyInteriorGraph: null,
      isGenerated: false,
    };
  }
  return buildGeneratedWorld(seed);
}

function loadSelectedPackId(): PackId {
  const stored = localStorage.getItem(PACK_STORAGE_KEY) as PackId | null;
  return stored && PACK_REGISTRY[stored] ? stored : DEFAULT_PACK_ID;
}

function buildAcceptanceItems() {
  return [
    {
      id: "create_party",
      label: "Create named Fighter and Rogue",
      proof: "visual" as const,
      how: "fill names on Recruit your party screen, assign abilities/skills, Enter World",
    },
    {
      id: "world_map_open",
      label: "BG-style overworld map with party token",
      proof: "visual" as const,
      how: "after Enter World, see illustrated map, site markers, gold party token on current site",
    },
    {
      id: "world_map_travel",
      label: "Token animates between sites",
      proof: "visual" as const,
      how: "click a green-highlighted neighbor on map or sidebar; token walks there; walk 3+ sites",
    },
    {
      id: "world_graph_valid",
      label: "World graph validates in core",
      proof: "test" as const,
      how: "npm run test — world-graph.test.ts",
    },
    {
      id: "world_position_persist",
      label: "Party position persists across moves",
      proof: "test" as const,
      how: "npm run test — world-travel.test.ts",
    },
    {
      id: "party_on_grid",
      label: "Created party on combat grid from overworld",
      proof: "visual" as const,
      how: "travel to a site, click Enter site — your named party appears on the tactical grid",
    },
    {
      id: "enter_site",
      label: "Enter site from world map",
      proof: "visual" as const,
      how: "at a site (not traveling), click Enter site in sidebar — combat view replaces overworld",
    },
    {
      id: "hp_carry_over",
      label: "Party HP carries over after combat",
      proof: "visual" as const,
      how: "take damage in a fight, win, return to overworld — sidebar shows reduced HP",
    },
    {
      id: "game_over_defeat",
      label: "Defeat shows Game Over screen",
      proof: "visual" as const,
      how: "enter a site, let party fall — Game Over overlay (not overworld); Return to recruitment clears save",
    },
    {
      id: "m4_procedural_flags",
      label: "M4 mocks flagged in overlay",
      proof: "overlay" as const,
      how: "F3/~ lists enter_site_ui, site_encounter_mapping, game_over_screen as PROCEDURAL",
    },
    {
      id: "m5_narration_combat",
      label: "Narration panel updates during travel and combat",
      proof: "visual" as const,
      how: "travel on overworld — top-right shows current place only; in combat that panel becomes a dice combat log",
    },
    {
      id: "m5_story_beat",
      label: "Scripted story beat at Drowned Market",
      proof: "visual" as const,
      how: "travel to Drowned Market — place card appears with extra beat prose on first visit",
    },
    {
      id: "m5_narrator_toggle",
      label: "Narrator toggle does not affect mechanics",
      proof: "visual" as const,
      how: "uncheck Narration On in panel; travel, enter site, fight — HP and travel still work",
    },
    {
      id: "m5_procedural_flags",
      label: "M5 narrator flagged in overlay",
      proof: "overlay" as const,
      how: "F3/~ lists narrator_panel and narrator_template_prose as PROCEDURAL",
    },
    {
      id: "m6_district_reclamation",
      label: "Sites flip hostile to held after victory",
      proof: "visual" as const,
      how: "enter a site, win the fight — marker turns teal (Held); sidebar shows district progress",
    },
    {
      id: "m6_tier_gradient",
      label: "Inward tier gradient on generated district",
      proof: "visual" as const,
      how: "travel toward center sites — sidebar Tier rises; fights get tougher enemies",
    },
    {
      id: "m6_procedural_flags",
      label: "M6 district mocks flagged in overlay",
      proof: "overlay" as const,
      how: "F3/~ lists district_generator, district_reclamation_ui, district_overworld_art as PROCEDURAL",
    },
    {
      id: "end_turn",
      label: "End Turn button visible",
      proof: "visual" as const,
      how: "orange End Turn button in bottom-left HUD",
    },
    {
      id: "move_party",
      label: "Move Fighter and Rogue",
      proof: "visual" as const,
      how: "click a party box, then a destination tile within AP",
    },
    {
      id: "strike",
      label: "Strike reduces enemy HP",
      proof: "visual" as const,
      how: "select active character, click adjacent enemy; HUD shows HP drop",
    },
    {
      id: "flanking",
      label: "Flanking applies flat-footed",
      proof: "overlay" as const,
      how: "HUD enemy line shows [flat_footed] when flanked",
    },
    {
      id: "victory",
      label: "Finish the fight",
      proof: "visual" as const,
      how: "down all goblins — HUD shows Victory",
    },
    {
      id: "m2_defaults_flagged",
      label: "Fixed ancestry/background flagged",
      proof: "overlay" as const,
      how: "F3/~ overlay lists Human + default backgrounds as PROCEDURAL",
    },
    {
      id: "party_roundtrip",
      label: "Party round-trips through core",
      proof: "test" as const,
      how: "npm run test — party-roundtrip.test.ts",
    },
    {
      id: "srd_validation",
      label: "SRD character validation",
      proof: "test" as const,
      how: "npm run test — character-validation.test.ts",
    },
    {
      id: "stateless_renderer",
      label: "Renderer holds zero game state",
      proof: "test" as const,
      how: "npm run test — renderer-stateless.test.ts",
    },
    {
      id: "pipeline_contract",
      label: "Effect pipeline contract",
      proof: "test" as const,
      how: "npm run test — tests/contract/pipeline.test.ts",
    },
    {
      id: "m7_ranged_party",
      label: "4-hero ranged party (bow, rogue, wizard, cleric)",
      proof: "visual" as const,
      how: "creation screen shows four heroes; archer shoots at range; wizard casts Ray of Frost; cleric heals ally",
    },
    {
      id: "m7_combat_inspector",
      label: "Hover enemy for combat breakdown",
      proof: "visual" as const,
      how: "on your turn, hover an enemy — top-right panel shows HP, hit%, damage band",
    },
    {
      id: "m7_projectiles",
      label: "Placeholder projectiles on hits",
      proof: "visual" as const,
      how: "land a bow hit, spell hit, or heal — short VFX travels source to target",
    },
    {
      id: "m7_contract_tests",
      label: "M7 ranged combat contracts",
      proof: "test" as const,
      how: "npm run test — ranged-strike, cast-spell, cast-heal contract tests",
    },
    {
      id: "m7_procedural_flags",
      label: "M7 placeholders flagged in overlay",
      proof: "overlay" as const,
      how: "F3/~ lists combat_projectiles, combat_inspector as PROCEDURAL (m7_spell_rules superseded by real M9 slot rules)",
    },
    {
      id: "m8_world_map_art",
      label: "Illustrated world map (Emberwatch Frontier)",
      proof: "visual" as const,
      how: "Enter World — parchment map painting with sea, river, roads, and site glyphs under the markers",
    },
    {
      id: "m8_district_map_art",
      label: "Illustrated district maps incl. multi-level",
      proof: "visual" as const,
      how: "enter The Drowned Quay (harbor plan); enter The Bell Spire — three floor plans, map switches as you climb",
    },
    {
      id: "m8_battle_map_themes",
      label: "District-themed battle maps with walls and props",
      proof: "visual" as const,
      how: "fight on the Ashen Road (road + carts), the bridge (water gaps), the docks, the spire, the vaults — walls block movement",
    },
    {
      id: "m8_world_combat",
      label: "Combat on hostile world-map sites",
      proof: "visual" as const,
      how: "travel to The Ashen Road — fight triggers on arrival; victory flips the site to Held on the world map",
    },
    {
      id: "m8_alt_pack",
      label: "Alt content pack swaps the whole game skin",
      proof: "visual" as const,
      how: "on the recruit screen pick The Mirrormarsh — green fen world map, different district, marsh battle maps; no code change",
    },
    {
      id: "m8_pack_validation",
      label: "Content packs validate in core",
      proof: "test" as const,
      how: "npm run test — content-packs.test.ts, battle-map.test.ts, blocked-terrain.test.ts",
    },
    {
      id: "m9_basic_saves",
      label: "Breathe Fire — basic Reflex saves in the log",
      proof: "visual" as const,
      how: "Wizard: pick Breathe Fire, hover a tile for the cone preview, cast — the combat log shows each creature's Reflex save (crit/success/fail) and the resulting damage",
    },
    {
      id: "m9_resistance_weakness",
      label: "Resistance and weakness adjust damage",
      proof: "visual" as const,
      how: "fight the Ashen Road (ember mobs resist fire 3, weak to cold 2) and the Drowned Quay (drowned mobs resist cold 3, weak to fire 2) — hover inspector and log show the adjusted numbers",
    },
    {
      id: "m9_spell_slots",
      label: "Leveled spells consume per-day slots",
      proof: "visual" as const,
      how: "HUD shows slots per hero (Wizard 2× Breathe Fire; Cleric 6× Heal incl. 4 divine font); casting spends a slot in the log; buttons disable at 0; Ray of Frost stays at-will",
    },
    {
      id: "m9_slot_recovery",
      label: "Safe-haven rest restores slots (interim)",
      proof: "overlay" as const,
      how: "travel to a shelter site (e.g. Pilgrim's Rest) with expended slots — narration notes re-preparation; F3/~ lists m9_slot_recovery as PROCEDURAL until M19 rest",
    },
    {
      id: "m9_path_aware_step",
      label: "Movement can no longer cross walls",
      proof: "visual" as const,
      how: "on a battle map with walls, click a tile behind a wall — the hero only moves if a route exists within AP, and the AP cost equals the route length",
    },
    {
      id: "m9_contract_tests",
      label: "M9 combat-depth contracts",
      proof: "test" as const,
      how: "npm run test — save-resolution, resistance-weakness, spell-slots, path-aware-step, cone-template tests",
    },
  ];
}

function init(): void {
  const container = document.getElementById("app");
  if (!container) {
    throw new Error("Missing #app container");
  }

  // Base manifest + every registered content pack's asset entries.
  let manifest: AssetManifest = loadManifest();
  for (const registered of Object.values(PACK_REGISTRY)) {
    manifest = mergeManifests(manifest, registered.manifestEntries);
  }
  const manifestSummary = summarizeManifest(manifest);

  function assetUrl(assetId: string): string | null {
    const entry = manifest.assets[assetId];
    return entry ? resolveAssetPath(entry) : null;
  }

  const presence = new ScenePresence();

  presence.registerRendered(
    "strategic_map_art",
    "M8 illustrated world + district maps (SVG) from content pack via asset manifest",
  );
  presence.registerRendered(
    "battle_map_tilesets",
    "M8 themed battle-map tiles/walls/props from content pack tilesets (vector colors; textured art later)",
  );
  presence.registerRendered(
    "battle_map_blocking",
    "M9 path-aware Step — blocked terrain can neither be landed on nor crossed; AP cost = route length",
  );
  presence.registerProcedural(
    "tile_grid",
    "fallback checkerboard tiles — used only when an encounter has no battle map",
  );
  presence.registerProcedural("fighter_token", "blue box mesh — fighter_token GLB placeholder");
  presence.registerProcedural("rogue_token", "blue box mesh — rogue_token not in manifest yet");
  presence.registerProcedural("goblin_token", "green box mesh — goblin_token not in manifest yet");
  presence.registerProcedural(
    "creation_screen",
    "M2 character creation UI — real interface, not a mock",
  );
  presence.registerProcedural(
    "fixed_ancestry_human",
    "Human ancestry fixed for M2 — not selectable on creation screen",
  );
  presence.registerProcedural(
    "fixed_background_fighter",
    "Warrior background fixed for Fighter slot — not selectable in M2",
  );
  presence.registerProcedural(
    "fixed_background_rogue",
    "Criminal background fixed for Rogue slot — not selectable in M2",
  );
  presence.registerManifestOnly(
    "tile_floor",
    "manifest entry exists; scene uses procedural tile_grid",
  );
  presence.registerManifestOnly(
    "fighter_token",
    "manifest lists box-blue.glb; scene uses procedural box",
  );
  presence.registerRendered(
    "world_map_graph",
    "M8 authored pack world graph (Emberwatch Frontier / Mirrormarsh); legacy procedural graphs remain for old saves",
  );
  presence.registerProcedural(
    "world_map_ui",
    "BG-style DOM strategic map chrome — markers, sidebar, animated token (art behind it is pack-supplied)",
  );
  presence.registerProcedural(
    "world_map_token",
    "gold party token (⚔) — procedural marker, not a final asset",
  );
  presence.registerProcedural(
    "enter_site_ui",
    "Enter site sidebar button — M4 procedural UI until final UX pass",
  );
  presence.registerProcedural(
    "site_encounter_mapping",
    "M4 demo site→encounter registry — tier-scaled goblin squads, not generated districts",
  );
  presence.registerProcedural(
    "game_over_screen",
    "M4 defeat Game Over overlay — procedural placeholder screen",
  );
  presence.registerProcedural(
    "narrator_panel",
    "M5 narration sidebar — template prose from event log, not runtime LLM",
  );
  presence.registerProcedural(
    "narrator_template_prose",
    "M5 deterministic event→line templates and static beat catalog — PROCEDURAL until LLM narrator",
  );
  presence.registerProcedural(
    "site_ambience_catalog",
    "M5 per-site ambient prose on first visit — static template catalog, not generated districts",
  );
  presence.registerProcedural(
    "combat_log_panel",
    "M5 combat dice log — separate from narration; strike rolls from event log payload",
  );
  presence.registerProcedural(
    "district_generator",
    "M6 procedural brief→layout — seeded template, not runtime LLM",
  );
  presence.registerProcedural(
    "district_tile_grids",
    "M6 validated area tile grids — not rendered locally until free-roam milestone",
  );
  presence.registerProcedural(
    "district_reclamation_ui",
    "M6 hostile/held site markers and district progress — placeholder styling",
  );
  presence.registerRendered(
    "district_overworld_art",
    "M8 illustrated district interiors (incl. per-level tower/dungeon plans) from the content pack",
  );
  presence.registerProcedural(
    "location_map_screen",
    "M6 area tile-grid preview between overworld and combat — not free-roam yet",
  );
  presence.registerProcedural(
    "wizard_token",
    "M7 blue box mesh — wizard_token GLB placeholder",
  );
  presence.registerProcedural(
    "cleric_token",
    "M7 blue box mesh — cleric_token GLB placeholder",
  );
  presence.registerProcedural(
    "combat_projectiles",
    "M7 arrow/spell/heal placeholder meshes — see ASSETS_NEEDED.md",
  );
  presence.registerProcedural(
    "combat_inspector",
    "M7 hover target breakdown — pure-core math, DOM overlay",
  );
  presence.registerRendered(
    "m9_spell_rules",
    "M9 saves, resistance/weakness, slots, Breathe Fire from vendored SRD (rules/srd/m9-subset.json)",
  );
  presence.registerProcedural(
    "m9_slot_recovery",
    "free slot re-preparation on arriving at a safe haven — PROCEDURAL stand-in until M19 rest",
  );
  presence.registerProcedural(
    "m9_cone_line_of_effect",
    "Breathe Fire cone ignores walls — line of sight/effect arrives in M11",
  );

  const devOverlay = new DevOverlay(import.meta.env.DEV);
  const acceptance = buildAcceptanceItems();
  devOverlay.setState({ summary: manifestSummary, presence, acceptance });

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0f);
  scene.fog = new THREE.Fog(0x0a0a0f, 40, 80);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.display = "none";
  container.appendChild(renderer.domElement);

  let cameraExtent = GRID_SIZE;
  let camera = createIsometricCamera(container.clientWidth, container.clientHeight, cameraExtent);

  const ambient = new THREE.AmbientLight(0x606878, 0.6);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff0d8, 1.1);
  sun.position.set(8, 16, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);

  let selectedPackId: PackId = loadSelectedPackId();
  let activeWorld: ActiveWorldContent = buildPackWorld(selectedPackId);
  let combatSession: CombatSession | null = null;
  let combatScene: CombatScene | null = null;
  let combatHud: CombatHud | null = null;
  let combatActive = false;
  let worldMapSession: WorldMapSession | null = null;
  let combatEndedHandled = false;
  let combatEndTimer: number | null = null;
  let enemyTurnTimer: number | null = null;
  const worldMapScreen = new WorldMapScreen(document.body);
  const districtMapScreen = new StrategicMapScreen(document.body, "district");
  const narratorPanel = new NarratorPanel(document.body);
  const combatLogPanel = new CombatLogPanel(document.body);
  let worldEventUnsubscribe: (() => void) | null = null;

  function siteLabelFor(graph: WorldGraph, siteId: SiteId): string {
    return graph.sites.find((s) => s.id === siteId)?.label ?? siteId;
  }

  /** Active district content for the campaign's current district (pack or legacy). */
  function activeDistrictEntry(state: CampaignState): ActiveDistrictEntry | null {
    if (activeWorld.pack) {
      const districtId =
        state.activeDistrictId ??
        activeWorld.worldGraph.sites.find((s) => s.id === state.currentSiteId)?.districtId;
      if (!districtId) return null;
      const entry = activeWorld.pack.districts[districtId];
      if (!entry) return null;
      return {
        district: entry.district,
        interiorGraph: entry.interiorGraph,
        levels: entry.levels,
        districtId,
      };
    }
    if (activeWorld.legacyDistrict && activeWorld.legacyInteriorGraph) {
      return {
        district: activeWorld.legacyDistrict,
        interiorGraph: activeWorld.legacyInteriorGraph,
        levels: [],
        districtId: activeWorld.legacyDistrict.id,
      };
    }
    return null;
  }

  function districtLevelBackground(entry: ActiveDistrictEntry, levelId: LevelId): string | null {
    const art = activeWorld.pack?.art.districtMaps[entry.districtId];
    const assetId = art?.[levelId];
    return assetId ? assetUrl(assetId) : null;
  }

  function worldBackgroundUrl(): string | null {
    return activeWorld.pack ? assetUrl(activeWorld.pack.art.worldMap) : null;
  }

  function buildCombatNarrationContext(state: GameState) {
    return {
      entityLabels: Object.fromEntries(
        Object.entries(state.entities).map(([id, e]) => [id, e.label]),
      ),
    };
  }

  function buildWorldNarrationContext(graph: WorldGraph, siteId: SiteId) {
    return {
      entityLabels: {},
      siteLabel: siteLabelFor(graph, siteId),
    };
  }

  function campaignHasBeatTriggered(state: CampaignState, beatId: BeatId): boolean {
    return state.eventLog.some(
      (e) => e.type === "StoryBeatTriggered" && e.payload.beat_id === beatId,
    );
  }

  function showCurrentSiteNarration(siteId: SiteId): void {
    const graph = activeWorld.worldGraph;
    const label = siteLabelFor(graph, siteId);
    narratorPanel.setCurrentPlace(label, [
      formatSiteAmbience(siteId, label, activeWorld.pack?.ambience),
    ]);
    maybeAutoTriggerBeat(siteId);
  }

  function maybeAutoTriggerBeat(siteId: SiteId): void {
    if (!worldMapSession) return;
    const graph = activeWorld.worldGraph;
    const site = graph.sites.find((s) => s.id === siteId);
    if (!site?.beatId) return;
    if (campaignHasBeatTriggered(worldMapSession.getState(), site.beatId)) return;
    worldMapSession.triggerStoryBeat(graph, site.beatId);
  }

  function handleWorldNarration(events: GameEvent[]): void {
    if (!narratorPanel.isEnabled()) return;
    for (const event of events) {
      if (event.type === "Traveled") {
        showCurrentSiteNarration(event.payload.to_site_id as SiteId);
      }
      if (event.type === "StoryBeatTriggered") {
        const siteId = event.payload.site_id as SiteId;
        const beatId = event.payload.beat_id as BeatId;
        narratorPanel.appendCurrentLine(
          formatBeat(beatId, buildWorldNarrationContext(activeWorld.worldGraph, siteId)),
        );
      }
    }
  }

  narratorPanel.setOnEnabledChange(() => refreshWorldOverlay());
  const gameOverScreen = new GameOverScreen(document.body, {
    onReturnToCreation: () => {
      localStorage.removeItem(CAMPAIGN_STORAGE_KEY);
      gameOverScreen.hide();
      worldMapScreen.hide();
      creationScreen.show();
      refreshWorldOverlay();
    },
  });

  function loadSavedCampaign(): CampaignState | null {
    try {
      const raw = localStorage.getItem(CAMPAIGN_STORAGE_KEY);
      if (!raw) return null;
      return deserializeCampaign(raw);
    } catch {
      return null;
    }
  }

  function persistCampaign(state: CampaignState): void {
    localStorage.setItem(CAMPAIGN_STORAGE_KEY, serializeCampaign(state));
  }

  function refreshWorldOverlay(): void {
    devOverlay.setState({ summary: manifestSummary, presence, acceptance: buildAcceptanceItems() });
  }

  const pointer = new THREE.Vector2();

  function refreshHudAndOverlay(): void {
    if (!combatSession || !combatHud) return;
    combatHud.update(combatSession.getState());
    devOverlay.setState({ summary: manifestSummary, presence, acceptance: buildAcceptanceItems() });
  }

  function clearCombatTimers(): void {
    if (combatEndTimer !== null) {
      clearTimeout(combatEndTimer);
      combatEndTimer = null;
    }
    if (enemyTurnTimer !== null) {
      clearTimeout(enemyTurnTimer);
      enemyTurnTimer = null;
    }
  }

  function endTurn(): void {
    if (!combatSession) return;
    const state = combatSession.getState();
    const activeId = state.combat.activeActorId;
    if (!activeId || state.combat.phase !== "active") return;

    const acted = combatSession.dispatch({
      kind: "EndTurn",
      actionId: `act_end_${Date.now()}`,
      actorId: activeId,
    });
    if (acted) refreshHudAndOverlay();
  }

  function runEnemyTurn(): void {
    if (!combatSession) return;
    const state = combatSession.getState();
    if (state.combat.phase !== "active") return;

    const activeId = state.combat.activeActorId;
    if (!activeId) return;
    const actor = state.entities[activeId];
    if (!actor || actor.team !== "enemy") return;

    const action = chooseEnemyAction(state, activeId);
    if (!action) {
      endTurn();
      return;
    }

    if (action.kind === "EndTurn") {
      endTurn();
      return;
    }

    const acted = combatSession.dispatch(action);
    if (!acted) {
      endTurn();
      return;
    }

    enemyTurnTimer = window.setTimeout(() => {
      enemyTurnTimer = null;
      const next = combatSession?.getState();
      if (!next || next.combat.phase !== "active") return;
      const stillActive = next.combat.activeActorId;
      const stillActor = stillActive ? next.entities[stillActive] : null;
      if (stillActor?.team === "enemy" && stillActor.actionPoints > 0) {
        runEnemyTurn();
      } else if (stillActor?.team === "enemy") {
        endTurn();
      }
    }, ENEMY_ACTION_DELAY_MS);
  }

  function scheduleEnemyTurn(): void {
    enemyTurnTimer = window.setTimeout(() => {
      enemyTurnTimer = null;
      runEnemyTurn();
    }, ENEMY_ACTION_DELAY_MS);
  }

  function updateRangeHighlight(): void {
    if (!combatSession || !combatScene) return;
    const state = combatSession.getState();
    const activeId = state.combat.activeActorId;
    if (!activeId) {
      combatScene.setRangeHighlight(null, 0);
      return;
    }
    const actor = state.entities[activeId];
    if (!actor || actor.team !== "party") {
      combatScene.setRangeHighlight(null, 0);
      return;
    }
    const mode = combatHud?.getActionMode() ?? "strike";
    if (mode === "cast_spell") {
      combatScene.setRangeHighlight(activeId, spellDef("ray_of_frost").rangeTiles);
    } else if (mode === "cast_heal") {
      combatScene.setRangeHighlight(activeId, spellDef("heal_ranged").rangeTiles);
    } else if (mode === "cast_cone") {
      combatScene.setRangeHighlight(activeId, coneSpellDef("breathe_fire").coneLengthTiles);
    } else if (mode === "move") {
      combatScene.setRangeHighlight(activeId, actor.actionPoints);
    } else {
      combatScene.setRangeHighlight(activeId, actor.strikeRange);
    }
    if (mode !== "cast_cone") {
      combatScene.setAreaHighlight(null);
    }
  }

  function dispatchConeCast(actorId: EntityId, targetX: number, targetY: number): boolean {
    if (!combatSession) return false;
    return combatSession.dispatch({
      kind: "CastConeSpell",
      actionId: `act_cast_cone_${Date.now()}`,
      actorId,
      spellId: "breathe_fire",
      targetX,
      targetY,
    });
  }

  function dispatchCombatAction(
    actorId: EntityId,
    targetId: EntityId,
    mode: CombatActionMode,
  ): boolean {
    if (!combatSession) return false;
    const actionId = `act_${mode}_${Date.now()}`;
    if (mode === "cast_spell") {
      return combatSession.dispatch({
        kind: "CastSpell",
        actionId,
        actorId,
        spellId: "ray_of_frost",
        targetId,
      });
    }
    if (mode === "cast_heal") {
      return combatSession.dispatch({
        kind: "CastHeal",
        actionId,
        actorId,
        spellId: "heal_ranged",
        targetId,
      });
    }
    return combatSession.dispatch({
      kind: "Strike",
      actionId,
      actorId,
      targetId,
    });
  }

  function handlePointerClick(event: MouseEvent): void {
    if (!combatActive || !combatSession || !combatScene) return;
    if (combatSession.getState().combat.phase !== "active") return;

    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const pick = combatScene.pick(camera, pointer);
    if (!pick) return;

    const state = combatSession.getState();
    const activeId = state.combat.activeActorId;

    if (pick.kind === "entity") {
      const entity = state.entities[pick.entityId as EntityId];
      if (!entity) return;

      const mode = combatHud?.getActionMode() ?? "strike";
      if (entity.downed && mode !== "cast_heal") return;

      if (entity.team === "party") {
        const selectedId = combatScene.getSelectedEntity();
        if (mode === "cast_heal" && selectedId === activeId && activeId) {
          const acted = dispatchCombatAction(activeId, pick.entityId as EntityId, "cast_heal");
          if (acted) refreshHudAndOverlay();
          return;
        }
        if (entity.downed) return;
        combatScene.setSelectedEntity(pick.entityId);
        return;
      }

      const selectedId = combatScene.getSelectedEntity();
      if (!selectedId || selectedId !== activeId) return;

      const actor = state.entities[selectedId as EntityId];
      if (!actor || actor.team !== "party") return;

      if (mode === "cast_heal" || mode === "move") return;

      if (mode === "cast_cone") {
        // Aim the cone at the enemy's tile (allies in the template are hit too).
        const acted = dispatchConeCast(selectedId as EntityId, entity.x, entity.y);
        if (acted) refreshHudAndOverlay();
        return;
      }

      const acted = dispatchCombatAction(selectedId as EntityId, pick.entityId as EntityId, mode);
      if (acted) refreshHudAndOverlay();
      return;
    }

    const selectedId = combatScene.getSelectedEntity();
    if (!selectedId || selectedId !== activeId) return;

    if ((combatHud?.getActionMode() ?? "strike") === "cast_cone") {
      const acted = dispatchConeCast(selectedId as EntityId, pick.x, pick.y);
      if (acted) refreshHudAndOverlay();
      return;
    }

    const acted = combatSession.dispatch({
      kind: "Step",
      actionId: `act_step_${Date.now()}`,
      actorId: selectedId as typeof activeId & string,
      x: pick.x,
      y: pick.y,
    });
    if (acted) refreshHudAndOverlay();
  }

  function handlePointerMove(event: MouseEvent): void {
    if (!combatActive || !combatSession || !combatScene || !combatHud) return;

    const state = combatSession.getState();
    const activeId = state.combat.activeActorId;
    if (!activeId || state.combat.phase !== "active") {
      combatHud.hideInspector();
      return;
    }

    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    const pick = combatScene.pick(camera, pointer);

    const actor = state.entities[activeId];
    const hudMode = actor ? inspectModeForActor(actor.classId, combatHud.getActionMode()) : "strike";

    // Breathe Fire cone preview on whatever tile/entity is hovered.
    if (actor?.team === "party" && hudMode === "cast_cone" && pick) {
      const aimX = pick.kind === "entity" ? state.entities[pick.entityId as EntityId]?.x : pick.x;
      const aimY = pick.kind === "entity" ? state.entities[pick.entityId as EntityId]?.y : pick.y;
      if (aimX !== undefined && aimY !== undefined) {
        const tiles = coneTiles(
          actor.x,
          actor.y,
          aimX,
          aimY,
          coneSpellDef("breathe_fire").coneLengthTiles,
        ).filter((t) => t.x >= 0 && t.y >= 0 && t.x < state.map.width && t.y < state.map.height);
        combatScene.setAreaHighlight(tiles.length > 0 ? tiles : null);
      }
    } else {
      combatScene.setAreaHighlight(null);
    }

    if (!pick || pick.kind !== "entity") {
      combatHud.hideInspector();
      return;
    }

    const entity = state.entities[pick.entityId as EntityId];
    if (!entity || !actor || actor.team !== "party") {
      combatHud.hideInspector();
      return;
    }

    const mode = hudMode;
    if (mode === "move") {
      // Move never casts — no target inspection, just reposition freely.
      combatHud.hideInspector();
      return;
    }
    if (mode !== "cast_heal" && entity.downed) {
      combatHud.hideInspector();
      return;
    }

    if (mode === "cast_heal") {
      if (entity.team !== "party") {
        combatHud.hideInspector();
        return;
      }
    } else if (mode !== "cast_cone" && entity.team !== "enemy") {
      // Breathe Fire inspects allies too — they take friendly fire in the cone.
      combatHud.hideInspector();
      return;
    }

    const inspectKind = actionModeToInspectKind(mode);
    const spellId =
      mode === "cast_spell"
        ? "ray_of_frost"
        : mode === "cast_cone"
          ? "breathe_fire"
          : mode === "cast_heal"
            ? "heal_ranged"
            : undefined;
    const info = inspectTarget(state, activeId, pick.entityId as EntityId, inspectKind, spellId);
    if (!info) {
      combatHud.hideInspector();
      return;
    }
    combatHud.showInspector(entity.label, info, event.clientX, event.clientY);
  }

  renderer.domElement.addEventListener("click", handlePointerClick);
  renderer.domElement.addEventListener("mousemove", handlePointerMove);
  renderer.domElement.addEventListener("mouseleave", () => combatHud?.hideInspector());

  window.addEventListener("keydown", (event) => {
    if (event.key === "e" || event.key === "E") {
      endTurn();
    }
  });

  function resize(): void {
    const width = container!.clientWidth;
    const height = container!.clientHeight;
    camera = createIsometricCamera(width, height, cameraExtent);
    renderer.setSize(width, height);
  }

  window.addEventListener("resize", resize);
  resize();

  let lastFrameMs = performance.now();

  function animate(now: number): void {
    requestAnimationFrame(animate);
    const deltaMs = now - lastFrameMs;
    lastFrameMs = now;
    if (combatActive) {
      combatScene?.tick(deltaMs);
      renderer.render(scene, camera);
    }
  }

  animate(performance.now());

  function teardownCombat(): void {
    clearCombatTimers();
    combatActive = false;
    combatEndedHandled = false;
    renderer.domElement.style.display = "none";
    scene.background = new THREE.Color(DEFAULT_SCENE_BG);
    scene.fog = new THREE.Fog(DEFAULT_SCENE_BG, 40, 80);
    combatLogPanel.hide();
    combatLogPanel.clear();
    combatHud?.destroy();
    combatScene?.destroy(scene);
    combatSession = null;
    combatScene = null;
    combatHud = null;
  }

  function beginCombatSession(
    config: InitialStateConfig,
    battleMap?: ResolvedBattleMap | null,
  ): void {
    teardownCombat();
    renderer.domElement.style.display = "block";
    narratorPanel.hide();
    combatLogPanel.clear();
    combatLogPanel.show();

    const bgColor = cssHexColor(battleMap?.background, DEFAULT_SCENE_BG);
    scene.background = new THREE.Color(bgColor);
    scene.fog = new THREE.Fog(bgColor, 40, 80);
    cameraExtent = Math.max(config.width, config.height);

    combatSession = new CombatSession(config);
    combatScene = new CombatScene({
      width: config.width,
      height: config.height,
      tileSize: TILE_SIZE,
    });
    combatHud = new CombatHud(document.body);
    combatHud.show();
    combatHud.setOnEndTurn(endTurn);
    combatHud.setOnActionModeChange(() => {
      updateRangeHighlight();
      refreshHudAndOverlay();
    });

    combatScene.buildTiles(scene, battleMap ?? null);
    combatScene.buildEntityMeshes(scene, combatSession.getState());
    combatScene.bootstrapFromState(combatSession.getState());
    combatHud.update(combatSession.getState());
    updateRangeHighlight();
    combatActive = true;
    resize();

    combatSession.subscribe((events) => {
      combatScene!.onEvent(events);
      updateRangeHighlight();
      refreshHudAndOverlay();
      combatLogPanel.appendLines(
        formatCombatLogBatch(events, buildCombatNarrationContext(combatSession!.getState())),
      );

      const combatEnded = events.find((e) => e.type === "CombatEnded");
      if (combatEnded && !combatEndedHandled) {
        combatEndedHandled = true;
        combatScene!.setRangeHighlight(null, 0);
        combatHud!.hideInspector();
        const outcome = combatEnded.payload.outcome === "victory" ? "victory" : "defeat";
        combatEndTimer = window.setTimeout(() => {
          combatEndTimer = null;
          handleCombatEnded(outcome);
        }, COMBAT_END_LINGER_MS);
        return;
      }

      const turnStarted = events.find((e) => e.type === "TurnStarted");
      if (turnStarted) {
        const actorId = turnStarted.payload.entity_id as EntityId;
        const actor = combatSession!.getState().entities[actorId];
        if (actor?.team === "party") {
          combatScene!.setSelectedEntity(actorId);
          updateRangeHighlight();
        } else if (actor?.team === "enemy") {
          scheduleEnemyTurn();
        }
      }
    });

    const active = combatSession.getState().combat.activeActorId;
    if (active) {
      const actor = combatSession.getState().entities[active];
      if (actor?.team === "party") {
        combatScene.setSelectedEntity(active);
      } else if (actor?.team === "enemy") {
        scheduleEnemyTurn();
      }
    }
  }

  function buildCombatConfig(
    campaign: CampaignState,
    graph: WorldGraph,
  ): { config: InitialStateConfig; battleMap: ResolvedBattleMap | null } {
    if (activeWorld.pack) {
      return buildPackEncounter(campaign, graph, activeWorld.pack);
    }
    return {
      config: buildEncounterForSite(campaign, graph, activeWorld.encounters),
      battleMap: null,
    };
  }

  function handleCombatEnded(outcome: "victory" | "defeat"): void {
    if (!worldMapSession || !combatSession) return;

    let updated = applyCombatResultToCampaign(
      worldMapSession.getState(),
      combatSession.getState(),
    );

    teardownCombat();

    if (outcome === "victory") {
      if (updated.mapLayer === "district" && updated.currentAreaSiteId) {
        const entry = activeDistrictEntry(updated);
        const areaSiteId = updated.currentAreaSiteId;
        updated = markSiteHeld(updated, entry?.interiorGraph ?? activeWorld.worldGraph, areaSiteId);
        worldMapSession.replaceState(updated);
        persistCampaign(updated);
        showDistrictArea(areaSiteId, { afterVictory: true });
      } else {
        // world-layer fight: hold the site and return to the overworld
        updated = markSiteHeld(updated, activeWorld.worldGraph, updated.currentSiteId);
        worldMapSession.replaceState(updated);
        persistCampaign(updated);
        worldMapScreen.show();
        narratorPanel.show();
        showCurrentSiteNarration(updated.currentSiteId);
      }
      refreshWorldOverlay();
      return;
    }

    persistCampaign(updated);
    worldMapScreen.hide();
    districtMapScreen.hide();
    gameOverScreen.show();
    refreshWorldOverlay();
  }

  function returnToWorldMapFromDistrict(): void {
    if (!worldMapSession) return;
    const entry = activeDistrictEntry(worldMapSession.getState());
    if (!entry) return;
    const errors = validateExitDistrict(worldMapSession.getState(), entry.district);
    if (errors.length > 0) return;

    const next = exitDistrictToWorld(worldMapSession.getState());
    worldMapSession.replaceState(next);
    persistCampaign(next);
    districtMapScreen.hide();
    worldMapScreen.show();
    narratorPanel.show();
    showCurrentSiteNarration(next.currentSiteId);
    refreshWorldOverlay();
  }

  function beginCombatInDistrict(): void {
    if (!worldMapSession) return;
    const state = worldMapSession.getState();
    const entry = activeDistrictEntry(state);
    const areaSiteId = state.currentAreaSiteId;
    if (!entry || !areaSiteId) return;
    const site = entry.interiorGraph.sites.find((s) => s.id === areaSiteId);
    if (!site || !shouldFightOnArrival(state, site)) return;

    const combatState = { ...state, currentSiteId: areaSiteId };
    districtMapScreen.hide();
    const { config, battleMap } = buildCombatConfig(combatState, entry.interiorGraph);
    beginCombatSession(config, battleMap);
  }

  function handleDistrictAreaArrived(siteId: SiteId): void {
    if (!worldMapSession) return;
    const state = worldMapSession.getState();
    const entry = activeDistrictEntry(state);
    const site = entry?.interiorGraph.sites.find((s) => s.id === siteId);
    if (site && shouldFightOnArrival(state, site)) {
      beginCombatInDistrict();
    }
  }

  function showDistrictArea(areaSiteId: SiteId, options?: { afterVictory?: boolean }): void {
    if (!worldMapSession) return;
    const state = worldMapSession.getState();
    const entry = activeDistrictEntry(state);
    if (!entry) return;
    const site = entry.interiorGraph.sites.find((s) => s.id === areaSiteId);
    if (!site) return;

    worldMapScreen.hide();
    narratorPanel.hide();

    districtMapScreen.bindDistrict(worldMapSession, entry.interiorGraph, {
      districtLabel: entry.district.label,
      levels: entry.levels,
      backgroundForLevel: (levelId) => districtLevelBackground(entry, levelId),
      canReturnToWorldMap: () =>
        isDistrictEntrance(entry.district, worldMapSession!.getState().currentAreaSiteId!),
      onReturnToWorldMap: returnToWorldMapFromDistrict,
      onAreaArrived: handleDistrictAreaArrived,
      onTravel: (targetSiteId) => {
        const result = travelWithinDistrict(
          worldMapSession!.getState(),
          entry.interiorGraph,
          targetSiteId,
        );
        if (!result.ok) return false;
        worldMapSession!.replaceState(result.state);
        persistCampaign(result.state);
        return true;
      },
    });
    districtMapScreen.show();

    if (!options?.afterVictory && shouldFightOnArrival(state, site)) {
      beginCombatInDistrict();
    }
  }

  function enterDistrictFromWorld(): void {
    if (!worldMapSession) return;
    const state = worldMapSession.getState();
    const worldSite = activeWorld.worldGraph.sites.find((s) => s.id === state.currentSiteId);
    if (!worldSite?.districtId) return;
    const entry = activeWorld.pack
      ? (() => {
          const packEntry = activeWorld.pack!.districts[worldSite.districtId!];
          return packEntry
            ? {
                district: packEntry.district,
                interiorGraph: packEntry.interiorGraph,
              }
            : null;
        })()
      : activeWorld.legacyDistrict && activeWorld.legacyInteriorGraph
        ? { district: activeWorld.legacyDistrict, interiorGraph: activeWorld.legacyInteriorGraph }
        : null;
    if (!entry) return;

    const next = enterDistrict(state, entry.district, entry.interiorGraph, worldSite.id);
    worldMapSession.replaceState(next);
    persistCampaign(next);
    showDistrictArea(next.currentAreaSiteId!);
  }

  /** World-layer combat: hostile combat sites fight on arrival (same rule as districts). */
  function handleWorldArrival(siteId: SiteId): void {
    if (!worldMapSession) return;
    const state = worldMapSession.getState();
    const site = activeWorld.worldGraph.sites.find((s) => s.id === siteId);
    if (!site) return;

    // Safe haven: free re-preparation of spell slots (PROCEDURAL until M19 rest).
    if (resolveSiteKind(site) === "shelter") {
      const prepared = prepareSpellSlotsAtHaven(state, activeWorld.worldGraph);
      if (prepared.ok && prepared.events.length > 0) {
        worldMapSession.replaceState(prepared.state);
        persistCampaign(prepared.state);
        if (narratorPanel.isEnabled()) {
          narratorPanel.appendCurrentLine(
            "The party rests in safety; expended spells are prepared anew.",
          );
        }
      }
      return;
    }

    if (!shouldFightOnArrival(state, site)) return;

    worldMapScreen.hide();
    narratorPanel.hide();
    const { config, battleMap } = buildCombatConfig(state, activeWorld.worldGraph);
    beginCombatSession(config, battleMap);
  }

  function showActiveMapLayer(): void {
    if (!worldMapSession) return;
    const state = worldMapSession.getState();
    if (state.mapLayer === "district" && state.currentAreaSiteId) {
      showDistrictArea(state.currentAreaSiteId);
      return;
    }
    worldMapScreen.show();
    narratorPanel.show();
    showCurrentSiteNarration(state.currentSiteId);
  }

  function startWorldMap(party: PartyDraft, initialState?: CampaignState): void {
    creationScreen.hide();
    gameOverScreen.hide();
    teardownCombat();
    renderer.domElement.style.display = "none";
    worldEventUnsubscribe?.();
    worldEventUnsubscribe = null;

    if (initialState) {
      activeWorld = resolveWorldContent(initialState.graphId, DEFAULT_DISTRICT_SEED);
    } else {
      activeWorld = buildPackWorld(selectedPackId);
    }

    const graph = activeWorld.worldGraph;
    const campaign =
      initialState ??
      createCampaignState(party, graph, activeWorld.legacyInteriorGraph ?? undefined);

    worldMapSession = new WorldMapSession(graph, party, campaign);
    worldMapScreen.bind(worldMapSession, graph, {
      onEnterDistrict: enterDistrictFromWorld,
      onTravelArrived: handleWorldArrival,
      interiorGraph: activeWorld.legacyInteriorGraph,
      backgroundUrl: worldBackgroundUrl(),
    });
    combatLogPanel.hide();
    showActiveMapLayer();
    persistCampaign(worldMapSession.getState());
    refreshWorldOverlay();

    worldMapSession.subscribe((state) => {
      persistCampaign(state);
      refreshWorldOverlay();
    });

    worldEventUnsubscribe = worldMapSession.subscribeEvents(handleWorldNarration);

    if (import.meta.env.DEV) {
      const ew = window as unknown as {
        __emberwatch: {
          worldSession: WorldMapSession;
          generateDistrict: (seed?: number) => void;
          setPack: (packId: PackId) => void;
          activeWorld: ActiveWorldContent;
        };
      };
      ew.__emberwatch = {
        worldSession: worldMapSession,
        activeWorld,
        generateDistrict: (seed = Math.floor(Math.random() * 100000)) => {
          activeWorld = buildGeneratedWorld(seed);
          const fresh = createCampaignState(
            party,
            activeWorld.worldGraph,
            activeWorld.legacyInteriorGraph ?? undefined,
          );
          startWorldMap(party, fresh);
        },
        setPack: (packId: PackId) => {
          selectedPackId = packId;
          localStorage.setItem(PACK_STORAGE_KEY, packId);
          startWorldMap(party);
        },
      };
    }
  }

  function continueSavedCampaign(): void {
    const saved = loadSavedCampaign();
    if (!saved) return;
    startWorldMap(saved.party, saved);
  }

  function startCombat(config: InitialStateConfig): void {
    creationScreen.hide();
    worldMapScreen.hide();
    beginCombatSession(config);

    if (import.meta.env.DEV) {
      (window as unknown as { __emberwatch: { session: CombatSession | null } }).__emberwatch = {
        session: combatSession,
      };
    }
  }

  const creationScreen = new CreationScreen(document.body, {
    onEnterWorld: (party) => startWorldMap(party),
    onContinueSaved: continueSavedCampaign,
    hasSavedCampaign: () => loadSavedCampaign() !== null,
    packs: listPacks(),
    getSelectedPackId: () => selectedPackId,
    onPackChange: (packId) => {
      if (!PACK_REGISTRY[packId as PackId]) return;
      selectedPackId = packId as PackId;
      localStorage.setItem(PACK_STORAGE_KEY, packId);
    },
  });

  if (import.meta.env.DEV) {
    (window as unknown as { __emberwatch: { startCombat: typeof startCombat } }).__emberwatch = {
      startCombat,
    };
    console.info(
      "[EMBERWATCH] M9 — combat rules depth (saves, resistance/weakness, spell slots, path-aware Step); F3/~ overlay",
      { manifestSummary, selectedPackId },
    );
  }
}

init();
