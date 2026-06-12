# Next session prompt (copy into a new chat)

```
Continue EMBERWATCH development. Read AGENTS.md, ARCHITECTURE.md, ROADMAP.md, and PROGRESS.md first.

State: M0–M9 are DONE and human-accepted. M10 (initiative, reactions + conditions) passed GATE 1 on 2026-06-11 (231 tests green incl. new contract tests initiative/reactions/conditions, build clean) and is AWAITING GATE 2 human acceptance. If the human has accepted M10 in this conversation, update PROGRESS.md (M10 row done/accepted + an M10 section in the established format) before anything else; if not, re-print the M10 gate-2 checklist and STOP.

M10 recap (decisions are recorded under M10 in ROADMAP.md): five conditions (frightened, prone, stunned, slowed, persistent damage); rolled Perception initiative (seeded, stored on initial state, enemy wins ties); Reactive Strike as a HOUSE RULE — every melee-armed combatant threatens, once per round, auto-resolved, move-trigger = leaving reach only (flagged m10_aoo_trigger_subset); heroes carry a +10 HP playtest cushion (m10_hp_cushion, until M15); enemy condition sources: Quay Bruiser → prone, Cinder Shade → persistent fire 1d4, bosses/Granary Wight → frightened 2, Bog Stalker → slowed 1.

Next milestone: M11 — Line of sight, cover + friendly fire. Work through these steps IN ORDER.

STEP 0 — Baseline. npm run test (expect 231 green incl. tests/contract/{initiative,reactions,conditions}.test.ts) and npm run build (clean) before changing anything. Node 24 is on PATH on this machine (big10).

STEP 1 — Clarify first (BLOCKING: ask the human, record answers in ROADMAP.md under M11 like the M9/M10 resolutions):
  (a) Friendly-fire house rule — PF2e RAW has none for single-target attacks; proposal: an ally in the firing line grants the target lesser cover (+1 AC), and a miss CAUSED by that cover bonus strikes the ally instead. Confirm or adjust.
  (b) Cover tiers per battle-map prop (content decision per tileset): which props are half (+2 AC) vs full cover; M8 tilesets already mark walls/props as blocked/raised — propose raised props = half cover, walls = full.
  (c) Does full cover block targeting entirely (no reticle) or grant +4 AC? Proposal: blocks entirely.
  (d) Does M11 also close the m10_aoo_trigger_subset and m9_cone_line_of_effect flags (cone respects walls)? Proposal: close the cone flag here; AoO trigger subset stays until M12.

STEP 2 — Vendor SRD text under rules/srd/ BEFORE implementing (Archives of Nethys, never memory): Cover (lesser/standard/greater, AC bonuses, Take Cover), line of effect, line of sight. Extend rules/srd/m11-subset.json from m10-subset.json (bump version, keep all M10 values identical — subset.ts alias pattern).

STEP 3 — LoS/cover geometry in core (PREMIUM): pure functions on MapGrid (tile-to-tile LoS, cover between attacker and target) with table-driven tests — corners, diagonals, adjacent walls. The inspector must show the same cover math the resolver uses (inspect.ts already shares attack/save math — keep it that way).

STEP 4 — Resolver wiring (standard): ranged Strike / Ray of Frost / Breathe Fire respect LoS + cover; friendly-fire redirection rides the pipeline as a normal resolution outcome (extend attack_resolution payload, never a second apply path); enemy AI stops shooting through walls (greedy check, not smart play — that's M12).

STEP 5 — Content + renderer (standard): per-tile cover data in the pack battle maps + validator extension (both packs must show half cover in one playtest); no-LoS targeting feedback (no reticle / blocked note); hover-inspector cover line; combat-log lines for cover and ally hits; overlay flags + M11 acceptance items (LOOK/OVERLAY/TEST) + console banner.

STEP 6 — Gate 1. Full suite green (frozen tests/contract untouched), build clean, then STOP: report the M11 stop signal ("get a shot blocked, see half cover in the inspector, clip your own Rogue") with the gate-2 checklist. Do NOT update PROGRESS.md, do NOT start M12.

Key architecture (do not regress):
- src/core stays pure and headless; renderers are read-only event-log/state consumers; referential integrity by ID.
- One Effect → one Event; state mutates only via apply(); new effect kinds extend AnyEffect (never the frozen Effect union / ALL_EFFECT_KINDS) and need effectFromEvent replay cases + their own contract tests.
- Entity.conditions is the frozen M1 bare-id mirror over activeConditions — both maintained ONLY in apply.ts (M10 pattern).
- Initiative comes from a seed on CombatSession; replay rebuilds the initial state with the same seed — never emit initiative events.
- Never block on missing art: flagged placeholder + ASSETS_NEEDED.md row.

One milestone per loop. Do not work ahead. When M11 gate 1 passes, STOP and report the gate 2 checklist.
```
