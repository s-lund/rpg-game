import type { EntityBlueprint, InitialStateConfig } from "../types";

export const M2_MAP_WIDTH = 12;
export const M2_MAP_HEIGHT = 12;

export const M2_DEMO_ENEMIES: EntityBlueprint[] = [
  {
    id: "ent_goblin_01",
    label: "Goblin",
    x: 7,
    y: 5,
    maxHp: 12,
    ac: 16,
    attackBonus: 6,
    damage: { count: 1, sides: 6, modifier: 0 },
  },
  {
    id: "ent_goblin_02",
    label: "Goblin",
    x: 8,
    y: 6,
    maxHp: 12,
    ac: 16,
    attackBonus: 6,
    damage: { count: 1, sides: 6, modifier: 0 },
  },
];

export const M1_DEMO_CONFIG: InitialStateConfig = {
  width: M2_MAP_WIDTH,
  height: M2_MAP_HEIGHT,
  party: [
    {
      id: "ent_fighter_01",
      label: "Fighter",
      classId: "fighter",
      x: 2,
      y: 5,
      maxHp: 20,
      ac: 18,
      attackBonus: 10,
      damage: { count: 1, sides: 8, modifier: 4 },
    },
    {
      id: "ent_rogue_01",
      label: "Rogue",
      classId: "rogue",
      x: 3,
      y: 5,
      maxHp: 16,
      ac: 16,
      attackBonus: 9,
      damage: { count: 1, sides: 6, modifier: 2 },
    },
  ],
  enemies: M2_DEMO_ENEMIES,
};
