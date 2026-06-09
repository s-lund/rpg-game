import { describe, expect, it } from "vitest";
import { formatBeat, formatEventLine, formatEvents } from "../../src/core/narrator/format";
import type { GameEvent } from "../../src/core/types";

const ctx = {
  entityLabels: {
    ent_fighter_01: "Bran",
    ent_goblin_01: "Scout",
  },
  siteLabel: "Drowned Market",
};

describe("narrator format", () => {
  it("formats combat damage with entity name", () => {
    const event: GameEvent = {
      seq: 1,
      turn: 1,
      actorId: "ent_fighter_01",
      type: "DamageDealt",
      payload: {
        target_id: "ent_goblin_01",
        amount: 7,
        damage_type: "slashing",
        hp_after: 5,
        from_effect: "eff_1",
      },
      derivedFrom: "act_1",
    };
    expect(formatEventLine(event, ctx)).toBe("Scout takes 7 slashing damage.");
  });

  it("formats travel as site ambience", () => {
    const event: GameEvent = {
      seq: 2,
      turn: 0,
      actorId: "ent_fighter_01",
      type: "Traveled",
      payload: {
        from_site_id: "site_cinder_gate",
        to_site_id: "site_drowned_market",
        from_effect: "eff_travel",
      },
      derivedFrom: "act_travel",
    };
    expect(formatEventLine(event, ctx)).toContain("stall-fronts");
  });

  it("formats story beat from catalog", () => {
    const prose = formatBeat("beat_drowned_market_echoes", ctx);
    expect(prose).toContain("drowned stalls");
  });

  it("formatEvents filters null lines", () => {
    const events: GameEvent[] = [
      {
        seq: 1,
        turn: 1,
        actorId: "ent_fighter_01",
        type: "UnknownType",
        payload: { from_effect: "eff_x" },
        derivedFrom: "act_x",
      },
      {
        seq: 2,
        turn: 1,
        actorId: "ent_fighter_01",
        type: "TurnStarted",
        payload: { entity_id: "ent_fighter_01", from_effect: "eff_y" },
        derivedFrom: "act_y",
      },
    ];
    const lines = formatEvents(events, ctx);
    expect(lines).toEqual(["Bran takes the field."]);
  });
});
