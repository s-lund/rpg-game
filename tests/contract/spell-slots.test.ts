/**
 * M9 contract — prepared spell slots (rules/srd/spell-slots.md, cleric-divine-font.md).
 * Opt-in enforcement; Heal consumes slots (font first); recovery at safe havens;
 * slot state survives party serialize and world↔combat transitions.
 */
import { describe, expect, it } from "vitest";
import {
  applyCombatResultToCampaign,
  createCampaignState,
  createDefaultParty,
  createInitialState,
  createSeededRng,
  defaultPreparedSlots,
  deserializeParty,
  dispatch,
  derivePartyBlueprints,
  prepareSpellSlotsAtHaven,
  serializeParty,
  travelTo,
  type InitialStateConfig,
  type SpellSlot,
  type WorldGraph,
} from "../../src/core/index";
import type { EntityId, SiteId } from "../../src/shared/ids";

function clericSlots(): SpellSlot[] {
  return [
    { id: "cleric_slot_1", rank: 1, preparedSpellId: "heal_ranged", expended: false },
    { id: "cleric_slot_2", rank: 1, preparedSpellId: "heal_ranged", expended: false },
    { id: "cleric_font_1", rank: 1, preparedSpellId: "heal_ranged", expended: false, fontOnly: true },
    { id: "cleric_font_2", rank: 1, preparedSpellId: "heal_ranged", expended: false, fontOnly: true },
  ];
}

function healConfig(slots: SpellSlot[] | undefined): InitialStateConfig {
  return {
    width: 12,
    height: 12,
    party: [
      {
        id: "ent_cleric_01" as EntityId,
        label: "Cleric",
        classId: "cleric",
        x: 2,
        y: 5,
        maxHp: 18,
        ac: 15,
        knownSpells: ["heal_ranged"],
        spellSlots: slots,
        strikeRange: 0,
      },
      {
        id: "ent_ally_01" as EntityId,
        label: "Ally",
        classId: "rogue",
        x: 5,
        y: 5,
        maxHp: 16,
        ac: 16,
        currentHp: 5,
        strikeRange: 1,
        attackBonus: 7,
        damage: { count: 1, sides: 6, modifier: 2 },
      },
    ],
    enemies: [],
  };
}

function castHeal(session: { state: ReturnType<typeof createInitialState>; nextSeq: number }, n: number) {
  return dispatch(
    session,
    {
      kind: "CastHeal",
      actionId: `act_heal_${n}`,
      actorId: "ent_cleric_01",
      spellId: "heal_ranged",
      targetId: "ent_ally_01",
    },
    createSeededRng(7),
  );
}

describe("Heal slot enforcement (opt-in)", () => {
  it("spends a divine font slot first and emits SpellSlotSpent", () => {
    let session = { state: createInitialState(healConfig(clericSlots())), nextSeq: 1 };
    session = castHeal(session, 1);

    const cleric = session.state.entities["ent_cleric_01"]!;
    const spent = cleric.spellSlots!.filter((s) => s.expended);
    expect(spent).toHaveLength(1);
    expect(spent[0]!.fontOnly).toBe(true);

    const slotEvent = session.state.eventLog.find((e) => e.type === "SpellSlotSpent")!;
    expect(slotEvent.payload.spell_id).toBe("heal_ranged");
    expect(slotEvent.payload.remaining).toBe(3);
    expect(session.state.eventLog.some((e) => e.type === "Healed")).toBe(true);
  });

  it("rejects Heal when every Heal slot is expended", () => {
    const slots = clericSlots().map((s) => ({ ...s, expended: true }));
    let session = { state: createInitialState(healConfig(slots)), nextSeq: 1 };
    session = castHeal(session, 2);

    expect(session.state.eventLog).toHaveLength(0);
    expect(session.state.entities["ent_ally_01"]!.hp).toBe(5);
  });

  it("entities without a slot pool keep casting unrestricted (frozen M7 behavior)", () => {
    let session = { state: createInitialState(healConfig(undefined)), nextSeq: 1 };
    session = castHeal(session, 3);

    expect(session.state.eventLog.some((e) => e.type === "Healed")).toBe(true);
    expect(session.state.eventLog.some((e) => e.type === "SpellSlotSpent")).toBe(false);
  });
});

describe("default party preparation", () => {
  it("wizard starts with 2 rank-1 Breathe Fire slots, cleric with 2 Heal + 4 font Heals", () => {
    const wizard = defaultPreparedSlots("wizard")!;
    expect(wizard).toHaveLength(2);
    expect(wizard.every((s) => s.preparedSpellId === "breathe_fire" && !s.expended)).toBe(true);

    const cleric = defaultPreparedSlots("cleric")!;
    expect(cleric).toHaveLength(6);
    expect(cleric.filter((s) => s.fontOnly)).toHaveLength(4);
    expect(cleric.every((s) => s.preparedSpellId === "heal_ranged" && s.rank === 1)).toBe(true);

    expect(defaultPreparedSlots("fighter")).toBeUndefined();
  });

  it("derived blueprints carry the prepared slots into combat", () => {
    const blueprints = derivePartyBlueprints(createDefaultParty());
    const wizard = blueprints.find((b) => b.classId === "wizard")!;
    const cleric = blueprints.find((b) => b.classId === "cleric")!;
    expect(wizard.spellSlots).toHaveLength(2);
    expect(wizard.knownSpells).toContain("breathe_fire");
    expect(wizard.spellDc).toBeGreaterThan(10);
    expect(cleric.spellSlots).toHaveLength(6);
    const fighter = blueprints.find((b) => b.classId === "fighter")!;
    expect(fighter.saves!.fortitude).toBeGreaterThan(0);
  });
});

describe("slot persistence", () => {
  it("party serialize round-trips slot state including expended flags", () => {
    const party = createDefaultParty();
    party.members.find((m) => m.classId === "wizard")!.spellSlots = [
      { id: "wizard_slot_1", rank: 1, preparedSpellId: "breathe_fire", expended: true },
      { id: "wizard_slot_2", rank: 1, preparedSpellId: "breathe_fire", expended: false },
    ];

    const restored = deserializeParty(serializeParty(party));
    const wizard = restored.members.find((m) => m.classId === "wizard")!;
    expect(wizard.spellSlots).toEqual([
      { id: "wizard_slot_1", rank: 1, preparedSpellId: "breathe_fire", expended: true },
      { id: "wizard_slot_2", rank: 1, preparedSpellId: "breathe_fire", expended: false },
    ]);
  });

  it("combat results write expended slots back into the campaign party", () => {
    const graph = havenGraph();
    const campaign = createCampaignState(createDefaultParty(), graph);
    const config: InitialStateConfig = {
      width: 8,
      height: 8,
      party: derivePartyBlueprints(campaign.party),
      enemies: [],
    };
    let session = { state: createInitialState(config), nextSeq: 1 };

    // expend one cleric slot by healing a wounded wizard
    const wizardId = config.party.find((b) => b.classId === "wizard")!.id;
    const clericId = config.party.find((b) => b.classId === "cleric")!.id;
    session = {
      ...session,
      state: {
        ...session.state,
        combat: { ...session.state.combat, activeActorId: clericId },
        entities: {
          ...session.state.entities,
          [wizardId]: { ...session.state.entities[wizardId]!, hp: 1 },
        },
      },
    };
    session = dispatch(
      session,
      {
        kind: "CastHeal",
        actionId: "act_heal_camp",
        actorId: clericId,
        spellId: "heal_ranged",
        targetId: wizardId,
      },
      createSeededRng(5),
    );
    expect(session.state.eventLog.some((e) => e.type === "SpellSlotSpent")).toBe(true);

    const updated = applyCombatResultToCampaign(campaign, session.state);
    const cleric = updated.party.members.find((m) => m.classId === "cleric")!;
    expect(cleric.spellSlots!.filter((s) => s.expended)).toHaveLength(1);
  });
});

function havenGraph(): WorldGraph {
  return {
    id: "graph_haven_test",
    startSiteId: "site_start" as SiteId,
    sites: [
      { id: "site_start" as SiteId, label: "Start", tier: 1, siteKind: "shelter", mapX: 10, mapY: 10 },
      { id: "site_haven" as SiteId, label: "Haven", tier: 1, siteKind: "shelter", mapX: 30, mapY: 10 },
      { id: "site_quest" as SiteId, label: "Quest", tier: 1, siteKind: "quest", mapX: 50, mapY: 10 },
    ],
    edges: [
      { from: "site_start" as SiteId, to: "site_haven" as SiteId, bidirectional: true },
      { from: "site_haven" as SiteId, to: "site_quest" as SiteId, bidirectional: true },
    ],
  };
}

describe("safe-haven recovery (PROCEDURAL until M19 rest)", () => {
  function campaignWithExpendedSlots() {
    const graph = havenGraph();
    const party = createDefaultParty();
    party.members.find((m) => m.classId === "wizard")!.spellSlots = [
      { id: "wizard_slot_1", rank: 1, preparedSpellId: "breathe_fire", expended: true },
      { id: "wizard_slot_2", rank: 1, preparedSpellId: "breathe_fire", expended: true },
    ];
    return { graph, campaign: createCampaignState(party, graph) };
  }

  it("restores all expended slots at a shelter site and emits SpellSlotsPrepared", () => {
    const { graph, campaign } = campaignWithExpendedSlots();
    const travelled = travelTo(campaign, graph, "site_haven" as SiteId);
    expect(travelled.ok).toBe(true);
    if (!travelled.ok) return;

    const result = prepareSpellSlotsAtHaven(travelled.state, graph);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.events.some((e) => e.type === "SpellSlotsPrepared")).toBe(true);
    const wizard = result.state.party.members.find((m) => m.classId === "wizard")!;
    expect(wizard.spellSlots!.every((s) => !s.expended)).toBe(true);
  });

  it("refuses recovery at a non-shelter site", () => {
    const { graph, campaign } = campaignWithExpendedSlots();
    const t1 = travelTo(campaign, graph, "site_haven" as SiteId);
    if (!t1.ok) throw new Error("travel failed");
    const t2 = travelTo(t1.state, graph, "site_quest" as SiteId);
    if (!t2.ok) throw new Error("travel failed");

    const result = prepareSpellSlotsAtHaven(t2.state, graph);
    expect(result.ok).toBe(false);
  });

  it("is a no-op (no event spam) when nothing is expended", () => {
    const graph = havenGraph();
    const campaign = createCampaignState(createDefaultParty(), graph);
    const result = prepareSpellSlotsAtHaven(campaign, graph);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.events).toHaveLength(0);
    expect(result.state).toBe(campaign);
  });
});
