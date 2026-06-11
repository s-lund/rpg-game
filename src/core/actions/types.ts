import type { EntityId } from "../../shared/ids";
import type { SpellId } from "../characters/subset";

export type Action =
  | {
      kind: "Step";
      actionId: string;
      actorId: EntityId;
      x: number;
      y: number;
    }
  | {
      kind: "Strike";
      actionId: string;
      actorId: EntityId;
      targetId: EntityId;
    }
  | {
      kind: "CastSpell";
      actionId: string;
      actorId: EntityId;
      spellId: SpellId;
      targetId: EntityId;
    }
  | {
      kind: "CastHeal";
      actionId: string;
      actorId: EntityId;
      spellId: SpellId;
      targetId: EntityId;
    }
  | {
      kind: "CastConeSpell";
      actionId: string;
      actorId: EntityId;
      spellId: SpellId;
      /** Aim tile — the cone direction snaps toward it and must cover it. */
      targetX: number;
      targetY: number;
    }
  | {
      kind: "EndTurn";
      actionId: string;
      actorId: EntityId;
    };
