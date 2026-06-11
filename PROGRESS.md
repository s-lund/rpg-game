# PROGRESS.md

Build progress for EMBERWATCH. Milestone definitions live in `ROADMAP.md`.

**Current milestone:** M7 (gate 2 — human acceptance pending)  
**Last updated:** 2026-06-10 — M7 gate 1 complete

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
| M6 District generation | **gate 1 done** | pass | pending |
| M7 Breadth + ranged combat | **gate 1 done** | pass | pending |
| M8 Map presentation + content packs | pending | — | — |
| M9 Combat rules depth | pending | — | — |
| M10 Tactical character art pass | pending | — | — |

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

## M6 — gate 1 done (2026-06-09)

**Delivered:** Pure-core district model (`src/core/district/` — types, validator, procedural `generateDistrictFromBrief`, loader); `DistrictPackage` with separate world + interior graphs; reclamation (`siteControl`, `markSiteHeld`, `MarkSiteHeld` effect); shared pathfinding for held/safe travel (`pathfinding.ts`, `travelWithinDistrict`); campaign v3 serialize (`mapLayer`, `activeDistrictId`, `currentAreaSiteId`, `siteControl`); frozen `tests/contract/district.test.ts`. Renderer: generated Ashen Ward on world map; **Enter district** → `StrategicMapScreen` district layer (unified strategic map — not a separate tile-grid UI); auto-combat on hostile arrival; victory returns to district map with area held; return to world map only from entrance; combat scene `destroy()` on teardown; dev PROCEDURAL flags.

**Gate 1:** `npm run test` (117 tests) — `district.test.ts`, `map-validator.test.ts`, `district-generate.test.ts`, `reclamation.test.ts`, `district-presence.test.ts`, `world-pathfinding.test.ts`, `site-kinds.test.ts`; frozen `pipeline.test.ts`, `transition.test.ts`, `narrator.test.ts` unchanged.

**Gate 2 (pending):** generate/load district, enter district strategic map, clear encounters, see hostile → held on map, confirm tier gradient, label-only rename, overlay PROCEDURAL flags.

---

## M7 — gate 1 done (2026-06-10)

**Delivered:** 4-hero party (archer Fighter, Rogue, Wizard, Cleric) via `m7-subset.json`; ranged `Strike`, `CastSpell` (Ray of Frost), `CastHeal` (2-action Heal); `Heal` effect + `Healed` event; combat inspector (`inspectTarget`); Skirmisher/Bruiser enemies; placeholder projectile VFX; frozen contract tests `ranged-strike`, `cast-spell`, `cast-heal`. Party/campaign serialize v2/v3 updated for 4 members.

**Gate 1:** `npm run test` (126 tests) — M7 contract + unit tests; frozen `pipeline.test.ts`, `transition.test.ts`, `narrator.test.ts`, `district.test.ts` unchanged.

**Gate 2 (pending):** create 4-hero party; bow at range; Ray of Frost; heal ally; hover inspector; projectiles on hit; overlay PROCEDURAL flags.
