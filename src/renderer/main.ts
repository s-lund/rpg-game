import * as THREE from "three";
import {
  deserializeCampaign,
  isAdjacent,
  M3_DEMO_GRAPH,
  serializeCampaign,
  type CampaignState,
  type InitialStateConfig,
  type PartyDraft,
} from "../core/index";
import type { EntityId } from "../shared/ids";
import { DevOverlay } from "./dev-overlay";
import { loadManifest, summarizeManifest } from "./assets/load-manifest";
import { ScenePresence } from "./scene-presence";
import { CombatSession } from "./combat-session";
import { CombatScene } from "./combat-scene";
import { CombatHud } from "./combat-hud";
import { CreationScreen } from "./creation-screen";
import { WorldMapSession } from "./world-map-session";
import { WorldMapScreen } from "./world-map-screen";

const CAMPAIGN_STORAGE_KEY = "emberwatch.campaign";

const ISO_YAW = Math.PI / 4;
const ISO_PITCH = Math.atan(1 / Math.sqrt(2));
const GRID_SIZE = 12;
const TILE_SIZE = 1;

function createIsometricCamera(width: number, height: number): THREE.OrthographicCamera {
  const aspect = width / height;
  const frustum = GRID_SIZE * TILE_SIZE * 1.2;
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
      label: "Created party on combat grid (M4)",
      proof: "visual" as const,
      how: "deferred — world↔combat transition is M4",
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
  ];
}

function init(): void {
  const container = document.getElementById("app");
  if (!container) {
    throw new Error("Missing #app container");
  }

  const manifest = loadManifest();
  const manifestSummary = summarizeManifest(manifest);
  const presence = new ScenePresence();

  presence.registerProcedural("tile_grid", "checkerboard tiles — tile_floor GLB deferred to M8");
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
  presence.registerProcedural(
    "world_map_graph",
    "M3 demo site graph with mapX/mapY layout — procedural, not generated districts",
  );
  presence.registerProcedural(
    "world_map_ui",
    "BG-style DOM overworld — gradient parchment, SVG paths, animated party token (M8 art deferred)",
  );
  presence.registerProcedural(
    "world_map_token",
    "gold party token (⚔) — procedural marker, not a final asset",
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

  let camera = createIsometricCamera(container.clientWidth, container.clientHeight);

  const ambient = new THREE.AmbientLight(0x606878, 0.6);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff0d8, 1.1);
  sun.position.set(8, 16, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);

  let combatSession: CombatSession | null = null;
  let combatScene: CombatScene | null = null;
  let combatHud: CombatHud | null = null;
  let combatActive = false;
  let worldMapSession: WorldMapSession | null = null;
  const worldMapScreen = new WorldMapScreen(document.body);

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

  function handlePointerClick(event: MouseEvent): void {
    if (!combatActive || !combatSession || !combatScene) return;

    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const pick = combatScene.pick(camera, pointer);
    if (!pick) return;

    const state = combatSession.getState();
    const activeId = state.combat.activeActorId;

    if (pick.kind === "entity") {
      const entity = state.entities[pick.entityId as EntityId];
      if (!entity || entity.downed) return;

      if (entity.team === "party") {
        combatScene.setSelectedEntity(pick.entityId);
        return;
      }

      const selectedId = combatScene.getSelectedEntity();
      if (!selectedId || selectedId !== activeId) return;

      const actor = state.entities[selectedId as EntityId];
      if (!actor || actor.team !== "party") return;
      if (!isAdjacent(actor.x, actor.y, entity.x, entity.y)) return;

      const acted = combatSession.dispatch({
        kind: "Strike",
        actionId: `act_strike_${Date.now()}`,
        actorId: selectedId as typeof activeId & string,
        targetId: pick.entityId as typeof activeId & string,
      });
      if (acted) refreshHudAndOverlay();
      return;
    }

    const selectedId = combatScene.getSelectedEntity();
    if (!selectedId || selectedId !== activeId) return;

    const acted = combatSession.dispatch({
      kind: "Step",
      actionId: `act_step_${Date.now()}`,
      actorId: selectedId as typeof activeId & string,
      x: pick.x,
      y: pick.y,
    });
    if (acted) refreshHudAndOverlay();
  }

  renderer.domElement.addEventListener("click", handlePointerClick);

  window.addEventListener("keydown", (event) => {
    if (event.key === "e" || event.key === "E") {
      endTurn();
    }
  });

  function resize(): void {
    const width = container!.clientWidth;
    const height = container!.clientHeight;
    camera = createIsometricCamera(width, height);
    renderer.setSize(width, height);
  }

  window.addEventListener("resize", resize);
  resize();

  function animate(): void {
    requestAnimationFrame(animate);
    if (combatActive) {
      renderer.render(scene, camera);
    }
  }

  animate();

  function startWorldMap(party: PartyDraft, initialState?: CampaignState): void {
    creationScreen.hide();
    renderer.domElement.style.display = "none";
    combatActive = false;

    worldMapSession = new WorldMapSession(M3_DEMO_GRAPH, party, initialState);
    worldMapScreen.bind(worldMapSession, M3_DEMO_GRAPH);
    worldMapScreen.show();
    persistCampaign(worldMapSession.getState());
    refreshWorldOverlay();

    worldMapSession.subscribe((state) => {
      persistCampaign(state);
      refreshWorldOverlay();
    });

    if (import.meta.env.DEV) {
      (window as unknown as { __emberwatch: { worldSession: WorldMapSession } }).__emberwatch = {
        worldSession: worldMapSession,
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
    renderer.domElement.style.display = "block";

    combatSession = new CombatSession(config);
    combatScene = new CombatScene({ gridSize: GRID_SIZE, tileSize: TILE_SIZE });
    combatHud = new CombatHud(document.body);
    combatHud.setOnEndTurn(endTurn);

    combatScene.buildTiles(scene);
    combatScene.buildEntityMeshes(scene, combatSession.getState());
    combatScene.bootstrapFromState(combatSession.getState());
    combatHud.update(combatSession.getState());
    combatActive = true;
    resize();

    combatSession.subscribe((events) => {
      combatScene!.onEvent(events);
      refreshHudAndOverlay();

      const turnStarted = events.find((e) => e.type === "TurnStarted");
      if (turnStarted) {
        const actorId = turnStarted.payload.entity_id as EntityId;
        const actor = combatSession!.getState().entities[actorId];
        if (actor?.team === "party") {
          combatScene!.setSelectedEntity(actorId);
        } else if (actor?.team === "enemy") {
          window.setTimeout(() => endTurn(), 500);
        }
      }
    });

    const active = combatSession.getState().combat.activeActorId;
    if (active) {
      const actor = combatSession.getState().entities[active];
      if (actor?.team === "party") {
        combatScene.setSelectedEntity(active);
      }
    }

    if (import.meta.env.DEV) {
      (window as unknown as { __emberwatch: { session: CombatSession } }).__emberwatch = {
        session: combatSession,
      };
    }
  }

  const creationScreen = new CreationScreen(document.body, {
    onEnterWorld: (party) => startWorldMap(party),
    onContinueSaved: continueSavedCampaign,
    hasSavedCampaign: () => loadSavedCampaign() !== null,
  });

  if (import.meta.env.DEV) {
    (window as unknown as { __emberwatch: { startCombat: typeof startCombat } }).__emberwatch = {
      startCombat,
    };
    console.info(
      "[EMBERWATCH] M3 — create party, Enter World, travel between sites; F3/~ overlay",
      { manifestSummary },
    );
  }
}

init();
