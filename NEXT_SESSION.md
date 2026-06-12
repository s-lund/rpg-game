# Next session prompt (copy into a new chat)

M11 is DONE and human-accepted (2026-06-12, commits `0399715` Phase A + `d495164` Phase B). M12 is split into **two sessions** like M11: Phase A (premium model — utility-scoring framework, behavior contracts, RAW AoO trigger closure) and Phase B (standard model — archetype profiles, content, renderer). Run Phase A first; it ends by rewriting this file into the concrete Phase B handoff. Do not run Phase B until this file says PHASE B.

## PHASE A — premium model (AI framework + behavior contracts + RAW reactions)

```
Continue EMBERWATCH development. Read AGENTS.md, ARCHITECTURE.md, ROADMAP.md, and PROGRESS.md first.

State: M0–M11 are DONE and human-accepted. This is M12 PHASE A: the pure-core utility-scoring AI framework, its frozen behavior contracts, and the RAW Reactive Strike trigger closure ONLY — no archetype personality profiles, no content tuning, no renderer work beyond nothing. Phase B (standard model) authors the per-archetype profiles from the handoff you will write.

M12 decisions are RESOLVED (2026-06-12, recorded under M12 in ROADMAP.md — do NOT re-ask):
  (a) Band: PUNISHING, uniform — play to win. No authored signature weaknesses, no per-encounter
      difficulty tags (difficulty knobs are M20, escalation is M13).
  (b) Future-proofing is an architecture REQUIREMENT, not advice: the rules will keep changing under
      the AI (new spells in M17, weapon swaps in M14, and possibly a movement-economy change — more
      tiles per AP, or movement decoupled from actions). Candidate actions must be enumerated
      generically against the core's own legality/cost rules (resolve's checks, findStepPath, range,
      slots, conditions) — NEVER a hand-maintained "strike or step" list. One generator + one scorer
      module per action family, registered in exactly one place; adding a future action kind must mean
      adding one module, not editing the engine. No hardcoded 3-AP or 1-tile-per-AP assumptions in any
      AI code — read costs from core.
  (c) Full map knowledge — but ALL target enumeration flows through a single perceivableTargets(state,
      actorId) seam, so future stealth skills / concealment magic (M16/M17) can filter it without an
      AI rewrite. Today it returns all living opposing entities.
  (d) Close m10_aoo_trigger_subset at FULL RAW, symmetric (heroes provoke too, per the M10 universal-
      AoO house rule): Reactive Strike triggers on (1) leaving reach during a move — already shipped;
      (2) ranged attacks made while in reach; (3) manipulate actions in reach — our three spells
      (Ray of Frost, Heal, Breathe Fire) all carry the manipulate trait per their vendored SRD pages,
      so casting in reach provokes; (4) move actions in reach (Stand provokes; Step is explicitly
      exempt per RAW). Crit hits DISRUPT manipulate actions per RAW: the cast is lost (AP and spell
      slot still spent), the reaction Strike resolves first. Skill/feat mitigation ("battle casting")
      is deliberately M15 — do not build it.

STEP 0 — Baseline. npm run test (expect 258 green across 47 files) and npm run build (clean) before
changing anything. Node 24 is on PATH on this machine (big10).

STEP 1 — Vendor SRD deltas under rules/srd/ BEFORE implementing (Archives of Nethys, never memory):
  - step.md: the Step action, especially its "doesn't trigger reactions" clause (the exact sentence).
  - Verify/extend spell-ray-of-frost.md and spell-heal.md to record their trait lines (manipulate is
    the load-bearing one); spell-breathe-fire.md already lists its traits.
  - reactive-strike.md already vendors the full RAW trigger + disruption text — extend its "M10
    scope" section into an "M12 scope" section: trigger subset closed, crit-disruption now modeled,
    availability house rule unchanged.
  - Create rules/srd/m12-subset.json extending m11-subset.json (bump version, keep all M11 values
    identical — subset.ts alias pattern). Update houseRules.reactiveStrike.triggers to the full RAW
    list and drop the M10 subset note; add spell trait arrays under spells.* so the manipulate check
    is data, not code.

STEP 2 — RAW reaction triggers in core (closes m10_aoo_trigger_subset). Find the M10 reaction
machinery (search reactionAvailable / SpendReaction in src/core/actions/resolve.ts and
src/core/effects/). Add the three new triggers; reaction resolution stays the M10 pattern (normal
pipeline effects, auto-resolved, once per round). Disruption: when the reaction Strike crits a
manipulate-trait cast, the cast's spell effects are dropped — AP spend and slot spend still happen
(RAW: the action is lost), and the disruption is visible in the event payload for the combat log.
Ordering: the reaction resolves BEFORE the triggering action's effects. Contract tests (NEW files in
tests/contract/, e.g. reactions-raw.test.ts): shooting in reach provokes (both directions); casting
each spell in reach provokes; Stand provokes; Step never provokes; a non-crit reaction does not stop
the cast; a crit reaction disrupts the cast (slot spent, no damage/heal events); downed-by-reaction
caster never casts; one reaction per round still holds. Replay must reconstruct identical state.

STEP 3 — AI scoring framework (THE premium work), pure core in src/core/ai/:
  - chooseEnemyAction(state, actorId) keeps its exact signature (renderer/session wiring untouched)
    but becomes: enumerate → score → pick.
  - Candidate generators per action family (strike, cast, move/step, stand, end-turn), each deriving
    legality and cost from the SAME core functions the resolver uses — never duplicated rules. Movement
    candidates come from findStepPath-reachable tiles within current AP.
  - Scorers predict expected value with the SAME pure helpers the inspector uses (estimateHitPercent,
    damageBand, estimateSavePercent, evaluateCover, coverAcBonus) — the M9/M11 shared-math pattern.
    Score components the punishing band needs: expected damage now, kill-securing (finishing a target
    outweighs spreading damage), focus on lowest effective HP through the perceivableTargets seam,
    cover sought when ending the turn in enemy ranged sightlines, AoO economy (provoking is a cost:
    Step-then-shoot beats shoot-in-reach when both are legal; baiting an already-spent reaction is
    free), flanking positioning for melee.
  - Deterministic: pure function of state, stable tie-breaking (document the order), NO RNG — replay
    needs no AI events, an AI-vs-AI fight replays identically from the event log.
  - Profile parameter schema (weights/toggles per scorer) defined and threaded now, with one shipped
    "baseline" profile = the punishing default; Phase B authors per-archetype profiles as DATA against
    this schema. Entities/encounters reference profiles by id (content wiring is Phase B).
  - Scenario-test harness: headless scripted boards (reuse the ASCII-grid helper pattern from
    tests/contract/los-cover.test.ts) asserting behavior PROPERTIES, frozen in tests/contract/
    (e.g. ai-behavior.test.ts): never targets without line of effect; steps out of reach before
    shooting when AP allows; finishes a kill over spreading damage; focuses lowest effective HP;
    moves toward unreachable targets instead of idling; prefers a cover tile over an open tile when
    both reach the same shot; never assumes more AP than the entity has (test with a slowed entity).

STEP 4 — Phase A gate: full suite green (all frozen contract tests untouched), build clean. The HP
cushion (m10_hp_cushion) STAYS — punishing AI lands before M15 leveling, the cushion is what keeps
it survivable.

STEP 5 — Write the Phase B handoff: REPLACE this file's contents with a PHASE B prompt for a standard
model containing: the exact exported framework API (generator/scorer registration, profile schema,
perceivableTargets seam); the archetype profile briefs as data-authoring tasks (skirmisher: kite to
cover + shoot the squishiest reachable hero; bruiser: corridor-blocking, body-block chokepoints,
deliberate AoO zoning; caster: save-targeting debuff opener then damage — needs enemy casters in
content; wounded: pull back behind cover when below a threshold); content wiring (archetype → profile
id in both packs); renderer/log/overlay (combat-log line when a cast is disrupted; overlay: remove
m10_aoo_trigger_subset, add m12_tactical_ai + m12_raw_reactions; M12 console banner); the playtest
staging requirement (at least one early encounter where each archetype's behavior is readable within
two turns); the M12 gate-2 checklist with stop signal "M12 done. Lose a fight you'd have won against
the old AI, and say why the enemy played well."; and the key-architecture list below verbatim. Then
commit Phase A and STOP — do not author profiles. Phase A stop signal (print this to the human):
"M12 Phase A done — AI scoring framework + behavior contracts frozen, RAW reactions closed (N tests
green, build clean). Enemies already play the punishing baseline; per-archetype personality is Phase
B. SWITCH TO A CHEAPER/STANDARD MODEL for the next session and paste the PHASE B prompt from
NEXT_SESSION.md."

Key architecture (do not regress):
- src/core stays pure and headless; renderers are read-only event-log/state consumers; referential integrity by ID.
- One Effect → one Event; state mutates only via apply(); new effect kinds extend AnyEffect (never the frozen Effect union / ALL_EFFECT_KINDS) and need effectFromEvent replay cases + their own contract tests. (Disruption should NOT need a new effect kind — dropping a disrupted cast's effects happens at resolution, before effects exist; verify against the frozen pipeline test.)
- The AI is a pure function (state) → Action riding the normal pipeline — no privileged mutation, no hidden state, no RNG; replay never needs AI events.
- Entity.conditions is the frozen M1 bare-id mirror over activeConditions — both maintained ONLY in apply.ts (M10 pattern).
- Initiative comes from a seed on CombatSession; replay rebuilds the initial state with the same seed — never emit initiative events.
- Cover/LoS math lives ONLY in src/core/combat/los.ts — AI, resolver, and inspector all call the same helpers (M11 pattern).
- Never block on missing art: flagged placeholder + ASSETS_NEEDED.md row.

One phase per loop. Do not work ahead into Phase B.
```

## PHASE B — standard model (archetype profiles, content, renderer)

Written by Phase A in STEP 5. If this section still says only this line, Phase A has not run yet.
