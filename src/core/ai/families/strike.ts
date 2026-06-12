/** Strike family — weapon attacks from the current tile (M12 AI). */
import type { ActionFamily } from "../context";
import { attackOptionsFrom } from "../score";

const NO_CONSUMED: ReadonlySet<never> = new Set();

export const strikeFamily: ActionFamily = {
  family: "strike",
  candidates(ctx) {
    const { actor } = ctx;
    return attackOptionsFrom(ctx, actor.x, actor.y, actor.actionPoints, NO_CONSUMED)
      .filter((option) => option.kind === "strike")
      .map((option) => ({
        family: "strike",
        score: option.score,
        endTile: { x: actor.x, y: actor.y },
        action: {
          kind: "Strike",
          actionId: `${ctx.actionIdBase}_strike_${option.targetId}`,
          actorId: actor.id,
          targetId: option.targetId,
        },
      }));
  },
};
