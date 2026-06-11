# Next session prompt (copy into a new chat)

```
Continue EMBERWATCH development. Read AGENTS.md, ARCHITECTURE.md, ROADMAP.md, and PROGRESS.md first.

State: M0–M9 are DONE and human-accepted (2026-06-11, 193 tests green, build clean). M9 delivered basic saves, resistance/weakness, prepared spell slots (opt-in enforcement), Breathe Fire (cone + friendly fire), and path-aware Step.

Next milestone: M10 — Initiative, reactions + conditions. Work through these steps IN ORDER.

STEP 0 — Baseline. Run npm run test (expect 193 green) and npm run build (clean) before changing anything. Environment note: Node 24 is installed via winget at C:\Users\sven.lund\AppData\Local\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v24.16.0-win-x64 — if `node` is not on PATH in your shell, prepend that directory. node_modules is already installed.

STEP 1 — Clarify first (BLOCKING: ask the human before any dependent work; present these proposals and wait for answers; record the decisions in ROADMAP.md under M10 like the M9 resolutions):
  (a) Condition subset for this pass — proposal: frightened, prone, stunned, slowed, persistent damage; defer everything else.
  (b) Attack of Opportunity — proposal: PF2e RAW (Fighter-class feature only at level 1; give it to one or two enemy bruiser/boss archetypes so the player FEELS zoning both ways); the "universal AoO for XCOM-style zoning" dial is deferred to M12 AI tuning.
  (c) Reaction UX — proposal: auto-resolve (no mid-turn prompt UI this milestone); a prompt option can come with M20 settings.
  (d) Condition sources for the playtest (testability requirement — every shipped system must be reachable in one normal playtest): proposal — enemies apply conditions this milestone (e.g. Quay Bruiser slam knocks prone, Cinder Shade deals persistent fire, bosses frighten on a hit, marsh stalkers slow), heroes suffer/see them; hero-side condition spells wait for M17 spell breadth. Confirm or adjust the mapping.

STEP 2 — Vendor SRD text under rules/srd/ BEFORE implementing (Archives of Nethys, never from memory; M9 files show the format — quote exact rule text, cite source page, add an "M10 scope" section): initiative rules (what you roll, tie-breaking), each chosen condition's full text, the Fighter's Attack of Opportunity (trigger, effect, one-reaction economy), and persistent damage + the flat check to end it (if chosen). Extend the machine-readable tables as rules/srd/m10-subset.json (copy m9-subset.json forward, bump version; keep all M9 values identical so nothing regresses — subset.ts's M9_SUBSET/M7_SUBSET/M2_SUBSET aliases show the pattern).

STEP 3 — Condition framework in core (PREMIUM design, do this before initiative/reactions; it is the load-bearing piece):
  - Generalize from the bare `flat_footed` string: each condition needs optional value (frightened 2), duration/expiry rule (end of whose turn), and mechanical hooks (penalties to AC/attacks/saves, action loss, persistent damage tick).
  - CRITICAL compatibility constraint: the frozen M1 pipeline test compiles an EXHAUSTIVE switch over Effect["kind"] and constructs ApplyCondition with `condition: "flat_footed"` only. So: do NOT reshape Entity.conditions or the ApplyCondition effect; EXTEND them — add new ConditionId union members, add OPTIONAL fields (value?, duration?) to ApplyCondition, and keep flat_footed's behavior identical. New effect kinds (if any, e.g. a TickCondition) go into AnyEffect in src/core/effects/types.ts, NOT into Effect or ALL_EFFECT_KINDS, each with its own contract test (see ARCHITECTURE.md "Extending the effect union" and M9's SpendSpellSlot as the worked example). Every new event type needs a case in effectFromEvent (engine.ts) or replay silently drops it.
  - Each condition ships a contract test for onset, mechanical effect, and expiry (per the M10 loop self-check). Derivation hooks: penalties must flow through the same math the resolver AND inspector use (inspect.ts already shares attack/save math — keep it that way).
  - Tick-down rides the pipeline: duration decrement/expiry resolve as effects during EndTurn resolution (resolveEndTurn is the natural place — it already emits SetActiveActor; persistent damage ticks emit normal Damage effects, which automatically get M9 resistance/weakness adjustment for free — e.g. drowned mobs resist persistent fire? No: persistent damage is typed, adjustment applies, that is CORRECT and free).

STEP 4 — Initiative (standard tier):
  - Roll initiative at combat start per the vendored SRD; turnOrder becomes the sorted result. Determinism requirement from the loop self-check: "initiative is core state, deterministic from the seed, replayable from the event log." Design recommendation: pass an Rng into createInitialState (or add an explicit StartCombat step) and record the rolls — either stored on initial state (replay gets it free, since replayEvents starts from the initial state) or as InitiativeRolled events; pick ONE, justify it in a comment, and contract-test that a full fight replays identically.
  - CombatSession (renderer bridge) currently builds state without an rng — it will need a seed; keep the seed in the encounter config so world→combat transitions stay deterministic and the campaign can store it.
  - Note: party members no longer always act first — the existing scheduleEnemyTurn logic in main.ts keys off TurnStarted events and should mostly just work, but verify the first turn (createInitialState picks the first ACTIVE actor; if that is now an enemy, the auto-enemy-turn must still kick off — there is an explicit bootstrap branch at the end of beginCombatSession).

STEP 5 — Reactions / Attack of Opportunity (PREMIUM design — the interrupt contract is the hard part):
  - Per the loop self-check: reactions resolve as NORMAL pipeline effects, no side-channel mutation. The M9 Breathe Fire resolver proves one Action may emit effects involving many entities — an AoO can ride the triggering action's resolution the same way: resolveStep (and any future move) detects "actor leaves the reach of an enemy with a ready reaction" along the path (findStepPath in combat/path.ts already returns the full route) and inserts the reactor's strike effects BEFORE the MoveTo.
  - Two design points to settle explicitly (premium attention): (1) event attribution — ApplyContext.actorId is the stepping actor, so the AoO's Damage event needs the reacting entity surfaced (recommendation: a field inside attack_resolution payload or a dedicated reaction marker in the payload; do NOT invent a second apply path); (2) reaction economy — one reaction per round per entity (reactionAvailable on Entity, reset on its turn start, spent via an effect so replay holds).
  - PF2e RAW detail to vendor and respect: AoO interrupts the move at the square where it triggers; if the SRD's disruption rules are too deep for this pass, scope to "damage resolves, move completes" and FLAG the simplification in the dev overlay + ROADMAP note.
  - Edge cases to contract-test: reactor downed mid-batch cannot react; AoO can down the mover (mover's MoveTo still applies or not — decide per the vendored rule); two reactors on one path each fire once; no reaction against Step when the mover never leaves reach.

STEP 6 — Content + renderer (standard tier):
  - Wire the agreed condition sources into the enemy archetype factories (src/content/emberwatch/encounters.ts foe() and mirrormarsh marshFoe() — M9's save/theme options show the pattern). Both packs must show conditions in one playtest.
  - HUD: initiative order strip (who acts next, party + enemy interleaved); condition badges with value/remaining duration on party lines, enemy lines, and the hover inspector; combat log lines for onset ("X is frightened 2"), ticks (persistent damage rolls + flat check), expiry, and AoO ("Y's reaction: ..."). The combat-log formatter is core (narrator/combat-log.ts) — keep renderer read-only.
  - Dev overlay: register flags for anything simplified (e.g. m10_aoo_disruption if move-disruption is scoped out), add M10 acceptance items with LOOK/OVERLAY/TEST proofs (buildAcceptanceItems in main.ts), and update the console.info banner.

STEP 7 — Gate 1. Full suite green (frozen tests in tests/contract/ untouched — never weaken them), npm run build clean. Consider a Stryker run on the new core modules (it was skipped in M9). Then STOP: report the M10 stop signal ("watch initiative interleave, provoke an AoO, land a condition and watch it expire") with the gate 2 checklist split by LOOK / OVERLAY / TEST. Do NOT update PROGRESS.md (gate-2-acceptance only) and do NOT start M11.

Key architecture (do not regress):
- src/core stays pure and headless; renderers are read-only event-log/state consumers; referential integrity by ID.
- One Effect → one Event; state mutates only via apply(); new effect kinds extend AnyEffect (never the frozen Effect union / ALL_EFFECT_KINDS) and need effectFromEvent replay cases + their own contract tests.
- Slot state and HP ride CharacterDraft across world↔combat (applyCombatResultToCampaign) — if conditions/initiative need campaign persistence, follow that pattern and bump serialize handling compatibly (old saves must load).
- Never block on missing art: condition icons can be text/emoji badges; add rows to ASSETS_NEEDED.md and flag in the overlay.

One milestone per loop. Do not work ahead. When M10 gate 1 passes, STOP and report the gate 2 checklist.
```
