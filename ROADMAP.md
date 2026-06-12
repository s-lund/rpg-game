# ROADMAP.md

Built by an unattended agent loop. Every milestone has **two gates**:

- **Loop self-check** — automated contract tests. This is what the Ralph loop runs to know it's done; it never needs a human. Tests in `/tests/contract` are frozen (see `AGENTS.md`).
- **You can try** — a runnable artifact you launch and poke. When the self-check passes, the loop **stops and reports** this, and you accept by trying it. You never read code to accept a milestone.

Milestones are sequential and each is a bounded loop target. Stack: TypeScript + three.js, Vitest, Node. Rules core is pure TS, tested headless.

> Milestones marked **(new)** were added after the "things I can try out" review — they weren't distinct deliverables in the first draft.

---

## M0 — Scaffold
**Goal:** a real, empty project, with the asset manifest and dev overlay shells in place.
- **You can try:** `npm run dev` opens a blank three.js canvas with a dev overlay you can toggle (empty for now); `npm run test` runs green on a trivial test.
- **Loop self-check:** CI green; dev server boots; asset manifest loads; mutation tooling (Stryker) configured.
- **Stop signal:** "M0 done. Run `npm run dev`, confirm a window opens and the dev overlay toggles."
- **Model:** standard. Plumbing.

## M1 — Combat map: move + fight
**Goal:** the headless combat core AND a placeholder iso renderer, together, so the first thing you see is playable.
- **You can try:** place a Fighter and a Rogue on an isometric grid (placeholder boxes), click to move within action points, make a Strike, watch HP fall, see flanking make a target flat-footed, finish a fight.
- **Loop self-check:** the pipeline contract test (state mutates only via `apply(Effect)`; one Effect → one Event); a scripted fight resolves correctly and is reconstructable from the event log; renderer holds zero game state.
- **Stop signal:** "M1 done. Run it, move both characters, kill an enemy."
- **Model:** premium for the pipeline + effect contracts; standard for each action/condition against its test.

## M2 — Character creation *(new)*
**Goal:** build the party instead of hardcoding it.
- **You can try:** a screen to create a Fighter and a Rogue (distribute ability points and pick skills from the SRD subset), name them, and start the M1 combat map with the party you just made.
- **Loop self-check:** created characters validate against SRD rules; the party round-trips through the core unchanged into combat.
- **Stop signal:** "M2 done. Make a party, drop it into a fight."
- **Model:** standard; premium only if validation rules get hairy.

## M3 — World map: travel *(new)*
**Goal:** the strategic scale.
- **You can try:** a separate overworld map; move the party between sites; see where you are and where you can go.
- **Loop self-check:** world-map graph loads and validates (sites reachable, travel edges valid); party position persists across moves.
- **Stop signal:** "M3 done. Walk the party across the world map between sites."
- **Model:** standard.

## M4 — World ↔ combat transition *(new)*
**Goal:** connect the two scales — the thing that makes it one game.
- **You can try:** move into a site/encounter on the world map, drop into its combat map with your actual party and the right enemies, finish the fight, and return to the world map with HP/state carried over.
- **Loop self-check:** the transition contract (party state owned by core, survives both directions; correct local map + encounter loads; combat end returns updated state).
- **Stop signal:** "M4 done. Go from world map into a fight and back."
- **Model:** premium for the transition contract; standard for wiring.

## M5 — Storytelling *(new framing)*
**Goal:** the narrator as a thing you experience.
- **You can try:** during exploration and combat, atmospheric prose appears, generated from the event log; trigger a scripted story beat at a site and read it.
- **Loop self-check:** narrator consumes only the event log; disabling it changes nothing mechanical.
- **Stop signal:** "M5 done. Play a bit and read the narration; trigger the beat at site X."
- **Model:** standard at build; runtime narrator uses a cheap constrained model.

## M6 — District generation + reclamation loop
**Goal:** original content and the core game loop.
- **You can try:** generate an original district from a brief; **Enter** it from the world map into a **district strategic map** (same map UI as the frontier — nodes, paths, token); walk areas, fight hostiles, and see reclamation progress as areas flip hostile → held on both district and world maps; inward difficulty tier gradient is noticeable; return to the frontier only from the district entrance.
- **Loop self-check:** generated districts pass all validator invariants; ID/label rename works as a data edit; cleared/held state persists; `mapLayer` and interior graph round-trip through campaign serialize; frozen transition contract still passes.
- **Stop signal:** "M6 done. Generate a district, enter it, clear areas on the district map, see held status persist — then return to the world map from the entrance."
- **Model:** premium for validator invariants; standard for generator + loaders. *Candidate skill: `generate-and-validate-map`.* Strategic map *art* stays procedural until M8.

## M7 — Breadth + ranged combat
**Goal:** depth on the proven foundation — a 4-hero party with bow, melee, and first scoped magic.
- **You can try:** create a **Fighter (shortbow)**, **Rogue**, **Wizard** (Ray of Frost cantrip), and **Cleric** (2-action Heal); fight new enemy types at range; see placeholder projectiles fly on hits; **hover an enemy** for HP, hit%, and damage band (from implicit class weapons/spells — no equipment picker).
- **Loop self-check:** each new action/effect ships with its contract test and rides the existing pipeline (no new mutation paths); ranged strike, CastSpell, and CastHeal tested headless; combat inspector computed in pure core from the same math as the resolver.
- **Stop signal:** "M7 done. Play a fight with bow, Ray of Frost, and Heal; hover a foe for the combat breakdown."
- **Model:** standard. *Candidate skills: `add-effect`, `add-action`.*

## M8 — Map presentation + content packs *(new)*
**Goal:** real illustrated maps at every scale — world, district, and battle — loaded through the same swappable presentation seam. Engine stays fixed; a new game is mostly new data + assets.
- **You can try:** procedural parchment strategic maps and checkerboard combat tiles are replaced (or skinned) by real art: frontier overworld background, at least one district interior map, and battle-map tile meshes / floor art for encounters; site markers, paths, and the party token sit on top of strategic artwork; swapping the content pack (manifest + graph data + image/tile refs) changes the game's look and locations without touching core rules.
- **Loop self-check:** world map, district map, and battle-map presentation read backgrounds, marker icons, path styling, and tile meshes from the asset manifest / content pack — not hardcoded paths in renderer source; world and district layers use the same `StrategicMapScreen` presentation contract; combat tile grid reads battle-map assets from the manifest; core still owns only graphs and campaign state (no image URLs in authoritative state); a second minimal pack (e.g. relabel + recolor + different backgrounds/tiles) loads and plays.
- **Stop signal:** "M8 done. Open the game — world map, a district map, and a fight all look illustrated, not procedural; drop in the alt pack and see a different map skin."
- **Model:** standard for manifest + loader wiring; N/A for producing final art (out-of-loop). *Fixed authored maps and procedurally generated graphs both remain valid — art is presentation anchored to `mapX`/`mapY` (strategic) and grid layout (battle), topology stays data.*
- **Plan changes made during M8 (delivered beyond the original spec):** district interiors may span **multiple levels** (tower floors / dungeon depths) with per-level map art and stairs-aware token travel; battle maps carry **blocked terrain** (walls, water, chasms) that the core enforces for movement; hostile **world-layer combat sites** fight on arrival and flip to Held (the world map participates in reclamation, not only district interiors); the shipped "real art" is authored SVG illustration — raster painted upgrades remain a manifest-edit drop-in (`ASSETS_NEEDED.md`).

## Phase 2 (M9–M20) — from engine demo to game
*Added 2026-06-11 after the genre gap review (XCOM, BG1/2, Battle Brothers). Ordered hardest-first, except where an item depends on an earlier one. Two dependency chains force the order: combat depth (M9 → M10 → M11) must land before the tactical AI can be smart about it (M12), and equipment (M14) + progression (M15) must land before story rewards (M16) and gear-reflective figurines (M18). M13 and M14 don't depend on the combat chain and may be pulled forward if priorities shift. The old "M10 Tactical character art pass" is subsumed into M18. Each item flags **Clarify first** (decisions needed from the human) and **Safe to start** (unambiguous, can be coded today once the milestone begins).*

## M9 — Combat rules depth *(deferred from M7; unchanged)*
**Goal:** PF2e mechanics that were scoped out of M7 — saves, resistances, and spell-slot economy — without changing the map or art layers. *(Added by M8: path-aware Step movement — M8 blocked terrain rejects landing on walls but Step has no route check yet, so a multi-AP step can cross a wall tile; fix belongs with the movement rules here.)*
- **Difficulty:** medium — but it's the dependency root for everything tactical, so it goes first.
- **You can try:** spells and effects that call for saves (e.g. Reflex / Fort / Will) resolve with visible save outcomes in the combat log; creatures with resistance or weakness show the adjusted damage; leveled spells consume per-day slots instead of acting like at-will cantrips.
- **Loop self-check:** each new rule rides the existing action → effect → state pipeline with contract tests; save resolution, resistance/weakness math, and slot spend/recovery are headless in core; no renderer mutation of authoritative state.
- **Stop signal:** "M9 done. Cast a save-based effect, hit something with resistance, and spend a leveled spell slot — all visible in the log."
- **Model:** premium if save edge cases get hairy; standard per action/effect.
- **Clarify first:** *resolved 2026-06-11 — follow PF2e RAW.* Heal becomes a rank-1 leveled spell consuming slots, and the Cleric gains **divine font** (bonus slots restricted to Heal, count per the vendored SRD) so healing stays plentiful but finite. The Wizard vendors **Breathe Fire** (remaster ORC name; Reflex basic save, fire damage) — one spell exercises slots, four-tier basic saves, and resistance/weakness together. Prepared casting is PF2e-style: a specific spell locked into a specific slot at daily preparation. Interim slot recovery until M19's rest system: free preparation at safe havens, flagged PROCEDURAL in the overlay. Vendor all SRD text (divine font, Breathe Fire, basic saves, resistance/weakness, slots-per-day) under `rules/srd/` before implementing — never from memory. *Further resolved:* M7's Heal / Ray of Frost implementations were mechanics scaffolding and **may be overwritten**; the frozen M7 contract tests construct slot-less entities, so slot enforcement is **opt-in** (an entity without a `spellSlots` pool casts unrestricted) and the frozen tests stay green untouched. **Testability requirement (applies to this and every later milestone):** ship the systems pre-loaded — the party starts with filled prepared slots (Wizard: Breathe Fire; Cleric: divine-font Heals), and the enemy archetype factory gains save modifiers plus themed resistances/weaknesses (e.g. ember creatures resist fire, marsh/drowned creatures resist cold — both packs show reduced *and* boosted damage in one playtest). Breathe Fire's cone follows PF2e RAW and damages allies caught in the template (their saves apply) — AoE friendly fire effectively arrives here; cover-based friendly fire for single-target line attacks remains M11.
- **Safe to start:** save resolution + resistance/weakness math headless in core (SRD-defined); path-aware Step using a grid route check (strategic-layer pathfinding in `pathfinding.ts` is the pattern); slot spend/recovery data model.
- **Plan changes made during M9 (delivered beyond / alongside the spec):** the frozen M1 pipeline test compiles an **exhaustive switch over `Effect["kind"]`**, so the `Effect` union is frozen at its M1 kinds — post-freeze effect kinds (M9's `SpendSpellSlot`, and every future one) extend **`AnyEffect`** in `src/core/effects/types.ts` and ship their own one-effect-one-event + replay contract tests; a **Move** action-mode button was added to the combat HUD (never casts — required once tile clicks could spend Breathe Fire slots); the cone template is a deterministic quarter-circle derivation vendored in `rules/srd/spell-breathe-fire.md` (cardinal 7 tiles / diagonal 8); the cone ignores walls until M11 line-of-effect (flagged `m9_cone_line_of_effect`).

## M10 — Initiative, reactions + conditions
**Goal:** the PF2e action economy made real — rolled turn order, reactions (Attack of Opportunity), and a working condition set beyond flat-footed.
- **Difficulty:** medium-hard. Reactions interrupt the strict turn flow — first real stress on the one-Effect-one-Event pipeline.
- **You can try:** combat opens with rolled initiative interleaving party and foes; walking out of a Fighter's reach provokes a visible Attack of Opportunity; spells and hits apply frightened / prone / stunned / slowed with icons on the figure and effects you can feel (penalties, lost actions); conditions tick down visibly at turn boundaries.
- **Loop self-check:** initiative is core state, deterministic from the seed, replayable from the event log; reactions resolve as normal pipeline effects (no side-channel mutation); each condition ships with a contract test for onset, mechanical effect, and expiry.
- **Stop signal:** "M10 done. Watch initiative interleave, provoke an AoO, land a condition and watch it expire."
- **Model:** premium for the reaction interrupt contract; standard per condition.
- **Clarify first:** *resolved 2026-06-11.* **(a) Conditions:** frightened, prone, stunned, slowed, persistent damage — everything else deferred. **(b) Attack of Opportunity — HOUSE RULE, diverges from PF2e RAW:** every combatant holding a melee weapon threatens (not Fighter-only), limited to one reaction per round (resets at the entity's turn start, per the normal reaction economy). The RAW Fighter-only scoping was offered and declined in favor of stronger XCOM-style zoning both ways. **(c) Reaction UX:** auto-resolve, visible in the combat log; a player-prompt option waits for M20 settings. **(d) Condition sources:** enemies apply conditions (Quay Bruiser slam → prone, Cinder Shade → persistent fire, bosses frighten on hit, marsh stalkers slow); hero-side condition spells wait for M17. Because universal AoO + enemy conditions raise incoming damage, heroes get a **playtest HP cushion** (flagged PROCEDURAL in the overlay; superseded by real M15 leveling) so the systems are testable without instant party wipes.
- **Safe to start:** generalizing the condition framework (duration, value, expiry) from the existing `flat_footed`; initiative roll + re-sorted `turnOrder` (already an array in `state.ts`); deterministic seeded rolls (pattern exists in the resolver).
- **Plan changes made during M10 (delivered beyond / alongside the spec):** `Entity.conditions` stays the frozen M1 bare-id mirror over a new `activeConditions` detail list (value / damage type / dice) — both maintained only in `apply.ts`; post-freeze effect kinds `TickCondition` and `SpendReaction` extend `AnyEffect` with their own contract tests; initiative rolls are **stored on the initial state** (not events) because `replayEvents` starts from the caller's initial state — `CombatSession` keeps the seed; the Reactive Strike **trigger is scoped to leaving the reactor's reach** (RAW also triggers on movement within reach, manipulate actions, and ranged attacks in reach — deferred, flagged `m10_aoo_trigger_subset`); per RAW a move trigger is **not disrupted** — damage resolves and the move completes, except a downed mover stops at the trigger square; enemy on-hit condition riders (`onHitCondition`) are content data, and Reactive Strikes carry them too; **Stand** is a new 1-action combat action (Crawl deferred); persistent damage ticks ride normal `Damage` effects so M9 weakness/resistance applies for free.

## M11 — Line of sight, cover + friendly fire
**Goal:** ranged combat respects the map — line of sight/effect, angle-aware cover, and area effects that walls block and cover mitigates.
- **Difficulty:** medium. Grid geometry is well-trodden; the rules decisions matter more than the math.
- **You can try:** a wall blocks Ray of Frost and bow shots entirely (no target reticle without line of effect); shooting past a cart or low rubble shows a half-cover AC bonus in the hover inspector; a target tucked behind a corner can't be hit at all, gains only half cover as you sidestep and open the angle, and stands exposed once the line is clear; an ally in the firing line grants the enemy lesser cover (+1 AC); Breathe Fire's cone stops at walls, and a target behind a cart saves against it at +2; enemy AI stops shooting through walls.
- **Loop self-check:** LoS and cover are pure core functions on `MapGrid` with table-driven tests (corner cases literally — corners, diagonals, adjacent walls); cover feeds AC, Reflex-vs-area saves, and the cone template through the same functions; inspector shows the same cover math the resolver uses.
- **Stop signal:** "M11 done. Get a shot blocked, watch corner cover open up as you sidestep, and save against Breathe Fire from behind a cart."
- **Model:** premium for the LoS/cover geometry contract; standard for wiring. *Operationalized as two sessions (see `NEXT_SESSION.md`): Phase A (premium) builds the frozen geometry contract, writes the Phase B handoff, and STOPS; Phase B (standard model) wires resolver/content/renderer against it.*
- **Clarify first:** *resolved 2026-06-12.* **(a) Friendly fire — PF2e RAW, no house rule:** an ally in the firing line grants the target lesser cover (+1 AC); misses never redirect to the ally. The proposed redirect house rule ("a miss caused by the ally's cover bonus strikes the ally") was offered and **declined**. AoE friendly fire from M9 (allies in Breathe Fire's template save and take damage) remains and now interacts with cover. **(b) Cover tiers from existing tileset semantics:** raised props = half cover (+2 AC, PF2e standard cover), walls = full cover; per-tile cover data on `MapGrid` sourced from pack tilesets via the validator — no new per-prop authoring. **(c) Corner-aware cover gradient (replaces the binary full-cover question):** no shooting through walls, ever — but wall cover is angle-dependent. A fully occluded target has no line of effect and cannot be targeted (no reticle); a partially occluded target (corner peeking) has half cover (+2 AC); a clear line means no cover from walls. Implemented as corner-occlusion sampling (attacker's best corner against the target tile's corners: all rays blocked = no line of effect, some blocked = half cover, none = open). Raised props never block targeting; they only grant their cover tier. **(d) Area effects are in scope:** line of effect applies to AoE — Breathe Fire's cone does not extend through walls (closes `m9_cone_line_of_effect`), and per RAW standard cover grants +2 circumstance to Reflex saves against area effects ("cover helps against a fireball"). `m10_aoo_trigger_subset` (the deferred RAW Reactive Strike triggers beyond leaving-reach: manipulate actions, ranged attacks while in reach, movement within reach) is unrelated to LoS and stays deferred to M12.
- **Safe to start:** tile-to-tile LoS function with tests; `MapGrid` cover field + pack validator extension; hover-inspector cover readout (inspector already computes from core math).
- **Plan changes made during M11 (delivered beyond / alongside the spec):** melee Strikes respect cover and line of effect too (RAW); **Heal requires line of effect** to the ally; sealed diagonal wall corners block shots (zero-width gaps don't leak) while a single open wall corner still allows diagonal melee targeting at standard cover — both pinned in the frozen geometry tests; the pack validator gained `raised > 0 requires blocked`; per-tile cover flows `ResolvedBattleMap.cover → InitialStateConfig.coverTiles → MapGrid.cover`, and legacy maps/saves keep blocked-as-wall semantics. **Gate-2 caveat (accepted 2026-06-12):** the shipped battle maps rarely stage freestanding walls between spawns and firing lines, so corner-aware *wall* cover is hard to exercise in play — accepted on the frozen contract tests plus prop/creature cover, which do show. **WATCH ITEM:** stage wall-cover sightlines (interior walls, doorways, L-corners near spawns) in the next battle-map content pass — M17 at the latest.

## M12 — Smart tactical AI
**Goal:** enemies that use everything M9–M11 built — cover, focus fire, conditions, range — per-archetype, replacing the greedy strike-or-step policy.
- **Difficulty:** hard — the hardest single item on the board, which is why its dependencies were cleared first.
- **You can try:** skirmishers kite to cover and shoot the squishiest reachable hero; bruisers body-block corridors and trigger AoOs deliberately; enemy casters open with save-targeting debuffs; wounded enemies pull back behind cover; each archetype reads differently within a couple of turns.
- **Loop self-check:** AI is a pure core function `(state) → Action` riding the normal pipeline — no privileged mutation, no hidden state; scripted scenario tests assert behavior properties ("never shoots through full cover", "prefers flanking when reachable", "focuses lowest effective HP"); a full AI-vs-AI fight replays deterministically from the event log.
- **Stop signal:** "M12 done. Lose a fight you'd have won against the old AI, and say why the enemy played well."
- **Model:** premium for the utility-scoring framework and behavior contracts; standard per archetype profile. *Operationalized as two sessions (see `NEXT_SESSION.md`): Phase A (premium) builds the scoring framework + behavior contracts and closes the AoO trigger subset, then writes the Phase B handoff and STOPS; Phase B (standard model) authors the archetype profiles against it.*
- **Clarify first:** *resolved 2026-06-12.* **(a) Band: punishing, uniform — play to win.** No authored signature weaknesses, no per-encounter difficulty tags (difficulty knobs wait for M20; escalation is M13's job). **(b) Future-proofing is an architecture REQUIREMENT:** the rules will keep moving under the AI (new spells, weapon switches at M14, and possibly a movement-economy change — more tiles per AP or movement decoupled from actions). The AI must therefore enumerate legal candidate actions *generically* from the core's own legality/cost rules (never a hand-maintained action list) and score predicted outcomes per effect family, so a new action type needs at most a new scorer — never a rewrite; no hardcoded 3-AP / 1-tile-per-AP assumptions anywhere in AI code. **(c) Full map knowledge**, but all target enumeration goes through one `perceivableTargets` seam so future stealth skills / concealment magic (M16/M17) can filter it — being overcome by stealth or magic must stay possible without an AI rewrite. **(d) Close `m10_aoo_trigger_subset` at full RAW, symmetric:** Reactive Strike also triggers on ranged attacks in reach, manipulate actions in reach (spellcasting — Ray of Frost / Heal / Breathe Fire carry the manipulate trait per their vendored SRD), and move actions in reach (Stand; Step is exempt per RAW), with crit-disruption of manipulate casts; applies to heroes too under the universal-AoO house rule. Mitigation belongs to skills/feats ("battle casting") — recorded for M15's feat subset.
- **Safe to start:** utility-scoring skeleton replacing `chooseEnemyAction` (enumerate legal actions → score → pick), with the current greedy policy as the baseline profile; the headless scenario-test harness — both are pure-core and renderer-free.
- **Delivered (2026-06-12):** Phase A (premium, `2fb1a44`) — utility-scoring framework, frozen behavior contracts (`tests/contract/ai-behavior.test.ts`), RAW Reactive Strike closure (`tests/contract/reactions-raw.test.ts`). Phase B — four archetype profiles as data (`skirmisher`/`bruiser`/`caster`/`wounded`), wired into both packs (new enemy `caster` role + Spire Adept / Mire Chanter; cowardly looters and bog stalkers → `wounded`), renderer/log/overlay (crit cast-disruption log line; `m12_tactical_ai` + `m12_raw_reactions` overlay flags), and a wall-cover chokepoint on Watcher's Bridge (closes the M11 wall-cover watch item). 290 tests green / 51 files, build clean, contract files untouched. **Gate 2: NOT yet human-tested — playtest deferred 2026-06-12.**

## M13 — Strategic pressure, campaign AI + win/lose
**Goal:** the reclamation loop becomes a war — the enemy pushes back on a clock, and the campaign can be won and lost.
- **Difficulty:** hard. New simulation layer over the campaign state, and the game's first real pacing/balance problem. Independent of M9–M12 — may be built earlier or in parallel if combat depth stalls.
- **You can try:** travel and rest advance a visible campaign clock; held sites come under threat and fall back to hostile if ignored (with a warning window to respond); pressure escalates the longer the campaign runs; reclaiming everything (or a defined story objective) wins the campaign with a real ending screen; losing your foothold (or party wipe under permadeath later) loses it.
- **Loop self-check:** the clock and every counterattack ride the campaign event pipeline (`campaign-apply.ts`) — deterministic, serialized, replayable; strategic AI is a pure function over campaign state; win/lose detection has contract tests; old saves migrate (campaign serialize version bump).
- **Stop signal:** "M13 done. Ignore a threatened site and lose it; push through and see the victory screen."
- **Model:** premium for the campaign-clock contract and strategic AI; standard for UI.
- **Clarify first:** what winning *means* in the Emberwatch fiction (all districts held? a final site/boss? — story decision, ties into M16); what the clock ticks on (travel steps? per fight? real days are out); can safe havens fall (proposal: threatened but never permanently lost — Battle Brothers-style harshness is a dial); how punishing recapture is (full re-fight vs weakened garrison fight).
- **Safe to start:** campaign clock + `SiteThreatened` / `SiteRetaken` events through the existing pipeline; data-driven scheduled raids (escalation table) as the v1 "AI" before anything smart; win/lose state detection + screens.
- **Note (2026-06-12) — approached DESIGN-FIRST.** Per the human, M13 is where the *high-level core loop* lives — "the thing that makes the game good, or not." Before any code, a dedicated **design Q&A session** (premium) interrogates the core fantasy and loop, decides what winning/losing *means*, what the clock ticks on, how harsh setbacks get, and whether the answer reorders the roadmap. Only once those are locked and human-signed-off does the M13 contract/implementation brief get written. The "Clarify first" questions above are the *starting* agenda, not the whole of it. See `NEXT_SESSION.md`.

## M14 — Equipment, inventory, loot + economy
**Goal:** items exist — gear slots drive combat stats, fights drop loot, gold buys gear at safe havens. The reward loop.
- **Difficulty:** hard. Wide surface: core data model, derivation rewrite, loot tables, shop UI, serialization, balance. No dependency on M9–M13.
- **You can try:** each hero has weapon / armor / 2 trinket slots; swap the Fighter's shortbow for a looted longbow and watch the inspector numbers change; win a fight and pick up dropped loot; sell it at Fishrow Market and buy armor with the gold; the party sheet shows a shared inventory.
- **Loop self-check:** items are core data validated like everything else; `derive.ts` reads equipped items (the fixed `defaultWeapon` class kit becomes just the starting loadout); party + inventory round-trip through campaign serialize; loot tables live in content packs and pass the pack validator; shop math (buy/sell/gold) headless with contract tests.
- **Stop signal:** "M14 done. Loot a weapon, equip it, see the numbers move, sell the rest, buy armor."
- **Model:** premium for the equipment/derivation contract; standard for shop + UI.
- **Clarify first:** depth target — lightweight slots (weapon/armor/trinkets, proposal) vs BG-style paper-doll vs Battle Brothers grid+durability; magic items and item identification in or out (proposal: out until M17); encumbrance (proposal: no); price model and gold curve (needs a balance pass with M15's XP curve).
- **Safe to start:** item types + equipment slots in core with validation; `derive.ts` refactor from `defaultWeapon` to equipped-weapon (mechanical, well-tested already); serialize round-trip; loot-table schema in the pack validator.

## M15 — Progression: XP + levels
**Goal:** characters grow — XP from fights and objectives, PF2e leveling with visible choices at level-up.
- **Difficulty:** medium-hard. The math is SRD-defined; the cost is content (feats/spells per level) and the level-up UI. Pairs naturally with M14 — both rewire character derivation.
- **You can try:** winning fights banks XP; at level-up a screen offers the level's choices (HP, proficiency steps, ability boosts, new spell for the Wizard, feat picks from a scoped list); a level-3 party visibly outclasses the level-1 encounters that used to be hard.
- **Loop self-check:** XP accrual is computed from the campaign event log (no new mutation path); leveling math validates against the vendored SRD; a leveled character round-trips serialize; derivation tests cover each level band.
- **Stop signal:** "M15 done. Level the party to 3, make real choices on the way, feel the power difference."
- **Model:** standard; premium only if feat interactions get hairy.
- **Clarify first:** level band for this pass (proposal: 1–5 — feat/spell content grows fast per level); XP sources and weights (combat only, or site-cleared/quest bonuses); the feat subset per class (SRD vendoring task, like M2/M7 — *must include AoO-mitigation options, e.g. steady-spellcasting / point-blank-style feats, per the M12 resolution that full RAW Reactive Strike triggers land with skill-based counters here*); retraining/respec (proposal: out).
- **Safe to start:** XP accrual from existing victory events; `level` on the character model + derivation scaling per SRD; level-up screen reusing the creation screen's point-allocation UX.

## M16 — Story, quests, dialogue + skill checks
**Goal:** the BG-shaped layer — an authored campaign arc that advances with reclamation, side quests, dialogue with choices, and trained skills that finally roll dice.
- **Difficulty:** medium-hard as a system; the real cost is authored content. Depends on M14/M15 so quests can pay XP, loot, and gold; ties into M13's win condition.
- **You can try:** a main questline advances as districts flip to held, told in dialogue scenes with real choices; NPCs at safe havens offer side quests with stakes and rewards; a locked vault yields to a Thievery check, a nervous informant to Diplomacy — visible rolls using the skills picked at creation; a journal tracks active and finished quests.
- **Loop self-check:** quest state is a machine on campaign state driven by campaign events (replayable, serialized); skill checks resolve headless in core per SRD (roll + proficiency vs DC) with contract tests; dialogue content lives in content packs and passes the validator; the narrator seam is unchanged — story beats still consume the event log.
- **Stop signal:** "M16 done. Take a side quest, pass a skill check you built for at creation, finish a story chapter."
- **Model:** premium for the quest-state contract; standard for content wiring. Story *text* is authored content — outline needs human sign-off before the loop writes prose.
- **Clarify first:** the story itself — premise, chapter beats, and ending(s) need a human-approved outline (biggest open item on the whole board; also settles M13's win fiction); dialogue depth (proposal: choice cards with consequences, not full branching trees); do failed skill checks block content or route it (proposal: route, never hard-block); runtime LLM narrator stays out of scope?
- **Safe to start:** skill-check resolution in core (SRD math, mirrors the attack resolver); quest state machine + journal model on campaign events; dialogue-scene schema in the pack validator. Content waits on the outline.

## M17 — Bestiary + spell breadth
**Goal:** content width on the finished rules — a real monster roster and fuller spell lists that *use* saves, conditions, resistances, and cover.
- **Difficulty:** medium. Each entry is the proven add-action/add-effect pattern; the volume is the work. Wants M9/M10 (saves, conditions) so monsters have real abilities; magic items fold in here on M14's item system.
- **You can try:** distinct enemy families (undead that shrug off frost, swarms weak to area damage, cultist casters who debuff, a boss with phases) spread across the districts by theme; Wizard and Cleric pick from 2–3 real spells per level; enemy casters answer in kind; the first magic items drop.
- **Loop self-check:** every monster ability and spell ships with its contract test on the existing pipeline (no new mutation paths); bestiary entries live in content packs and pass the validator; resistance/save/condition hooks from M9/M10 are exercised, not bypassed.
- **Stop signal:** "M17 done. Fight three enemy families that demand different tactics, and cast a new spell per caster."
- **Model:** standard throughout — this is the milestone the `add-effect` / `add-action` candidate skills were named for.
- **Clarify first:** the roster brief (which families, how many, boss count — content decision); the spell list per class (SRD vendoring + scope sign-off); magic-item power band.
- **Safe to start:** nothing blocked once M9/M10 land — pick any roster entry and run the pattern; the SRD vendoring checklist can be prepared earlier.

## M18 — Figurines, facing + combat animations *(subsumes old M10)*
**Goal:** the tactical board comes alive — a figurine per character, NPC, and monster that shows its gear and faces the way it's heading, with real attack and spell animations.
- **Difficulty:** medium code, heavy asset pipeline — kept late on purpose (art last, behind the seam), and gear-reflective looks need M14.
- **You can try:** every combatant is a readable figurine (GLB via Tripo/Meshy) instead of a box; figures turn to face movement and attack targets; the Fighter's looted longbow is visibly in hand after equipping (weapon swap at minimum); strikes, Ray of Frost, Heal, and M17 spells each get distinct cast/projectile/impact animations; downed figures slump.
- **Loop self-check:** all character/prop assets load via `GLTFLoader` from the manifest (pack-swappable like M8 maps); facing and animation state are renderer-derived from the event log — not one line of core code changed, frozen contract tests untouched; missing models fall back to flagged placeholder boxes per the standing rule.
- **Stop signal:** "M18 done. Watch a fight and enjoy it — figures face, swing, cast, and fall."
- **Model:** N/A for asset generation (out-of-loop tools, asset-tool MCPs); standard for loader/animation wiring.
- **Clarify first:** is facing *mechanical* (rear attacks count as flanking?) or visual-only — if mechanical it's a core rules change that belongs back in M10/M11, decide before building (proposal: visual-only; flanking is already positional); gear-visibility depth (weapon-in-hand only, proposal, vs armor tiers changing the silhouette); art style guide + generation pipeline; animation set per action (one generic cast vs per-spell).
- **Safe to start:** facing as a renderer concern derived from last move/strike direction (zero core change — could even ship early on the placeholder boxes); manifest plumbing for per-class/per-monster GLB ids; animation-event mapping from the existing combat event log.

## M19 — Roster, injuries, rest + recovery
**Goal:** the Battle Brothers layer — a roster bigger than the deployed four, recruitment at safe havens, lasting injuries, optional permadeath, and a rest/camp system that ties recovery to M13's clock.
- **Difficulty:** medium. Mostly composition of existing systems (creation flow, campaign clock, slots/HP).
- **You can try:** hire a recruit at Fishrow Market into a roster of up to ~8 and pick 4 to deploy per fight; a hero downed in battle survives with an injury that needs downtime to heal; resting at a safe haven (or camping on the road, riskier) recovers HP, spell slots, and injury timers — but advances the campaign clock while the enemy moves; an optional permadeath toggle makes downed-and-unrecovered heroes die for good, replaceable only by recruits.
- **Loop self-check:** roster/deployment/injury state is core campaign data, serialized and replayable; rest rides the campaign clock pipeline from M13; injury effects ride the condition framework from M10; recruitment reuses creation validation; permadeath is a campaign flag with contract tests on both settings.
- **Stop signal:** "M19 done. Get a hero wounded, bench them to heal, hire and deploy a replacement, and feel the clock cost."
- **Model:** standard.
- **Clarify first:** permadeath default (proposal: off by default, chosen at campaign start, no mid-run switch); roster cap and hiring cost curve (ties to M14 gold); injury severity model (proposal: 2 tiers — bruised heals on any rest, wounded needs safe-haven downtime); does camping on the road invite ambush encounters?
- **Safe to start:** rest action recovering HP/slots (slots exist from M9); roster + deployment data model with serialize round-trip; recruitment screen reusing the creation screen.

## M20 — QoL: audio, save slots, difficulty + settings
**Goal:** the expected-everywhere layer — music and SFX, multiple saves with autosave, difficulty settings, an options menu.
- **Difficulty:** low. Deliberately last; every earlier milestone makes its knobs and hooks more meaningful.
- **You can try:** ambient music per map layer and combat stings, SFX for strikes/spells/UI; three+ save slots plus rotating autosave (on travel and combat end) with load-from-menu; difficulty chosen at campaign start (scales encounter strength and M13 pressure pacing); an options menu with volume sliders, animation-speed toggle, and the permadeath flag from M19.
- **Loop self-check:** audio assets ride the manifest/content-pack seam (badged placeholders when missing, per the standing rule); save slots wrap the existing campaign serialize (slot management is pure renderer/storage — core unchanged); difficulty is campaign data consumed by encounter building and M13 pacing, contract-tested at each setting; narrator/audio toggles change nothing mechanical.
- **Stop signal:** "M20 done. Hear it, save in three slots, lose an autosave-recovered fight on hard."
- **Model:** standard. Audio *content* is out-of-loop sourcing like art.
- **Clarify first:** audio sourcing (generated? licensed packs? — budget/taste call); difficulty knobs (proposal: enemy count + strategic-pressure pacing, never flat damage cheats); web-only `localStorage` saves or file export too?
- **Safe to start:** save-slot management over the existing serialize (could ship today); autosave hooks on travel/combat-end events; options-menu shell. Audio waits on sourcing.

---

### Standing rules (all milestones)
- Two gates: tests for the loop, a playable artifact for you. Stop and report at the second.
- Never touch `/tests/contract`. One milestone per loop. Don't work ahead.
- Keep it simple — no complexity before a milestone needs it. Tests must be real (meaningful assertions; periodic Stryker mutation audit on the core), run every loop.
- Interface is usable and legible on placeholders from M1; everything mocked is flagged in the dev overlay.
- Never block on a missing asset — flagged placeholder + a row in `ASSETS_NEEDED.md`.
- Rules core stays headless. Implement PF2e rules from the vendored SRD, never from memory.
- No Paizo setting IP, no copied map layouts, ever.
