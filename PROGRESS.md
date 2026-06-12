# PROGRESS.md

Build progress for EMBERWATCH. Milestone definitions live in `ROADMAP.md`.

**Current milestone:** M11 — Phase A (premium geometry contract) done 2026-06-12; Phase B (standard-model wiring/content/renderer) pending, prompt in `NEXT_SESSION.md`. Gate 2 still open — nothing is visible in-game yet by design.  
**Last updated:** 2026-06-12 — M11 Phase A committed (LoS/cover geometry contract, 246 tests)

---

## Milestones

| Milestone | Status | Gate 1 (tests) | Gate 2 (human) |
|-----------|--------|----------------|----------------|
| M0 Scaffold | **done** | pass | accepted |
| M1 Combat map: move + fight | **done** | pass | accepted |
| M2 Character creation | **done** | pass | accepted |
| M3 World map: travel | **done** | pass | accepted |
| M4 World ↔ combat transition | **done** | pass | accepted |
| M5 Storytelling | **done** | pass | accepted |
| M6 District generation | **done** | pass | accepted |
| M7 Breadth + ranged combat | **done** | pass | accepted |
| M8 Map presentation + content packs | **done** | pass | accepted |
| M9 Combat rules depth | **done** | pass | accepted |
| M10 Initiative, reactions + conditions | **done** | pass | accepted |
| M11 Line of sight, cover + friendly fire | pending | — | — |
| M12 Smart tactical AI | pending | — | — |
| M13 Strategic pressure + win/lose | pending | — | — |
| M14 Equipment, inventory, loot + economy | pending | — | — |
| M15 Progression: XP + levels | pending | — | — |
| M16 Story, quests, dialogue + skill checks | pending | — | — |
| M17 Bestiary + spell breadth | pending | — | — |
| M18 Figurines, facing + combat animations | pending | — | — |
| M19 Roster, injuries, rest + recovery | pending | — | — |
| M20 QoL: audio, save slots, difficulty | pending | — | — |

> Roadmap renumbered 2026-06-11: the old "M10 Tactical character art pass" is subsumed into **M18**. M9–M20 ordering rationale lives in `ROADMAP.md`.

---

## M0 — done (2026-06-08)

**Delivered:** TypeScript + Vite + three.js scaffold; pure `src/core/`; asset manifest + loader; dev overlay with presence/acceptance reporting; Vitest + Stryker + CI; legal/SRD stubs.

**Gate 1:** `npm run test` (8 tests), `npm run build`, Stryker configured, `tests/contract/` empty.

**Gate 2:** Iso grid visible; overlay toggles (F3 / `~`); manifest-only items flagged in overlay.

---

## M1 — done (2026-06-08)

**Delivered:** Headless combat core (effect pipeline, Step/Strike/EndTurn, flanking → flat-footed, event log + replay); placeholder iso renderer (stateless `CombatScene`, HUD with End Turn button, click-to-move/strike); M1 demo encounter (Fighter, Rogue, 2 goblins). Enemy turns auto-pass (no enemy AI — out of M1 scope).

**Gate 1:** `npm run test` (19 tests) — frozen `tests/contract/pipeline.test.ts`; scripted fight replay; renderer stateless test.

**Gate 2:** Move Fighter and Rogue; strike; kill enemy; End Turn UX accepted.

---

## M2 — done (2026-06-08)

**Delivered:** ORC SRD subset (`rules/srd/`, `m2-subset.json`); pure-core character validation, derivation, party serialize/round-trip; creation screen (point-pool abilities from base 10, trained skills, names); `classId` on entities; created party wires into M1 combat map. Ability scores affect HP, AC, attack, and damage in combat; trained skills validated only (no skill checks yet). Combat target hover inspector deferred to M7.

**Gate 1:** `npm run test` (30 tests) — character-validation, character-derive, party-roundtrip; frozen contract tests unchanged.

**Gate 2:** Creation screen → named Fighter + Rogue → Start Combat → party on grid with chosen stats in HUD; point-pool UX accepted.

---

## M3 — done (2026-06-08)

**Delivered:** Pure-core world graph (`WorldSite` with `mapX`/`mapY`, edges, validator, `getNeighbors`); `CampaignState` + `emberwatch.campaign` v1 serialize; `travelTo` / `canTravelTo`; M3 demo graph (4 sites). Renderer: creation → **Enter World** (no direct combat); `WorldMapSession` + BG1/2-style `WorldMapScreen` (parchment map, SVG paths, animated gold party token ~2.8s, map + sidebar travel); `localStorage` campaign persist + Continue saved party. `startCombat` retained on `window.__emberwatch` for M4 wiring only.

**Gate 1:** `npm run test` (50 tests) — `world-graph.test.ts`, `world-travel.test.ts`; frozen contract tests unchanged.

**Gate 2:** BG-style overworld; token animates between sites; position and routes update; accepted.

---

## M4 — done (2026-06-08)

**Delivered:** Pure-core transition (`EncounterId`, `M4_DEMO_ENCOUNTERS`, `WorldSite.encounterId`, `CharacterDraft.currentHp`, `buildEncounterForSite`, `applyCombatResultToCampaign`, `validateWorldGraphEncounters`). Frozen `tests/contract/transition.test.ts`. Renderer: **Enter site** on overworld → site-specific combat with created party → victory returns to same site with HP persisted; defeat → Game Over screen (clears save on return to recruitment). `game-over-screen.ts`, `WorldMapSession.replaceState`, combat teardown via `combatHud.destroy()`. Map/sidebar z-index fix so Enter site button receives clicks.

**Gate 1:** `npm run test` (61 tests) — `transition.test.ts`, `world-transition.test.ts`; frozen `pipeline.test.ts` unchanged.

**Gate 2:** Enter site, fight, return with HP carried over; Game Over on defeat; overlay PROCEDURAL flags; accepted.

---

## M5 — done (2026-06-08)

**Delivered:** Frozen `tests/contract/narrator.test.ts`. Campaign event pipeline (`campaign-apply.ts`, `eventLog`/`nextSeq` on `CampaignState`, `Traveled` / `StoryBeatTriggered` events). Pure-core narrator: `sites.ts` ambience catalog, `beats.ts`, `format.ts`, `combat-log.ts` with `attackResolution` on strikes. Renderer: `NarratorPanel` (current site only, overworld); `CombatLogPanel` (dice combat log, combat only); auto ambience on travel + auto beat on first visit to Drowned Market. Dev overlay PROCEDURAL flags for narrator, site ambience, combat log.

**Gate 1:** `npm run test` (80 tests) — `narrator.test.ts`, `narrator-format.test.ts`, `campaign-apply.test.ts`, `combat-log.test.ts`; frozen `pipeline.test.ts` and `transition.test.ts` unchanged.

**Gate 2:** Separate narration vs combat log; current-place narration; rich strike log; toggle does not affect mechanics; accepted.

---

## M6 — done (2026-06-09; gate 2 accepted 2026-06-11)

**Delivered:** Pure-core district model (`src/core/district/` — types, validator, procedural `generateDistrictFromBrief`, loader); `DistrictPackage` with separate world + interior graphs; reclamation (`siteControl`, `markSiteHeld`, `MarkSiteHeld` effect); shared pathfinding for held/safe travel (`pathfinding.ts`, `travelWithinDistrict`); campaign v3 serialize (`mapLayer`, `activeDistrictId`, `currentAreaSiteId`, `siteControl`); frozen `tests/contract/district.test.ts`. Renderer: generated Ashen Ward on world map; **Enter district** → `StrategicMapScreen` district layer (unified strategic map — not a separate tile-grid UI); auto-combat on hostile arrival; victory returns to district map with area held; return to world map only from entrance; combat scene `destroy()` on teardown; dev PROCEDURAL flags.

**Gate 1:** `npm run test` (117 tests) — `district.test.ts`, `map-validator.test.ts`, `district-generate.test.ts`, `reclamation.test.ts`, `district-presence.test.ts`, `world-pathfinding.test.ts`, `site-kinds.test.ts`; frozen `pipeline.test.ts`, `transition.test.ts`, `narrator.test.ts` unchanged.

**Gate 2:** accepted 2026-06-11 — playtested; district entry, reclamation, and tier gradient looked good.

---

## M7 — done (2026-06-10; gate 2 accepted 2026-06-11)

**Delivered:** 4-hero party (archer Fighter, Rogue, Wizard, Cleric) via `m7-subset.json`; ranged `Strike`, `CastSpell` (Ray of Frost), `CastHeal` (2-action Heal); `Heal` effect + `Healed` event; combat inspector (`inspectTarget`); Skirmisher/Bruiser enemies; placeholder projectile VFX; frozen contract tests `ranged-strike`, `cast-spell`, `cast-heal`. Party/campaign serialize v2/v3 updated for 4 members.

**Gate 1:** `npm run test` (126 tests) — M7 contract + unit tests; frozen `pipeline.test.ts`, `transition.test.ts`, `narrator.test.ts`, `district.test.ts` unchanged.

**Gate 2:** accepted 2026-06-11 — playtested; 4-hero party, ranged/spell/heal actions, and hover inspector looked good.

---

## M8 — done (2026-06-11; gate 2 accepted 2026-06-11)

**Delivered:** Content-pack architecture (`src/core/pack/` — `ContentPack` types, `validateContentPack`, battle-map validator/resolver, `buildPackEncounter`); blocked terrain in combat core (`MapGrid.blocked`, Step rejects blocked tiles, enemy AI avoids them, survives replay); `derivePartyBlueprints` spawn overrides; `WorldSite.levelId` for multi-level district interiors. Content layer (`src/content/`): authored **Emberwatch** default pack — 9-site frontier world, **The Drowned Quay** (harbor, 1 level), **The Bell Spire** (tower, 3 levels), **The Ember Vaults** (undercroft, 2 levels), 18 themed encounters on 12 authored battle maps over 4 tilesets, per-site ambience; minimal **Mirrormarsh** alt pack (fen world, 1 district, marsh tileset) proving the seam; 9 illustrated SVG maps under `public/art/` (parchment world maps, district plans, per-level tower/dungeon floors). Renderer: manifest merge with pack entries; `StrategicMapScreen` illustrated backgrounds + per-level floor plans with stairs-aware token travel; `CombatScene` themed battle-map tiles (extruded walls/props, recessed water/chasm, tileset scene background); camera sized per encounter; pack picker on the recruit screen (persisted); combat on hostile world sites with victory → Held. Old saves (generated Ashen Ward, M3 demo) still resolve via legacy fallback.

**Gate 1:** `npm run test` (156 tests) — `content-packs.test.ts`, `battle-map.test.ts`, `blocked-terrain.test.ts`, updated `combat-scene-dispose.test.ts`; frozen `pipeline.test.ts`, `transition.test.ts`, `narrator.test.ts`, `district.test.ts` and all other contract tests unchanged. `npm run build` clean.

**Known simplification (flagged in overlay):** blocked terrain stops *landing* on walls; Step has no path check yet, so a 2–3 AP step can cross a wall tile. Path-aware movement is combat-rules-depth territory (M9).

**Playtest fix (2026-06-11):** district sites were indistinguishable from battle sites on the world map (tester looked for districts at the Ashen Road / Cinder Market / Pilgrim's Rest — none of which are districts). District sites now render as larger gold ✦ markers with a DISTRICT caption; sidebar routes show `· District`; site status reads "District — can be entered" / "Safe haven" / "Point of interest" instead of a blanket Held/Hostile, and the red hostile marker ring is reserved for actual combat sites.

**Gate 2:** accepted 2026-06-11 — playtested; illustrated world/district/battle maps, multi-level districts, world-site reclamation, and Mirrormarsh pack swap all looked good.

---

## M9 — done (2026-06-11; gate 2 accepted 2026-06-11)

**Delivered:** Vendored SRD (`rules/srd/` — `saving-throws.md`, `resistance-weakness.md`, `spell-breathe-fire.md`, `cleric-divine-font.md`, `spell-slots.md`, `m9-subset.json`; all from Archives of Nethys, not memory). Pure-core combat depth: four-tier basic saves with natural 20/1 step shifts (`combat/save.ts`); weakness-then-resistance damage adjustment on every `Damage` effect (`combat/damage.ts`); Breathe Fire (2 actions, 3-tile quarter-circle cone, 2d6 fire, basic Reflex, RAW friendly fire — allies in the template save and take damage; `combat/cone.ts`, `CastConeSpell`); prepared spell slots (spell locked into slot; Heal is a rank-1 leveled spell; Cleric divine font = 4 Heal-only bonus slots; Wizard preps 2× Breathe Fire; **opt-in enforcement** — entities without a `spellSlots` pool cast unrestricted, keeping frozen M7 contracts green); `SpendSpellSlot` effect → `SpellSlotSpent` event; slot state persists across combat↔campaign transitions and party/campaign serialize; free re-preparation at safe havens via `PrepareSpellSlots` campaign effect (PROCEDURAL until M19 rest). Path-aware Step (`combat/path.ts` BFS): blocked terrain can't be crossed, enemies block routes, allies are pass-through, AP cost = route length. Content: enemy archetypes carry role-scaled save modifiers; ember mobs resist fire 3 / weak cold 2, drowned & marsh mobs the reverse (both packs). Renderer: Breathe Fire cone preview + tile-click casting, slot counts on HUD buttons and party lines (disabled at 0), hover inspector shows save % and resist/weak-adjusted damage bands, combat log prints save rolls vs DC with outcome tiers, adjustment breakdowns, and slot-spend lines.

**Type-system note:** the frozen M1 pipeline test compiles an exhaustive switch over `Effect["kind"]`, so `Effect` stays frozen at its M1 kinds; the pipeline functions accept `AnyEffect` (= `Effect` + post-freeze kinds like `SpendSpellSlot`), and each new kind ships its own one-effect-one-event + replay contract test.

**Gate 1:** `npm run test` (193 tests) — new `tests/contract/save-resolution.test.ts`, `resistance-weakness.test.ts`, `spell-slots.test.ts`, `path-aware-step.test.ts`, `tests/unit/cone-template.test.ts`; all frozen contract tests unchanged. `npm run build` clean.

**Playtest fix (2026-06-11):** a selected cast mode could only be left by picking another spell, so the Wizard with Breathe Fire selected could no longer move (tile clicks cast). Added a **Move** mode button for every hero — never casts, shows the AP movement radius — and mode choice now persists only while valid for the active hero.

**Known simplifications (flagged in overlay):** Breathe Fire's cone ignores walls (line of sight/effect is M11, `m9_cone_line_of_effect`); safe-haven slot recovery is the interim stand-in for M19 rest (`m9_slot_recovery`).

**Gate 2:** accepted 2026-06-11 — playtested; saves, resistance/weakness, slot economy, and path-aware movement all looked good after the Move-mode fix.

---

## M10 — done (2026-06-11; gate 2 accepted 2026-06-12)

**Delivered:** Vendored SRD (`rules/srd/` — `initiative.md`, `conditions-m10.md`, `reactive-strike.md`, `m10-subset.json`; Archives of Nethys, not memory). Pure-core action economy: rolled Perception initiative — seeded, stored on the **initial state** (not events, since `replayEvents` starts from the caller's initial state; `CombatSession` keeps the seed), enemy wins ties; condition framework (`combat/conditions.ts` — duration, value, expiry) generalized from `flat_footed`, with `Entity.conditions` staying the frozen M1 bare-id mirror over a new `activeConditions` detail list, both maintained only in `apply.ts`; five conditions — **frightened** (value, ticks down), **prone**, **stunned** (loses actions), **slowed**, **persistent damage** (ticks ride normal `Damage` effects, so M9 weakness/resistance applies for free); post-freeze effect kinds `TickCondition` and `SpendReaction` extend `AnyEffect` with their own contract tests; **Reactive Strike as a HOUSE RULE** — every melee-armed combatant threatens (not Fighter-only, declined in favor of XCOM-style zoning both ways), once per round (resets at the entity's turn start), auto-resolved, trigger scoped to leaving the reactor's reach (manipulate/ranged triggers deferred, flagged `m10_aoo_trigger_subset`); per RAW the move is not disrupted — damage resolves and the move completes, except a downed mover stops at the trigger square; **Stand** as a new 1-action combat action (Crawl deferred). Content: enemy on-hit condition riders (`onHitCondition`) as pack data — Quay Bruiser → prone, Cinder Shade → persistent fire 1d4, bosses/Granary Wight → frightened 2, Bog Stalker → slowed 1 — carried by Reactive Strikes too; heroes get a +10 HP playtest cushion (flagged `m10_hp_cushion`, superseded by M15 leveling). Renderer: interleaved initiative order, condition icons on figures, hover-inspector condition lines, combat-log lines for initiative/reactions/condition onset+expiry, overlay flags.

**Gate 1:** `npm run test` (218 tests) — new frozen `tests/contract/initiative.test.ts`, `reactions.test.ts`, `conditions.test.ts`; all earlier frozen contract tests unchanged. `npm run build` clean. *(The 2026-06-11 handoff note recorded "231 tests" — that was a miscount; 218 is consistent: M9's 193 + 24 new contract + 1 net unit.)*

**Gate 2:** accepted 2026-06-12 — playtested; initiative interleave, universal AoO, and the condition set all looked good.
