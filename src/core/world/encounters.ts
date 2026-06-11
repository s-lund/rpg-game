import type { EncounterId } from "../../shared/ids";
import type { EntityBlueprint } from "../types";
import { M2_MAP_HEIGHT, M2_MAP_WIDTH } from "../scenarios/m1-demo";

export interface EncounterTemplate {
  id: EncounterId;
  width: number;
  height: number;
  enemies: EntityBlueprint[];
}

export const M4_DEMO_ENCOUNTERS: Record<EncounterId, EncounterTemplate> = {
  enc_cinder_gate: {
    id: "enc_cinder_gate",
    width: M2_MAP_WIDTH,
    height: M2_MAP_HEIGHT,
    enemies: [
      {
        id: "ent_skirmisher_01",
        label: "Skirmisher",
        x: 8,
        y: 3,
        maxHp: 9,
        ac: 14,
        attackBonus: 5,
        strikeRange: 4,
        damageType: "piercing",
        damage: { count: 1, sides: 6, modifier: 0 },
      },
      {
        id: "ent_bruiser_01",
        label: "Bruiser",
        x: 7,
        y: 5,
        maxHp: 16,
        ac: 17,
        attackBonus: 6,
        strikeRange: 1,
        damageType: "slashing",
        damage: { count: 1, sides: 8, modifier: 1 },
      },
    ],
  },
  enc_drowned_market: {
    id: "enc_drowned_market",
    width: M2_MAP_WIDTH,
    height: M2_MAP_HEIGHT,
    enemies: [
      {
        id: "ent_patrol_01",
        label: "Market Patrol",
        x: 7,
        y: 4,
        maxHp: 12,
        ac: 16,
        attackBonus: 6,
        damage: { count: 1, sides: 6, modifier: 0 },
      },
      {
        id: "ent_patrol_02",
        label: "Market Patrol",
        x: 9,
        y: 6,
        maxHp: 12,
        ac: 16,
        attackBonus: 6,
        damage: { count: 1, sides: 6, modifier: 0 },
      },
    ],
  },
  enc_ash_foundry: {
    id: "enc_ash_foundry",
    width: M2_MAP_WIDTH,
    height: M2_MAP_HEIGHT,
    enemies: [
      {
        id: "ent_guard_01",
        label: "Foundry Guard",
        x: 6,
        y: 5,
        maxHp: 14,
        ac: 17,
        attackBonus: 7,
        damage: { count: 1, sides: 8, modifier: 1 },
      },
      {
        id: "ent_guard_02",
        label: "Foundry Guard",
        x: 8,
        y: 6,
        maxHp: 14,
        ac: 17,
        attackBonus: 7,
        damage: { count: 1, sides: 8, modifier: 1 },
      },
    ],
  },
  enc_bell_tower: {
    id: "enc_bell_tower",
    width: M2_MAP_WIDTH,
    height: M2_MAP_HEIGHT,
    enemies: [
      {
        id: "ent_elite_01",
        label: "Bell Tower Elite",
        x: 6,
        y: 4,
        maxHp: 16,
        ac: 18,
        attackBonus: 8,
        damage: { count: 1, sides: 8, modifier: 2 },
      },
      {
        id: "ent_elite_02",
        label: "Bell Tower Elite",
        x: 8,
        y: 5,
        maxHp: 16,
        ac: 18,
        attackBonus: 8,
        damage: { count: 1, sides: 8, modifier: 2 },
      },
      {
        id: "ent_elite_03",
        label: "Bell Tower Elite",
        x: 7,
        y: 7,
        maxHp: 16,
        ac: 18,
        attackBonus: 8,
        damage: { count: 1, sides: 8, modifier: 2 },
      },
    ],
  },
};
