# Next session prompt (copy into a new chat)

M12 **Phase A is DONE** (2026-06-12): the utility-scoring AI framework, its frozen behavior contracts, and the RAW Reactive Strike trigger closure are committed — 280 tests green across 49 files, build clean. Enemies already play the punishing baseline. This file is now the **PHASE B** handoff: a standard-model session that authors per-archetype personality as DATA against the Phase A framework, wires it into content, and finishes the renderer/log/overlay surface. Do not redesign the framework.

## PHASE B — standard model (archetype profiles, content, renderer)

```
Continue EMBERWATCH development. Read AGENTS.md, ARCHITECTURE.md, ROADMAP.md, and PROGRESS.md first.

State: M0–M11 are DONE and human-accepted; M12 Phase A (premium) is committed — AI scoring framework,
frozen behavior contracts (tests/contract/ai-behavior.test.ts), RAW reaction triggers closed
(tests/contract/reactions-raw.test.ts). This is M12 PHASE B: author archetype AI profiles as DATA,
wire them into both content packs, and ship the renderer/log/overlay polish. NO framework redesign,
NO new scorer components unless a profile brief literally cannot be expressed (escalate to the human
instead of improvising). NEVER touch tests/contract/.

STEP 0 — Baseline. npm run test (expect 280 green across 49 files) and npm run build (clean) before
changing anything. (Node 24: on this machine npm may not be on the shell PATH — it lives at
%LOCALAPPDATA%\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_*\node-v24.16.0-win-x64; prepend to PATH.)

THE PHASE A FRAMEWORK API (all pure core, exported from src/core/index.ts):

  - chooseEnemyAction(state, actorId): Action | null — unchanged signature; renderer already wired.
    Delegates to chooseAiAction (src/core/ai/choose.ts), which works for EITHER team (AI-vs-AI tests
    drive heroes through it). Deterministic: pure function of state, no RNG, stable tie-breaking
    (registry order strike → cast → move → stand → end-turn, then each family's internal order;
    first candidate at the maximum total wins — documented in ai/choose.ts).
  - enumerateAiCandidates(state, actorId, profileId?): ScoredAiCandidate[] — every candidate with
    its score/total/endTile; use it for debugging profiles, never re-implement scoring.
  - Profile schema (src/core/ai/profile.ts): AiProfile { id, label, weights: AiWeights, retreat?:
    AiRetreat }. AiWeights components (all documented in the file): expectedDamage, killSecure,
    focusFire, expectedHealing, aooRisk, coverSeek, meleeZoneAvoid, approach, flank, standUp.
    AiRetreat { hpFraction, approachMultiplier, coverSeekMultiplier } — below hpFraction of max HP,
    approach is multiplied by approachMultiplier (negative = pull back) and coverSeek by
    coverSeekMultiplier. BASELINE_PROFILE is the shipped punishing default; AI_PROFILES is the
    registry — adding a profile is one data entry there, nothing else.
  - Entity.aiProfileId / EntityBlueprint.aiProfileId (optional string) is already threaded through
    state creation; absent → "baseline". Content sets it per archetype.
  - perceivableTargets(state, actorId) (src/core/ai/perception.ts) is the target-enumeration seam —
    do not bypass it anywhere.
  - Action families live in src/core/ai/families/* and are registered ONLY in src/core/ai/registry.ts.
    A new action kind in the future = one new family module + one registry line. You should not need
    to touch these for Phase B.
  - Reaction predicates shared by resolver and AI: src/core/combat/reactions.ts
    (meleeReactorsInReach, moveReactionTriggers, canReact, isManipulateSpell).
  - Movement enumeration: reachableStepTargets (src/core/combat/path.ts) — resolver-identical
    passability/cost. Expected-value helpers: estimateHitPercent/damageBand (combat/attack.ts),
    expectedBasicSaveFactor (combat/save.ts), evaluateCover/coverAcBonus (combat/los.ts).

STEP 1 — Author archetype profiles as DATA in src/core/ai/profile.ts (AI_PROFILES), tuning weights
relative to BASELINE_PROFILE. Add a small unit test per profile (tests/unit/, NOT contract) showing
its signature behavior on a scripted board (reuse the terrain()/enemyActs() helper pattern from
tests/contract/ai-behavior.test.ts). Briefs:
  (a) "skirmisher" — kite to cover and shoot the squishiest reachable hero: coverSeek and
      meleeZoneAvoid well above baseline, focusFire up, aooRisk up a touch (disengages early),
      retreat { hpFraction ~0.4, approachMultiplier ~-1, coverSeekMultiplier ~2 }.
  (b) "bruiser" — corridor-blocking, body-block chokepoints, deliberate AoO zoning: meleeZoneAvoid
      at or below 0 (standing in hero reach is the job), aooRisk low (provoking is acceptable),
      approach and flank up, killSecure up. No retreat — bruisers die forward.
  (c) "caster" — save-targeting debuff opener then damage. NOTE: no enemy casters exist in content
      yet, and hero spells are the only spells in the rules subset. Scope honestly: give the profile
      expectedDamage/aooRisk emphasis suited to a backline caster (high aooRisk, high coverSeek,
      meleeZoneAvoid high) and wire it to a NEW enemy caster archetype only if you also give that
      archetype a castable spell from the existing subset (e.g. knownSpells: ["ray_of_frost"] plus
      spellAttackBonus/spellDc on the blueprint — the cast family already generates and prices
      these). Real debuff spells are M17; do not invent new spell mechanics.
  (d) "wounded" — pull back behind cover below a threshold: baseline weights plus retreat
      { hpFraction ~0.5, approachMultiplier ~-1.5, coverSeekMultiplier ~2.5 }. This is a PROFILE,
      assignable to any archetype; in content use it where the fiction fits (e.g. marsh stalkers).

STEP 2 — Content wiring in BOTH packs (src/content/emberwatch/encounters.ts has the foe() factory
with FoeRole = melee | skirmisher | bruiser | boss; mirrormarsh has its own pack.ts): map role →
aiProfileId on the EntityBlueprint (skirmisher → "skirmisher", bruiser → "bruiser", melee/boss →
"baseline" unless a brief fits better). If you add an enemy caster archetype for (c), it needs
spawns in at least one encounter per pack and must pass the pack validator.

STEP 3 — Renderer/log/overlay (read-only consumers; no core changes):
  - Combat log: a line when a cast is disrupted — the reaction Damage event payload carries
    attack_resolution.disruptedCast { spellId, spellLabel } (and .reactionBy for who did it).
    Surface it clearly (e.g. "CRITICAL! The Strike disrupts Heal — the spell is lost.").
    Also log lines for the new provoke reasons read naturally (shooting/casting/standing in reach)
    — the events are ordinary ReactionSpent + DamageDealt, already logged; check wording.
  - Dev overlay: REMOVE the m10_aoo_trigger_subset flag (closed in Phase A), ADD m12_tactical_ai
    and m12_raw_reactions entries; M12 console banner like earlier milestones.
  - Hover inspector: unchanged (cover/save/hit% already shared with the AI's math).

STEP 4 — Playtest staging: ensure at least one EARLY encounter (tier 1–2, reachable in the first
minutes of a campaign) where each shipped archetype's behavior is readable within two turns —
a skirmisher map with props to kite behind, a bruiser corridor/chokepoint, and (if added) a caster
hanging back. Adjust encounter layouts/spawns in content, not core. The M11 WATCH ITEM also applies:
stage wall-cover sightlines where battle maps allow.

STEP 5 — Gate: npm run test fully green (280 + your new unit tests; every tests/contract/ file
UNTOUCHED), npm run build clean. Playtest each staged encounter once yourself headlessly if possible
(AI-vs-AI via chooseAiAction both sides is a fine smoke test).

M12 GATE-2 CHECKLIST (human acceptance):
  - LOOK: skirmishers kite to cover and shoot the squishiest reachable hero.
  - LOOK: bruisers body-block corridors and trigger AoOs deliberately; they don't dither.
  - LOOK: wounded-profile enemies pull back behind cover when hurt.
  - LOOK: shooting or casting next to a melee enemy eats a Reactive Strike; a crit visibly
    disrupts the cast in the combat log (slot lost).
  - LOOK: each archetype reads differently within a couple of turns in the staged encounters.
  - OVERLAY: m10_aoo_trigger_subset gone; m12_tactical_ai + m12_raw_reactions present.
  - TEST: npm run test — all green, contract files untouched.
Then STOP and print the stop signal: "M12 done. Lose a fight you'd have won against the old AI,
and say why the enemy played well."

Known Phase A simplifications you may surface in the overlay but must NOT "fix" in core:
  - Crit detection exists ONLY to gate manipulate disruption; critical double damage is unmodeled
    game-wide (M1 attack model) — recorded in rules/srd/reactive-strike.md M12 scope.
  - The resolver computes an interrupted action from the pre-action snapshot (HP chains, condition
    riders land after) — documented there too.
  - Move scoring's follow-up lookahead considers weapon strikes and single-target attack spells,
    not cone/heal follow-ups; AoO disruption-risk is priced as damage only. Fine for Phase B
    profiles; note for M17.
  - The AI's kill probability treats damage as uniform over the adjusted min/max band and ignores
    rogue sneak-attack dice (no enemy rogues exist).

Key architecture (do not regress):
- src/core stays pure and headless; renderers are read-only event-log/state consumers; referential integrity by ID.
- One Effect → one Event; state mutates only via apply(); new effect kinds extend AnyEffect (never the frozen Effect union / ALL_EFFECT_KINDS) and need effectFromEvent replay cases + their own contract tests. (Disruption should NOT need a new effect kind — dropping a disrupted cast's effects happens at resolution, before effects exist; verify against the frozen pipeline test.)
- The AI is a pure function (state) → Action riding the normal pipeline — no privileged mutation, no hidden state, no RNG; replay never needs AI events.
- Entity.conditions is the frozen M1 bare-id mirror over activeConditions — both maintained ONLY in apply.ts (M10 pattern).
- Initiative comes from a seed on CombatSession; replay rebuilds the initial state with the same seed — never emit initiative events.
- Cover/LoS math lives ONLY in src/core/combat/los.ts — AI, resolver, and inspector all call the same helpers (M11 pattern).
- Never block on missing art: flagged placeholder + ASSETS_NEEDED.md row.

One phase per loop. M12 ends at the gate-2 checklist above — do not start M13.
```
