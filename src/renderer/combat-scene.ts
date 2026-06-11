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

interface ProjectileVisual {
  mesh: THREE.Mesh;
  fromX: number;
  fromZ: number;
  toX: number;
  toZ: number;
  progress: number;
  duration: number;
  kind: "arrow" | "spell_bolt" | "heal_spark";
}

/** Read-only consumer: updates meshes from events only — no authoritative game state. */
export class CombatScene {
  readonly group = new THREE.Group();
  private readonly gridSize: number;
  private readonly tileSize: number;
  private readonly visuals = new Map<string, VisualEntity>();
  private readonly tileMeshes: THREE.Mesh[] = [];
  private readonly projectiles: ProjectileVisual[] = [];
  private selectedEntityId: string | null = null;
  private rangeHighlightActorId: string | null = null;
  private rangeHighlightTiles = 0;
  private combatPhase: GameState["combat"]["phase"] = "active";
  private readonly sceneRef: { current: THREE.Scene | null } = { current: null };

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
    this.sceneRef.current = scene;
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
        tile.userData = { tileX: x, tileY: z, kind: "tile", baseColor: isLight ? 0x3d4454 : 0x343a48 };
        tile.receiveShadow = true;
        this.tileMeshes.push(tile);
        scene.add(tile);
      }
    }
  }

  destroy(scene: THREE.Scene): void {
    for (const tile of this.tileMeshes) {
      scene.remove(tile);
      tile.geometry.dispose();
      (tile.material as THREE.Material).dispose();
    }
    this.tileMeshes.length = 0;

    for (const visual of this.visuals.values()) {
      scene.remove(visual.mesh);
      visual.mesh.geometry.dispose();
      (visual.mesh.material as THREE.Material).dispose();
    }
    this.visuals.clear();

    for (const projectile of this.projectiles) {
      scene.remove(projectile.mesh);
      projectile.mesh.geometry.dispose();
      (projectile.mesh.material as THREE.Material).dispose();
    }
    this.projectiles.length = 0;

    this.selectedEntityId = null;
    this.rangeHighlightActorId = null;
    this.sceneRef.current = null;
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

      const visual: VisualEntity = {
        mesh,
        label: entity.label,
        team: entity.team,
        tileX: entity.x,
        tileY: entity.y,
        downed: entity.downed,
      };
      this.visuals.set(entity.id, visual);
      if (entity.downed) {
        this.applyDownedVisual(visual);
      }
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

    // Prefer entity hits over floor tiles (tiles often win when heroes stand adjacent).
    for (const entry of hits) {
      const obj = entry.object;
      if (obj.userData.kind === "entity") {
        return { kind: "entity", entityId: obj.userData.entityId as string };
      }
    }

    const hit = hits[0]!.object;
    if (hit.userData.kind === "tile") {
      return { kind: "tile", x: hit.userData.tileX as number, y: hit.userData.tileY as number };
    }
    return null;
  }

  setSelectedEntity(entityId: string | null): void {
    this.selectedEntityId = entityId;
    this.refreshHighlights();
  }

  setRangeHighlight(actorId: string | null, rangeTiles: number): void {
    this.rangeHighlightActorId = actorId;
    this.rangeHighlightTiles = rangeTiles;
    this.refreshTileRangeHighlight();
  }

  getSelectedEntity(): string | null {
    return this.selectedEntityId;
  }

  isCombatActive(): boolean {
    return this.combatPhase === "active";
  }

  tick(deltaMs: number): void {
    const scene = this.sceneRef.current;
    if (!scene) return;

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]!;
      p.progress += deltaMs / p.duration;
      const t = Math.min(1, p.progress);
      const y = p.kind === "arrow" ? 0.5 + Math.sin(t * Math.PI) * 0.4 : 0.55;
      p.mesh.position.set(
        p.fromX + (p.toX - p.fromX) * t,
        y,
        p.fromZ + (p.toZ - p.fromZ) * t,
      );
      if (t >= 1) {
        scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.projectiles.splice(i, 1);
      }
    }
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
      case "DamageDealt": {
        const resolution = event.payload.attack_resolution as { hit?: boolean } | undefined;
        if (resolution?.hit) {
          const damageType = event.payload.damage_type as string;
          const kind = damageType === "cold" ? "spell_bolt" : "arrow";
          this.spawnProjectile(event.actorId, String(event.payload.target_id), kind);
        }
        break;
      }
      case "Healed": {
        const healedId = event.payload.target_id as string;
        const healedVisual = this.visuals.get(healedId);
        if (healedVisual?.downed && (event.payload.hp_after as number) > 0) {
          healedVisual.downed = false;
          this.applyStandingVisual(healedVisual);
        }
        this.spawnProjectile(event.actorId, healedId, "heal_spark");
        break;
      }
      case "EntityDowned": {
        const id = event.payload.entity_id as string;
        const visual = this.visuals.get(id);
        if (!visual) return;
        visual.downed = true;
        this.applyDownedVisual(visual);
        break;
      }
      case "CombatEnded":
        this.combatPhase = event.payload.outcome === "victory" ? "victory" : "defeat";
        break;
      default:
        break;
    }
    this.refreshHighlights();
    this.refreshTileRangeHighlight();
  }

  private spawnProjectile(fromId: string, toId: string, kind: ProjectileVisual["kind"]): void {
    const scene = this.sceneRef.current;
    const from = this.visuals.get(fromId);
    const to = this.visuals.get(toId);
    if (!scene || !from || !to) return;

    const color = kind === "heal_spark" ? 0x6fcf97 : kind === "spell_bolt" ? 0x7ec8ff : 0xc8a86a;
    const geometry =
      kind === "arrow"
        ? new THREE.CylinderGeometry(0.03, 0.03, 0.35, 6)
        : new THREE.SphereGeometry(0.12, 8, 8);
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.35 }),
    );
    if (kind === "arrow") {
      mesh.rotation.z = Math.PI / 2;
    }
    scene.add(mesh);

    this.projectiles.push({
      mesh,
      fromX: from.mesh.position.x,
      fromZ: from.mesh.position.z,
      toX: to.mesh.position.x,
      toZ: to.mesh.position.z,
      progress: 0,
      duration: 250,
      kind,
    });
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

  private applyDownedVisual(visual: VisualEntity): void {
    visual.mesh.scale.y = 0.2;
    visual.mesh.position.y = 0.1;
    (visual.mesh.material as THREE.MeshStandardMaterial).color.setHex(0x444444);
  }

  private applyStandingVisual(visual: VisualEntity): void {
    visual.mesh.scale.y = 1;
    this.positionMesh(visual.mesh, visual.tileX, visual.tileY);
    const color = visual.team === "party" ? 0x4a7fc1 : 0x6b8f3c;
    (visual.mesh.material as THREE.MeshStandardMaterial).color.setHex(color);
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

  private refreshTileRangeHighlight(): void {
    const actor = this.rangeHighlightActorId
      ? this.visuals.get(this.rangeHighlightActorId)
      : null;
    const half = (this.gridSize * this.tileSize) / 2;

    for (const tile of this.tileMeshes) {
      const mat = tile.material as THREE.MeshStandardMaterial;
      const base = tile.userData.baseColor as number;
      if (!actor || this.rangeHighlightTiles < 1) {
        mat.color.setHex(base);
        continue;
      }
      const tx = tile.userData.tileX as number;
      const ty = tile.userData.tileY as number;
      const dist = Math.abs(tx - actor.tileX) + Math.abs(ty - actor.tileY);
      const inRange =
        this.rangeHighlightTiles <= 1
          ? dist === 1
          : dist >= 1 && dist <= this.rangeHighlightTiles;
      mat.color.setHex(inRange ? 0x4a5a6a : base);
    }

    void half;
  }
}
