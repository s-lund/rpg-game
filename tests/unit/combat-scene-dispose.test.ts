import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { createInitialState, M1_DEMO_CONFIG, resolveBattleMap } from "../../src/core/index";
import { CombatScene } from "../../src/renderer/combat-scene";
import { EMBERWATCH_PACK } from "../../src/content/emberwatch/pack";

describe("combat scene dispose", () => {
  it("removes tile and entity meshes from the scene on destroy", () => {
    const scene = new THREE.Scene();
    const combatScene = new CombatScene({ width: 12, height: 12, tileSize: 1 });
    const gameState = createInitialState(M1_DEMO_CONFIG);

    combatScene.buildTiles(scene);
    combatScene.buildEntityMeshes(scene, gameState);

    const before = scene.children.length;
    expect(before).toBeGreaterThan(0);

    combatScene.destroy(scene);

    expect(scene.children.length).toBe(0);
  });

  it("removes battle-map walls and props on destroy too", () => {
    const scene = new THREE.Scene();
    const def = EMBERWATCH_PACK.battleMaps["bmap_ashen_road"]!;
    const tileset = EMBERWATCH_PACK.tilesets[def.tilesetId]!;
    const battleMap = resolveBattleMap(def, tileset);

    const combatScene = new CombatScene({
      width: battleMap.width,
      height: battleMap.height,
      tileSize: 1,
    });
    combatScene.buildTiles(scene, battleMap);

    expect(scene.children.length).toBe(battleMap.tiles.length);

    combatScene.destroy(scene);
    expect(scene.children.length).toBe(0);
  });
});
