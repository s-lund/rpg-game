/** Stand family — get up from prone (M12 AI). Stand provokes in reach (reactive-strike.md). */
import type { EntityId } from "../../../shared/ids";
import { hasCondition } from "../../combat/conditions";
import type { ActionFamily } from "../context";
import { expectedReactionDamage, reactorsThreatening } from "../score";

const NO_CONSUMED: ReadonlySet<EntityId> = new Set();

export const standFamily: ActionFamily = {
  family: "stand",
  candidates(ctx) {
    const { actor, weights } = ctx;
    if (!hasCondition(actor, "prone") || actor.actionPoints < 1) return [];

    const provoking = reactorsThreatening(ctx, actor.x, actor.y, NO_CONSUMED);
    return [
      {
        family: "stand",
        score: weights.standUp - weights.aooRisk * expectedReactionDamage(ctx, provoking),
        endTile: { x: actor.x, y: actor.y },
        action: {
          kind: "Stand",
          actionId: `${ctx.actionIdBase}_stand`,
          actorId: actor.id,
        },
      },
    ];
  },
};
