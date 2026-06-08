import * as THREE from "three";
import { DevOverlay } from "./dev-overlay";
import { loadManifest, summarizeManifest } from "./assets/load-manifest";
import { ScenePresence } from "./scene-presence";

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

function createGroundPlane(): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(
    GRID_SIZE * TILE_SIZE,
    GRID_SIZE * TILE_SIZE,
    GRID_SIZE,
    GRID_SIZE,
  );
  geometry.rotateX(-Math.PI / 2);

  const material = new THREE.MeshStandardMaterial({
    color: 0x2a2e38,
    roughness: 0.9,
    metalness: 0.05,
    wireframe: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  return mesh;
}

function createTileGrid(): THREE.Group {
  const group = new THREE.Group();
  const half = (GRID_SIZE * TILE_SIZE) / 2;

  for (let x = 0; x < GRID_SIZE; x++) {
    for (let z = 0; z < GRID_SIZE; z++) {
      const isLight = (x + z) % 2 === 0;
      const tile = new THREE.Mesh(
        new THREE.PlaneGeometry(TILE_SIZE * 0.98, TILE_SIZE * 0.98),
        new THREE.MeshStandardMaterial({
          color: isLight ? 0x3d4454 : 0x343a48,
          roughness: 0.85,
        }),
      );
      tile.rotation.x = -Math.PI / 2;
      tile.position.set(
        x * TILE_SIZE - half + TILE_SIZE / 2,
        0.01,
        z * TILE_SIZE - half + TILE_SIZE / 2,
      );
      tile.receiveShadow = true;
      group.add(tile);
    }
  }

  return group;
}

function init(): void {
  const container = document.getElementById("app");
  if (!container) {
    throw new Error("Missing #app container");
  }

  const manifest = loadManifest();
  const manifestSummary = summarizeManifest(manifest);
  const presence = new ScenePresence();

  presence.registerProcedural(
    "tile_grid",
    "checkerboard on screen; tile_floor manifest entry not loaded yet",
  );
  presence.registerManifestOnly(
    "fighter_token",
    "in manifest only — no mesh on scene until M1",
  );
  presence.registerManifestOnly(
    "tile_floor",
    "manifest entry exists; scene uses procedural tile_grid instead",
  );

  const devOverlay = new DevOverlay(import.meta.env.DEV);
  devOverlay.setState({
    summary: manifestSummary,
    presence,
    acceptance: [
      {
        id: "iso_canvas",
        label: "Isometric grid visible",
        proof: "visual",
        how: "dark checkerboard on black background",
      },
      {
        id: "overlay_toggle",
        label: "Dev overlay toggles",
        proof: "visual",
        how: "press F3 or ~ — this panel appears/disappears",
      },
      {
        id: "fighter_token",
        label: "fighter_token registered",
        proof: "overlay",
        how: "listed as MANIFEST ONLY above — not expected on screen in M0",
      },
      {
        id: "tests",
        label: "Automated checks",
        proof: "test",
        how: "npm run test — 6 tests pass",
      },
    ],
  });

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0f);
  scene.fog = new THREE.Fog(0x0a0a0f, 40, 80);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  let camera = createIsometricCamera(container.clientWidth, container.clientHeight);

  const ambient = new THREE.AmbientLight(0x606878, 0.6);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff0d8, 1.1);
  sun.position.set(8, 16, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);

  scene.add(createGroundPlane());
  scene.add(createTileGrid());

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
    renderer.render(scene, camera);
  }

  animate();

  if (import.meta.env.DEV) {
    console.info(
      "[EMBERWATCH] M0 scaffold — press F3 or ~ to toggle dev overlay",
      { manifestSummary },
    );
  }
}

init();
