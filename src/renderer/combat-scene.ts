import * as THREE from "three";
import type { GameEvent, GameState } from "../core/index";

export interface CombatSceneConfig {
  gridSize: number;
  tileSize: number;
}

interface VisualEntity {
  mesh: THREE.Mesh;
  label: string;
  team: "party" | "enemy";
  tileX: number;
  tileY: number;
  downed: boolean;
}

/** Read-only consumer: updates meshes from events only — no authoritative game state. */
export class CombatScene {
  readonly group = new THREE.Group();
  private readonly gridSize: number;
  private readonly tileSize: number;
  private readonly visuals = new Map<string, VisualEntity>();
  private readonly tileMeshes: THREE.Mesh[] = [];
  private selectedEntityId: string | null = null;
  private combatPhase: GameState["combat"]["phase"] = "active";

  constructor(config: CombatSceneConfig) {
    this.gridSize = config.gridSize;
    this.tileSize = config.tileSize;
  }

  onEvent(events: GameEvent[]): void {
    for (const event of events) {
      this.applyEvent(event);
    }
  }

  bootstrapFromState(state: GameState): void {
    this.combatPhase = state.combat.phase;
    for (const entity of Object.values(state.entities)) {
      this.ensureVisual(entity.id, entity.label, entity.team, entity.x, entity.y, entity.downed);
    }
    this.refreshHighlights();
  }

  buildTiles(scene: THREE.Scene): void {
    const half = (this.gridSize * this.tileSize) / 2;

    for (let x = 0; x < this.gridSize; x++) {
      for (let z = 0; z < this.gridSize; z++) {
        const isLight = (x + z) % 2 === 0;
        const tile = new THREE.Mesh(
          new THREE.PlaneGeometry(this.tileSize * 0.98, this.tileSize * 0.98),
          new THREE.MeshStandardMaterial({
            color: isLight ? 0x3d4454 : 0x343a48,
            roughness: 0.85,
          }),
        );
        tile.rotation.x = -Math.PI / 2;
        tile.position.set(
          x * this.tileSize - half + this.tileSize / 2,
          0.01,
          z * this.tileSize - half + this.tileSize / 2,
        );
        tile.userData = { tileX: x, tileY: z, kind: "tile" };
        tile.receiveShadow = true;
        this.tileMeshes.push(tile);
        scene.add(tile);
      }
    }
  }

  buildEntityMeshes(scene: THREE.Scene, state: GameState): void {
    for (const entity of Object.values(state.entities)) {
      const color = entity.team === "party" ? 0x4a7fc1 : 0x6b8f3c;
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.7, 0.55),
        new THREE.MeshStandardMaterial({ color, roughness: 0.6 }),
      );
      this.positionMesh(mesh, entity.x, entity.y);
      mesh.castShadow = true;
      mesh.userData = { entityId: entity.id, kind: "entity" };
      scene.add(mesh);

      this.visuals.set(entity.id, {
        mesh,
        label: entity.label,
        team: entity.team,
        tileX: entity.x,
        tileY: entity.y,
        downed: entity.downed,
      });
    }
    this.group.add(new THREE.Group());
  }

  pick(
    camera: THREE.Camera,
    pointer: THREE.Vector2,
  ): { kind: "tile"; x: number; y: number } | { kind: "entity"; entityId: string } | null {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, camera);
    const targets = [...this.tileMeshes, ...[...this.visuals.values()].map((v) => v.mesh)];
    const hits = raycaster.intersectObjects(targets, false);
    if (hits.length === 0) return null;

    const hit = hits[0]!.object;
    if (hit.userData.kind === "tile") {
      return { kind: "tile", x: hit.userData.tileX as number, y: hit.userData.tileY as number };
    }
    if (hit.userData.kind === "entity") {
      return { kind: "entity", entityId: hit.userData.entityId as string };
    }
    return null;
  }

  setSelectedEntity(entityId: string | null): void {
    this.selectedEntityId = entityId;
    this.refreshHighlights();
  }

  getSelectedEntity(): string | null {
    return this.selectedEntityId;
  }

  isCombatActive(): boolean {
    return this.combatPhase === "active";
  }

  listVisualSummaries(): { id: string; label: string; team: string; x: number; y: number }[] {
    return [...this.visuals.entries()].map(([id, v]) => ({
      id,
      label: v.label,
      team: v.team,
      x: v.tileX,
      y: v.tileY,
    }));
  }

  private applyEvent(event: GameEvent): void {
    switch (event.type) {
      case "Moved": {
        const id = event.payload.entity_id as string;
        const visual = this.visuals.get(id);
        if (!visual) return;
        visual.tileX = event.payload.to_x as number;
        visual.tileY = event.payload.to_y as number;
        this.positionMesh(visual.mesh, visual.tileX, visual.tileY);
        break;
      }
      case "EntityDowned": {
        const id = event.payload.entity_id as string;
        const visual = this.visuals.get(id);
        if (!visual) return;
        visual.downed = true;
        visual.mesh.scale.y = 0.2;
        visual.mesh.position.y = 0.1;
        (visual.mesh.material as THREE.MeshStandardMaterial).color.setHex(0x444444);
        break;
      }
      case "CombatEnded":
        this.combatPhase = event.payload.outcome === "victory" ? "victory" : "defeat";
        break;
      default:
        break;
    }
    this.refreshHighlights();
  }

  private ensureVisual(
    id: string,
    label: string,
    team: "party" | "enemy",
    x: number,
    y: number,
    downed: boolean,
  ): void {
    if (this.visuals.has(id)) return;
    this.visuals.set(id, {
      mesh: new THREE.Mesh(),
      label,
      team,
      tileX: x,
      tileY: y,
      downed,
    });
  }

  private positionMesh(mesh: THREE.Mesh, tileX: number, tileY: number): void {
    const half = (this.gridSize * this.tileSize) / 2;
    mesh.position.set(
      tileX * this.tileSize - half + this.tileSize / 2,
      0.35,
      tileY * this.tileSize - half + this.tileSize / 2,
    );
  }

  private refreshHighlights(): void {
    for (const [id, visual] of this.visuals) {
      const mat = visual.mesh.material as THREE.MeshStandardMaterial;
      if (visual.downed) {
        mat.emissive.setHex(0x000000);
        continue;
      }
      if (id === this.selectedEntityId) {
        mat.emissive.setHex(0x334466);
      } else {
        mat.emissive.setHex(0x000000);
      }
    }
  }
}
