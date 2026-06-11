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
      kind: "EndTurn";
      actionId: string;
      actorId: EntityId;
    };
