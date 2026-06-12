import type { EntityId } from "../shared/ids";
import type { Entity, EntityBlueprint, GameState, InitialStateConfig, InitiativeRoll } from "./types";
import type { SpellId } from "./characters/subset";
import type { Rng } from "./rng";

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
    saves: blueprint.saves ? { ...blueprint.saves } : { fortitude: 0, reflex: 0, will: 0 },
    spellDc: blueprint.spellDc ?? 10,
    ...(blueprint.resistances ? { resistances: { ...blueprint.resistances } } : {}),
    ...(blueprint.weaknesses ? { weaknesses: { ...blueprint.weaknesses } } : {}),
    ...(blueprint.spellSlots
      ? { spellSlots: blueprint.spellSlots.map((slot) => ({ ...slot })) }
      : {}),
    conditions: [],
    activeConditions: [],
    reactionAvailable: !downed,
    ...(blueprint.onHitCondition ? { onHitCondition: { ...blueprint.onHitCondition } } : {}),
    actionPoints: downed ? 0 : DEFAULT_ACTION_POINTS,
    maxActionPoints: DEFAULT_ACTION_POINTS,
    downed,
  };
}

/**
 * Rolled initiative (rules/srd/initiative.md): Perception check per entity,
 * ranked highest first. Ties: enemy before party (RAW); same team keeps
 * blueprint order (party-slot order — the headless stand-in for "PCs choose").
 * Rolls are STORED ON THE INITIAL STATE rather than emitted as events because
 * replayEvents starts from the caller's initial state — the same seed rebuilds
 * the same order with no replay cases needed.
 */
function rollInitiative(
  rng: Rng,
  entities: Record<EntityId, Entity>,
  blueprintOrder: EntityId[],
  modifiers: Record<EntityId, number>,
): { turnOrder: EntityId[]; initiative: Record<EntityId, InitiativeRoll> } {
  const initiative: Record<EntityId, InitiativeRoll> = {};
  for (const id of blueprintOrder) {
    const d20 = rng.d20();
    const modifier = modifiers[id] ?? 0;
    initiative[id] = { d20, modifier, total: d20 + modifier };
  }

  const turnOrder = [...blueprintOrder].sort((a, b) => {
    const ra = initiative[a]!;
    const rb = initiative[b]!;
    if (rb.total !== ra.total) return rb.total - ra.total;
    const ta = entities[a]!.team;
    const tb = entities[b]!.team;
    if (ta !== tb) return ta === "enemy" ? -1 : 1;
    return blueprintOrder.indexOf(a) - blueprintOrder.indexOf(b);
  });

  return { turnOrder, initiative };
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
  const blueprintOrder: EntityId[] = [];
  const modifiers: Record<EntityId, number> = {};

  for (const blueprint of config.party) {
    entities[blueprint.id] = blueprintToEntity(blueprint, "party");
    blueprintOrder.push(blueprint.id);
    modifiers[blueprint.id] = blueprint.initiativeModifier ?? 0;
  }
  for (const blueprint of config.enemies) {
    entities[blueprint.id] = blueprintToEntity(blueprint, "enemy");
    blueprintOrder.push(blueprint.id);
    modifiers[blueprint.id] = blueprint.initiativeModifier ?? 0;
  }

  const rolled = config.rng
    ? rollInitiative(config.rng, entities, blueprintOrder, modifiers)
    : null;
  const turnOrder = rolled ? rolled.turnOrder : blueprintOrder;

  return {
    map: {
      width: config.width,
      height: config.height,
      ...(config.blockedTiles && config.blockedTiles.length > 0
        ? { blocked: config.blockedTiles.map((t) => ({ ...t })) }
        : {}),
      ...(config.coverTiles && config.coverTiles.length > 0
        ? { cover: config.coverTiles.map((t) => ({ ...t })) }
        : {}),
    },
    entities,
    combat: {
      phase: "active",
      round: 1,
      activeActorId: firstActiveInTurnOrder(entities, turnOrder),
      turnOrder,
      ...(rolled ? { initiative: rolled.initiative } : {}),
    },
    eventLog: [],
  };
}
