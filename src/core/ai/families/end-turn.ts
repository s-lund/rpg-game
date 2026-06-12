/** End-turn family — the always-legal zero-score floor every other candidate must beat. */
import type { ActionFamily } from "../context";

export const endTurnFamily: ActionFamily = {
  family: "end-turn",
  candidates(ctx) {
    return [
      {
        family: "end-turn",
        score: 0,
        endTile: { x: ctx.actor.x, y: ctx.actor.y },
        action: {
          kind: "EndTurn",
          actionId: `${ctx.actionIdBase}_end`,
          actorId: ctx.actor.id,
        },
      },
    ];
  },
};
