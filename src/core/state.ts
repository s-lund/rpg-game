import type { EntityId } from "../shared/ids";
import type { Entity, EntityBlueprint, GameState, InitialStateConfig } from "./types";

const DEFAULT_ACTION_POINTS = 3;

function blueprintToEntity(blueprint: EntityBlueprint, team: Entity["team"]): Entity {
  const isRogue = blueprint.classId === "rogue";
  return {
    id: blueprint.id,
    label: blueprint.label,
    classId: blueprint.classId,
    team,
    x: blueprint.x,
    y: blueprint.y,
    maxHp: blueprint.maxHp,
    hp: blueprint.currentHp ?? blueprint.maxHp,
    ac: blueprint.ac,
    attackBonus: blueprint.attackBonus ?? (isRogue ? 7 : 8),
    damage: blueprint.damage ?? (isRogue ? { count: 1, sides: 6, modifier: 2 } : { count: 1, sides: 8, modifier: 4 }),
    conditions: [],
    actionPoints: DEFAULT_ACTION_POINTS,
    maxActionPoints: DEFAULT_ACTION_POINTS,
    downed: false,
  };
}

export function createInitialState(config: InitialStateConfig): GameState {
  const entities: Record<EntityId, Entity> = {};
  const turnOrder: EntityId[] = [];

  for (const blueprint of config.party) {
    entities[blueprint.id] = blueprintToEntity(blueprint, "party");
    turnOrder.push(blueprint.id);
  }
  for (const blueprint of config.enemies) {
    entities[blueprint.id] = blueprintToEntity(blueprint, "enemy");
    turnOrder.push(blueprint.id);
  }

  return {
    map: { width: config.width, height: config.height },
    entities,
    combat: {
      phase: "active",
      round: 1,
      activeActorId: turnOrder[0] ?? null,
      turnOrder,
    },
    eventLog: [],
  };
}
