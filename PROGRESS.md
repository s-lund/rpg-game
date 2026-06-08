# PROGRESS.md

Build progress for EMBERWATCH. Milestone definitions live in `ROADMAP.md`.

**Current milestone:** M3 (next)  
**Last updated:** 2026-06-08 — M2 accepted

---

## Milestones

| Milestone | Status | Gate 1 (tests) | Gate 2 (human) |
|-----------|--------|----------------|----------------|
| M0 Scaffold | **done** | pass | accepted |
| M1 Combat map: move + fight | **done** | pass | accepted |
| M2 Character creation | **done** | pass | accepted |
| M3 World map: travel | pending | — | — |
| M4 World ↔ combat transition | pending | — | — |
| M5 Storytelling | pending | — | — |
| M6 District generation | pending | — | — |
| M7 Breadth + melee healer | pending | — | — |
| M8 Art pass | pending | — | — |

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

## M3 — next

**Goal:** strategic overworld — party moves between sites on a validated graph.

**Gate 1 targets:** world-map graph loads and validates (reachable sites, valid edges); party position persists across moves.

**Gate 2:** walk the party across the world map between sites.
