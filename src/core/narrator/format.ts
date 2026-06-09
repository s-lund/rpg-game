import type { BeatId, SiteId } from "../../shared/ids";
import type { GameEvent } from "../types";
import { getBeatProse } from "./beats";
import { formatSiteAmbience } from "./sites";
import type { NarrationContext } from "./types";

function label(ctx: NarrationContext, id: string): string {
  return ctx.entityLabels[id] ?? id;
}

export function formatBeat(beatId: BeatId, ctx: NarrationContext): string {
  const prose = getBeatProse(beatId);
  if (prose) {
    return prose;
  }
  return `A story stirs at ${ctx.siteLabel ?? beatId}.`;
}

export function formatEventLine(event: GameEvent, ctx: NarrationContext): string | null {
  switch (event.type) {
    case "Moved": {
      const who = label(ctx, String(event.payload.entity_id));
      return `${who} shifts across the battlefield.`;
    }
    case "DamageDealt": {
      const target = label(ctx, String(event.payload.target_id));
      const amount = event.payload.amount as number;
      const dtype = event.payload.damage_type as string;
      return `${target} takes ${amount} ${dtype} damage.`;
    }
    case "TurnStarted": {
      const who = label(ctx, String(event.payload.entity_id));
      return `${who} takes the field.`;
    }
    case "EntityDowned": {
      const who = label(ctx, String(event.payload.entity_id));
      return `${who} falls.`;
    }
    case "CombatEnded": {
      const outcome = event.payload.outcome as string;
      return outcome === "victory"
        ? "The last foe yields. Silence returns to the ruins."
        : "Darkness closes in. The party is overwhelmed.";
    }
    case "ConditionApplied": {
      const target = label(ctx, String(event.payload.target_id));
      const condition = String(event.payload.condition).replace(/_/g, " ");
      return `${target} is ${condition}.`;
    }
    case "ActionPointsSpent": {
      const who = label(ctx, String(event.payload.entity_id));
      return `${who} commits to the next move.`;
    }
    case "Traveled": {
      const siteId = event.payload.to_site_id as SiteId;
      return formatSiteAmbience(siteId, ctx.siteLabel);
    }
    case "StoryBeatTriggered": {
      const beatId = event.payload.beat_id as BeatId;
      return formatBeat(beatId, ctx);
    }
    default:
      return null;
  }
}

export function formatEvents(events: GameEvent[], ctx: NarrationContext): string[] {
  const lines: string[] = [];
  for (const event of events) {
    const line = formatEventLine(event, ctx);
    if (line) {
      lines.push(line);
    }
  }
  return lines;
}
