# PROGRESS.md

Build progress for EMBERWATCH. Milestone definitions live in `ROADMAP.md`.

**Current milestone:** M13 — **The War Turn, ready to build** (design locked; see `NEXT_SESSION.md` for the build brief). The 2026-06-12 design-discovery session settled the core loop with human sign-off — **`DESIGN.md`** is the new north star (living three-faction war, rebel fourth power, spark to wildfire) — and restructured the roadmap: war arc **M13–M17**, old M14–M20 renumbered **M19–M25**. **M12 gate 2 is still owed:** gate 1 passed (290 tests green / 51 files, contracts untouched) but the human deferred the playtest — the LOOK checklist in the M12 section below remains open before M12 is accepted.  
**Last updated:** 2026-06-12 — M13 design-discovery session done: `DESIGN.md` written (human-signed), roadmap restructured M13–M25, M13 build brief written. M12 gate 2 still pending.

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
| M11 Line of sight, cover + friendly fire | **done** | pass | accepted |
| M12 Smart tactical AI | **gate 1 done** | pass | **not tested yet** |
| M13 The War Turn | **ready to build** | — | — |
| M14 War Economy | pending | — | — |
| M15 Battles of the War | pending | — | — |
| M16 Faction Minds | pending | — | — |
| M17 Endgame: spines, victory + defeat | pending | — | — |
| M18 The Region Map (content) | pending | — | — |
| M19 Equipment, inventory, loot + party economy | pending | — | — |
| M20 Progression: XP + levels | pending | — | — |
| M21 Story: faction character + personal thread | pending | — | — |
| M22 Bestiary, spell breadth + faction rosters | pending | — | — |
| M23 Figurines, facing + combat animations | pending | — | — |
| M24 Injuries, rest + permadeath dial | pending | — | — |
| M25 QoL: audio, save slots, difficulty | pending | — | — |

> Roadmap restructured 2026-06-12 after the design-discovery session (`DESIGN.md`, human-signed): the old M13 exploded into the war arc M13–M17 (+ M18 region-map content); old M14–M20 renumbered to M19–M25. Default build order: M13 → M14 → M15 → M16 → M19 → M20 → M17 (party progression before Endgame), re-checked at every gate-2. Earlier note (2026-06-11): the old "M10 Tactical character art pass" lives on as M23.

---

## M13 design-discovery session — done (2026-06-12)

**Delivered (design only, no code):** `DESIGN.md` (new, human-signed) — the core-loop north star: living three-faction war over a frontier region, player as rebel fourth power, spark-to-wildfire arc; discrete strategic turns; full map visibility; pure autoresolve absent the party ("being there changes the rules"); armies as stacks with one slot = one soldier/hero; typed fungible troops; gold-hires/food-sustains economy; recruits raised from freed areas; retreat as a first-class mechanic (the campaign owns fairness); victory = break three faction spines (party-only setpieces, capitulation cascades); defeat = party wipe only (territory fully elastic); no world-leveling; heat + slow burn; story serves the war. Anti-goals: autoresolve dominance, illegible war, world-leveling. ROADMAP.md restructured (M13–M25); this file and `NEXT_SESSION.md` (M13 build brief) rewritten. `tests/contract/` untouched; zero game code changed.

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

---

## M11 — done (2026-06-12; gate 2 accepted 2026-06-12)

Built as two sessions: **Phase A** (premium model, commit `0399715`) froze the geometry contract; **Phase B** (standard model, commit `d495164`) wired it through resolver, AI, inspector, and renderer.

**Delivered (Phase A):** Vendored SRD (`rules/srd/cover.md`, `line-of-effect.md`, `m11-subset.json`; Archives of Nethys, not memory; the corner-sampling derivation is flagged where it replaces RAW GM adjudication). Pure-core geometry (`src/core/combat/los.ts`): line of effect by corner-occlusion sampling (attacker's best corner vs the target tile's four corners — all rays blocked = untargetable, some = standard cover +2, none = open; walls hair-expanded so sealed diagonal corners and tangent rays block; sampling corners inset so wall-hugging rays block while corridor shots stay clear); cover evaluation with tier + source (blocked / half-wall-partial / half-prop / lesser-creature / none); AC and Reflex-vs-area bonus helpers reading `m11-subset.json`; M9 cone template clipped by line of effect; tileset `raised`-height → wall/prop derivation (threshold 0.7). `MapGrid.cover` optional field — legacy maps/saves keep blocked-as-wall. Frozen `tests/contract/los-cover.test.ts` (28 table-driven tests over ASCII grids).

**Delivered (Phase B):** Per-tile cover flows `ResolvedBattleMap.cover` → `InitialStateConfig.coverTiles` → `MapGrid.cover`. Resolver: Strike (melee included) and Ray of Frost reject blocked targets and add cover AC (`coverAcBonus` on `AttackResolution`); Heal requires line of effect; Breathe Fire uses the clipped cone and adds Reflex-vs-area cover to saves (`coverBonus` on `SaveResolution`) — closes `m9_cone_line_of_effect`. Inspector shares the same `evaluateCover` math (tier/source/label lines). Greedy enemy AI never shoots without line of effect. Pack validator: `raised > 0` requires `blocked`. Renderer: no reticle on blocked targets, clipped cone preview, inspector + combat-log cover lines, `m11_los_cover` overlay flag, M11 banner. New `tests/contract/cover-resolution.test.ts`; all frozen suites untouched.

**Gate 1:** `npm run test` (258 tests, 47 files) — frozen `los-cover.test.ts` + new `cover-resolution.test.ts`; all earlier frozen contract tests unchanged. `npm run build` clean.

**Gate 2:** accepted 2026-06-12 — playtested; prop/creature cover, cone clipping, and blocked-target UX showed well. **Caveat / WATCH ITEM:** the shipped battle maps rarely put freestanding walls between spawns and firing lines, so corner-aware *wall* cover was hard to exercise in play — accepted on the frozen geometry contract; stage wall-cover sightlines when battle-map variety grows (recorded under M11 in `ROADMAP.md`, M17 at the latest).

---

## M12 — gate 1 done (2026-06-12); gate 2 NOT yet tested by human

Built as two sessions: **Phase A** (premium model, commit `2fb1a44`) shipped the utility-scoring AI framework, frozen behavior contracts, and the RAW Reactive Strike trigger closure. **Phase B** (standard-model session, this work) authored the per-archetype profiles as data, wired them into both content packs, and finished the renderer/log/overlay surface. No framework redesign.

**Delivered (Phase A, recap):** utility-scoring chooser `chooseAiAction` (enumerate → score → pick; pure, deterministic, no RNG) with action families registered in `src/core/ai/registry.ts`; profile schema + `BASELINE_PROFILE`; `perceivableTargets` perception seam; frozen `tests/contract/ai-behavior.test.ts` (behavior properties) and `tests/contract/reactions-raw.test.ts` (Reactive Strike closed to full RAW — shooting/casting/standing in reach provoke, a crit disrupts a manipulate cast with slot + AP still spent).

**Delivered (Phase B):** Four archetype AI profiles as DATA in `src/core/ai/profile.ts` (`AI_PROFILES`), tuned against `BASELINE_PROFILE` — `skirmisher` (coverSeek/meleeZoneAvoid/focusFire up, retreat <40% HP), `bruiser` (`meleeZoneAvoid: -1` body-block, low aooRisk, no retreat — dies forward), `caster` (backline: high aooRisk/coverSeek/meleeZoneAvoid, expectedDamage up; scoped honestly to `ray_of_frost`, no new spell mechanics), `wounded` (baseline until <50% HP, then approach ×−1.5 / coverSeek ×2.5). Content wiring: emberwatch `foe()` maps role → `aiProfileId` (+ explicit `aiProfile` override) and gains a `caster` role — new **Spire Adept** (Ray of Frost) in the Great Hall; cowardly **Market Looters** → `wounded`. Mirrormarsh **Bog Stalkers** (ranged) → `wounded`; new **Mire Chanter** caster in the Grain Vault. Staging: a freestanding wall pylon added to `bmap_watchers_bridge` (Bridge Warden chokepoint **and** the M11 wall-cover-sightline watch item). Renderer/log/overlay (read-only consumers, no rules change): combat log prints the critical-Reactive-Strike cast-disruption line (`disruptedCast`) and the M12 "Reactive Strike" wording; dev overlay drops `m10_aoo_trigger_subset`, adds `m12_tactical_ai` + `m12_raw_reactions` (+ a `m12_crit_disruption_scope` honesty flag); M12 console banner.

**Gate 1:** `npm run test` (290 tests, 51 files) — new `tests/unit/ai-profiles.test.ts` (6, per-profile signatures via the explicit `profileId` arg) and `tests/unit/ai-staging-smoke.test.ts` (4, AI-vs-AI run to completion through the staged encounters; asserts profiles reach the right entities and the wired enemy casters actually cast); all `tests/contract/` files **UNTOUCHED**. `npm run build` clean.

**Known Phase A simplifications (flagged, NOT fixed in core):** crit detection gates manipulate-cast disruption only — critical double damage stays unmodeled game-wide (`m12_crit_disruption_scope`); interrupted action computed from the pre-action snapshot; move-scoring lookahead prices AoO disruption-risk as damage only; kill-probability treats damage as uniform over the band. Full list in `rules/srd/reactive-strike.md` (M12 scope) and the Phase A handoff.

**Gate 2:** **NOT yet tested — human deferred the playtest (2026-06-12).** Still owed before M12 is accepted: LOOK — skirmishers kite to cover and shoot the squishiest; bruisers body-block corridors and trigger AoOs deliberately; wounded enemies pull back behind cover when hurt; shooting/casting next to a melee enemy eats a Reactive Strike and a crit disrupts the cast in the log (slot lost); each archetype reads differently within two turns. OVERLAY — `m10_aoo_trigger_subset` gone, `m12_tactical_ai` + `m12_raw_reactions` present. Then the stop signal: *"M12 done. Lose a fight you'd have won against the old AI, and say why the enemy played well."*
