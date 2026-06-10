import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { createInitialState, M1_DEMO_CONFIG } from "../../src/core/index";
import { CombatScene } from "../../src/renderer/combat-scene";

describe("combat scene dispose", () => {
  it("removes tile and entity meshes from the scene on destroy", () => {
    const scene = new THREE.Scene();
    const combatScene = new CombatScene({ gridSize: 12, tileSize: 1 });
    const gameState = createInitialState(M1_DEMO_CONFIG);

    combatScene.buildTiles(scene);
    combatScene.buildEntityMeshes(scene, gameState);

    const before = scene.children.length;
    expect(before).toBeGreaterThan(0);

    combatScene.destroy(scene);

    expect(scene.children.length).toBe(0);
  });
});
