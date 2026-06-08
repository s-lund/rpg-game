import type { EntityId } from "../../shared/ids";

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
      kind: "EndTurn";
      actionId: string;
      actorId: EntityId;
    };
