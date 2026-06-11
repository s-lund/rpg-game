import type { EntityId } from "../shared/ids";
import type { Entity, EntityBlueprint, GameState, InitialStateConfig } from "./types";
import type { SpellId } from "./characters/subset";

const DEFAULT_ACTION_POINTS = 3;

function blueprintToEntity(blueprint: EntityBlueprint, team: Entity["team"]): Entity {
  const isRogue = blueprint.classId === "rogue";
  const hp = blueprint.currentHp ?? blueprint.maxHp;
  const downed = hp <= 0;
  return {
    id: blueprint.id,
    label: blueprint.label,
    classId: blueprint.classId,
    team,
    x: blueprint.x,
    y: blueprint.y,
    maxHp: blueprint.maxHp,
    hp: downed ? 0 : hp,
    ac: blueprint.ac,
    attackBonus: blueprint.attackBonus ?? (isRogue ? 7 : 8),
    spellAttackBonus: blueprint.spellAttackBonus ?? 0,
    damage: blueprint.damage ?? (isRogue ? { count: 1, sides: 6, modifier: 2 } : { count: 1, sides: 8, modifier: 4 }),
    damageType: blueprint.damageType ?? (isRogue ? "slashing" : "slashing"),
    strikeRange: blueprint.strikeRange ?? 1,
    knownSpells: (blueprint.knownSpells ?? []) as SpellId[],
    conditions: [],
    actionPoints: downed ? 0 : DEFAULT_ACTION_POINTS,
    maxActionPoints: DEFAULT_ACTION_POINTS,
    downed,
  };
}

function firstActiveInTurnOrder(entities: GameState["entities"], turnOrder: EntityId[]): EntityId | null {
  for (const id of turnOrder) {
    const entity = entities[id];
    if (entity && !entity.downed) return id;
  }
  return null;
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
      activeActorId: firstActiveInTurnOrder(entities, turnOrder),
      turnOrder,
    },
    eventLog: [],
  };
}
