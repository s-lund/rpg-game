# Next session prompt (copy into a new chat)

M11 Phase A (premium — LoS/cover geometry contract) is **DONE**, committed 2026-06-12. The geometry contract is frozen in `tests/contract/los-cover.test.ts`. This file is now the **PHASE B** prompt: wiring, content, and renderer work for a **standard model**. Nothing from Phase A may be reworked — build against it.

## PHASE B — standard model (wiring, content, renderer)

```
Continue EMBERWATCH development. Read AGENTS.md, ARCHITECTURE.md, ROADMAP.md, and PROGRESS.md first.

State: M0–M10 are DONE and human-accepted. M11 Phase A is DONE and committed: the pure-core LoS/cover geometry module (src/core/combat/los.ts), vendored SRD (rules/srd/cover.md, rules/srd/line-of-effect.md, rules/srd/m11-subset.json — subset.ts now exports M11_SUBSET), MapGrid.cover field, and the frozen contract suite tests/contract/los-cover.test.ts (28 tests). This is M11 PHASE B: wire the frozen geometry into resolver, content, AI, and renderer. Do NOT modify src/core/combat/los.ts or anything in tests/contract/ — if the geometry seems wrong, STOP and flag it.

STEP 0 — Baseline. npm run test (expect 246 green across 46 files) and npm run build (clean) before changing anything. Node 24 is on PATH on this machine (big10).

THE FROZEN PHASE A API (src/core/combat/los.ts, all re-exported from src/core/index):

  type TileCoverKind = "open" | "raised" | "wall";
  type CoverTier = "none" | "lesser" | "standard" | "blocked";
  type CoverSource = "none" | "lesser-creature" | "half-prop" | "half-wall-partial" | "blocked";
  interface CoverResult { tier: CoverTier; source: CoverSource; acBonus: number; lineOfEffect: boolean; }

  const WALL_RAISED_THRESHOLD: number;   // 0.7 — tileset `raised` >= this is a wall, below (>0) is a prop
  function coverKindFromTileStyle(blocked: boolean | undefined, raised: number | undefined): TileCoverKind;
  function tileCoverKind(map: MapGrid, x: number, y: number): TileCoverKind;
  function hasLineOfEffect(map: MapGrid, from: Tile, to: Tile): boolean;          // symmetric; only walls block
  function evaluateCover(map: MapGrid, attacker: Tile, target: Tile, occupied?: readonly Tile[]): CoverResult;
  function coverAcBonus(tier: CoverTier): number;            // none 0, lesser +1, standard +2, blocked 0
  function coverReflexVsAreaBonus(tier: CoverTier): number;  // standard +2, everything else 0
  function clipTilesByLineOfEffect(map: MapGrid, origin: Tile, tiles: Tile[]): Tile[];
  function coneTilesWithLineOfEffect(map: MapGrid, originX, originY, targetX, targetY, length): Tile[];

  Semantics you must respect:
  - MapGrid.cover (new optional field on src/core/types.ts) is authoritative when present: entries are
    { x, y, kind: "wall" | "raised" }; flat hazards (water/chasm) are OMITTED (impassable, no cover).
    When absent (legacy maps / old saves), every MapGrid.blocked tile is treated as a wall. Don't "fix" old saves.
  - tier "blocked" means NO line of effect: the target cannot be targeted at all. coverAcBonus returns 0
    for it — the resolver must refuse the action, never resolve it at +0.
  - evaluateCover's `occupied` is the tiles of all standing (non-downed) creatures; entries on the attacker's
    or target's own tile are ignored automatically, so pass everyone.
  - coneTilesWithLineOfEffect does NOT bounds-filter (same contract as coneTiles) — keep the existing
    bounds handling where the cone is consumed.
  - Wall cover is corner-sampled and angle-dependent by design (sidestep opens the angle). Props and
    creatures never block targeting; they only grant cover. See rules/srd/cover.md.

STEP 1 — Flow per-tile cover data from packs into combat (core, no new authoring):
  a. ResolvedBattleMap (src/core/pack/battle-map.ts) gains `cover: { x; y; kind: "wall" | "raised" }[]`,
     derived in resolveBattleMap via coverKindFromTileStyle(style.blocked, style.raised) — only push
     non-"open" kinds.
  b. InitialStateConfig (src/core/types.ts) gains `coverTiles?` alongside blockedTiles; createInitialState
     (src/core/state.ts, where map.blocked is built) copies it into map.cover the same way.
  c. buildPackEncounter (src/core/pack/encounter.ts) passes coverTiles: battleMap.cover. Non-pack
     (legacy/demo) encounters pass nothing — the legacy blocked-as-wall fallback covers them.
  d. Pack validator (src/core/pack/validate.ts): add the invariant that a tileset kind with raised > 0 must
     also be blocked (walkable cover tiles don't exist in M11). All shipped tilesets already satisfy it.
  e. Unit tests (tests/unit/, NOT contract): resolveBattleMap derives wall for raised 0.9 walls, raised for
     0.45 carts, omits water; cover survives createInitialState into state.map.

STEP 2 — Resolver wiring (src/core/actions/resolve.ts; cover math via the los.ts helpers ONLY):
  a. Build `occupied` from standing entities once per resolution: Object.values(state.entities)
     .filter(e => !e.downed).map(e => ({ x: e.x, y: e.y })).
  b. Strike (ranged AND melee, ~line 373) and CastSpell / Ray of Frost (~line 517): reject the action when
     evaluateCover(...).lineOfEffect is false (same no-op pattern as out-of-range); otherwise add
     result.acBonus to the target's effective AC for the attack roll. Keep using the SAME rolled-attack
     helper (combat/attack.ts) the inspector estimates from — pass the cover bonus in, don't fork the math.
  c. CastHeal: targeting an ally also requires hasLineOfEffect (RAW); no AC involved.
  d. CastConeSpell / Breathe Fire: replace the coneTiles call with coneTilesWithLineOfEffect (this closes
     m9_cone_line_of_effect — the cone stops at walls); for each creature still in the template, add
     coverReflexVsAreaBonus(evaluateCover(casterTile, creatureTile, occupied).tier) to its Reflex save total.
  e. Reactive Strike is melee-adjacent — leave it alone (m10_aoo_trigger_subset stays deferred to M12).
  f. Contract tests for the new behavior go in tests/contract/ as NEW files (e.g. cover-resolution.test.ts):
     blocked target → action rejected, no events; cover AC changes a hit to a miss at a pinned seed;
     cone-behind-wall → no save event, no damage event for the sheltered creature; cart cover → +2 on the
     Reflex save total visible in the save event payload. Never touch existing files in tests/contract/.

STEP 3 — Inspector (src/core/combat/inspect.ts): inspectTarget must compute cover via the SAME
  evaluateCover/coverAcBonus calls and fold it into the displayed hit% and AC (M9 shared-math pattern —
  inspector and resolver share one code path). Expose tier + source so the renderer can print
  "Half cover (wall corner): +2 AC" / "Lesser cover (ally in the line): +1 AC" / "No line of effect".
  Update tests/unit/combat-inspect.test.ts accordingly (it is a unit test, not contract).

STEP 4 — Enemy AI (src/core/ai/enemy-turn.ts): the greedy policy gains exactly one new rule — never
  pick a ranged strike/spell against a target with no line of effect (evaluateCover lineOfEffect false).
  If nothing is shootable, fall back to the existing move/step behavior (walking closer is fine). Smart
  cover play is M12 — do not add scoring.

STEP 5 — Renderer (src/renderer/): all read-only consumers of core state/events:
  a. Targeting UX: no reticle / disabled target highlight on entities with no line of effect (mode-aware:
     bow, Ray of Frost, Heal, Breathe Fire target tiles); the Breathe Fire cone PREVIEW must render the
     clipped template (call coneTilesWithLineOfEffect — never the raw template).
  b. Hover inspector: one cover line from STEP 3's tier + source (and "No line of effect — cannot target"
     when blocked).
  c. Combat log (src/core/narrator/combat-log.ts): cover on attack lines ("… vs AC 16 +2 cover = 18") and
     Reflex-vs-area lines ("… Reflex 14 +2 cover vs DC 17"); a line when a shot is refused for no line of
     effect is NOT needed (refused actions emit no events).
  d. Dev overlay (src/renderer/main.ts ScenePresence registrations): REMOVE the m9_cone_line_of_effect
     PROCEDURAL flag (it is closed); ADD m11_los_cover ("M11 line of effect + corner-sampled cover from
     rules/srd/cover.md, line-of-effect.md, m11-subset.json"). Update the console banner to M11.
  e. No new art is expected (cover uses existing wall/prop tiles). If you do add placeholder art anyway,
     flag it in the overlay and append a row to ASSETS_NEEDED.md per the standing rule.

STEP 6 — Playtest content check: the gate-2 script needs (1) a wall to get a shot blocked behind, (2) open
  ground to sidestep across, (3) a cart/crate/rubble prop a target can stand behind against Breathe Fire.
  Verify at least one early Emberwatch encounter (e.g. a Drowned Quay map with `cart` tiles) stages all
  three near spawns; if not, adjust battle-map rows/spawns (content data edit — allowed) so the human can
  reproduce the stop-signal script in one fight.

STEP 7 — Gate: npm run test green (all frozen contract tests untouched — including los-cover.test.ts),
  npm run build clean. Then update PROGRESS.md is NOT yours to do (human gate 2) — instead STOP and print:

  "M11 done. Get a shot blocked, watch corner cover open up as you sidestep, and save against Breathe Fire
  from behind a cart."

  Gate-2 checklist to print for the human (with proof types):
  - LOOK: a wall blocks bow shots and Ray of Frost — no target reticle without line of effect.
  - LOOK: sidestep around the corner — the hover inspector walks blocked → half cover (+2 AC) → no cover.
  - LOOK: shooting past a cart/rubble shows the +2 cover AC in the hover inspector and combat log.
  - LOOK: an ally in the firing line shows lesser cover (+1 AC) on the enemy; misses never hit the ally.
  - LOOK: Breathe Fire's cone preview stops at walls; a creature behind the wall is untouched (no save line).
  - LOOK: a target behind a cart saves against Breathe Fire at +2 (visible in the combat-log save line).
  - LOOK: enemies no longer shoot through walls (they reposition instead).
  - OVERLAY: m11_los_cover present; m9_cone_line_of_effect gone.
  - TEST: npm run test — 246 Phase A baseline + your new contract/unit tests, all green.

Key architecture (do not regress):
- src/core stays pure and headless; renderers are read-only event-log/state consumers; referential integrity by ID.
- One Effect → one Event; state mutates only via apply(); new effect kinds extend AnyEffect (never the frozen Effect union / ALL_EFFECT_KINDS) and need effectFromEvent replay cases + their own contract tests. (Phase B should need NO new effect kinds — cover/LoS are resolution inputs, not mutations: a blocked shot is a rejected action, a covered shot is a normal Strike/save with adjusted numbers.)
- Entity.conditions is the frozen M1 bare-id mirror over activeConditions — both maintained ONLY in apply.ts (M10 pattern).
- Initiative comes from a seed on CombatSession; replay rebuilds the initial state with the same seed — never emit initiative events.
- Never block on missing art: flagged placeholder + ASSETS_NEEDED.md row.

One phase per loop. M11 ends at the gate above — do not start M12.
```
