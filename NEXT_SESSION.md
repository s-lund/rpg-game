# Next session prompt (copy into a new chat)

M11 is split into **two sessions**: Phase A (premium model — geometry contract) and Phase B (standard model — wiring/content/renderer). Run Phase A first; it ends by rewriting this file into the concrete Phase B handoff. Do not run Phase B until this file says PHASE B.

## PHASE A — premium model (LoS/cover geometry contract)

```
Continue EMBERWATCH development. Read AGENTS.md, ARCHITECTURE.md, ROADMAP.md, and PROGRESS.md first.

State: M0–M10 are DONE and human-accepted (M10 accepted 2026-06-12, committed as cac9e06). This is M11 PHASE A: the pure-core LoS/cover geometry contract ONLY — no resolver wiring, no content, no renderer work. Phase B (standard model) does the wiring from the handoff you will write.

M11 decisions are RESOLVED (2026-06-12, recorded under M11 in ROADMAP.md — do NOT re-ask):
  (a) Friendly fire = PF2e RAW, NO house rule: an ally in the firing line grants the target lesser cover (+1 AC); misses never redirect. The redirect house rule was declined.
  (b) Cover tiers from existing tileset semantics: raised props = half cover (+2 AC, PF2e standard cover), walls = full cover. Per-tile cover data on MapGrid, sourced from pack tilesets (validator extension is Phase B).
  (c) Corner-aware cover gradient: never shoot through walls, but wall cover is angle-dependent. Corner-occlusion sampling (attacker's best corner vs the target tile's corners): ALL rays blocked = no line of effect (cannot target, no reticle); SOME blocked = half cover (+2 AC); NONE = open. Raised props never block targeting — they only grant their cover tier. Creatures in the line grant lesser cover (+1 AC) only.
  (d) Area effects in scope: Breathe Fire's cone must not extend through walls (this closes m9_cone_line_of_effect); standard cover grants +2 circumstance to Reflex saves against area effects per RAW. m10_aoo_trigger_subset stays deferred to M12.

STEP 0 — Baseline. npm run test (expect 218 green across 45 files) and npm run build (clean) before changing anything. Node 24 is on PATH on this machine (big10).

STEP 1 — Vendor SRD text under rules/srd/ BEFORE implementing (Archives of Nethys, never memory): cover (lesser/standard/greater, AC + Reflex-vs-area + Stealth bonuses, Take Cover), line of effect, line of sight. Create rules/srd/m11-subset.json extending m10-subset.json (bump version, keep all M10 values identical — subset.ts alias pattern). Where decision (c) diverges from RAW (corner sampling instead of GM adjudication), say so in the vendored file the way reactive-strike.md flags the M10 house rule.

STEP 2 — Geometry module (THE premium work): pure functions on MapGrid in src/core/combat/ (suggest los.ts), no imports from resolver/renderer:
  - line-of-effect test between tiles (corner-occlusion sampling per decision (c));
  - cover evaluation attacker→target returning tier + source (none / lesser-creature / half-prop / half-wall-partial / blocked), with occupied tiles supplied by the caller so the function stays pure;
  - cover→AC bonus and cover→Reflex-vs-area bonus helpers (single source of truth for the numbers);
  - cone-template clipping: the M9 quarter-circle template filtered by line of effect from the origin (m9 cone derivation stays; this wraps it).
  Frozen table-driven contract tests (tests/contract/los-cover.test.ts or similar): corners, diagonals, adjacent walls, prop vs wall, creature lesser cover, full occlusion = unreachable, sidestep opens the angle (the gradient: blocked → half → none across three attacker positions), cone clipped at a wall, determinism/symmetry cases. This suite is the contract Phase B builds against — make the tables readable.

STEP 3 — Phase A gate: full suite green (all frozen contract tests untouched), build clean.

STEP 4 — Write the Phase B handoff: REPLACE this file's contents with a PHASE B prompt for a standard model containing: exact exported signatures from STEP 2; the wiring points (resolve.ts ranged Strike / Ray of Frost / CastConeSpell; inspect.ts must show the same cover math the resolver uses — keep the M9 shared-math pattern; enemy AI greedy no-LoS-no-shot check — smart play is M12; pack validator extension for per-tile cover from raised/blocked; renderer: no-reticle on blocked targets, inspector cover line, combat-log cover lines, overlay flags m11 + closing m9_cone_line_of_effect, console banner, ASSETS_NEEDED.md if any placeholder art); the M11 gate-2 checklist with stop signal "M11 done. Get a shot blocked, watch corner cover open up as you sidestep, and save against Breathe Fire from behind a cart."; and the key-architecture list below verbatim. Then commit Phase A and STOP — do not wire anything. Phase A stop signal (print this to the human): "M11 Phase A done — LoS/cover geometry contract frozen (N tests green, build clean). Nothing is wired or visible in-game yet; that is intentional. SWITCH TO A CHEAPER/STANDARD MODEL for the next session and paste the PHASE B prompt from NEXT_SESSION.md."

Key architecture (do not regress):
- src/core stays pure and headless; renderers are read-only event-log/state consumers; referential integrity by ID.
- One Effect → one Event; state mutates only via apply(); new effect kinds extend AnyEffect (never the frozen Effect union / ALL_EFFECT_KINDS) and need effectFromEvent replay cases + their own contract tests. (Phase A should need NO new effect kinds — cover/LoS are resolution inputs, not mutations.)
- Entity.conditions is the frozen M1 bare-id mirror over activeConditions — both maintained ONLY in apply.ts (M10 pattern).
- Initiative comes from a seed on CombatSession; replay rebuilds the initial state with the same seed — never emit initiative events.
- Never block on missing art: flagged placeholder + ASSETS_NEEDED.md row.

One phase per loop. Do not work ahead into Phase B.
```

## PHASE B — standard model (wiring, content, renderer)

Written by Phase A in STEP 4. If this section still says only this line, Phase A has not run yet.
