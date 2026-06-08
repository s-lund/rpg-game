# PROGRESS.md

Build progress for EMBERWATCH. Milestone definitions live in `ROADMAP.md`.

**Current milestone:** M1 (next)  
**Last updated:** 2026-06-08 — M0 accepted

---

## Milestones

| Milestone | Status | Gate 1 (tests) | Gate 2 (human) |
|-----------|--------|----------------|----------------|
| M0 Scaffold | **done** | pass | accepted |
| M1 Combat map: move + fight | pending | — | — |
| M2 Character creation | pending | — | — |
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

## M1 — next

**Goal:** headless combat core + placeholder iso renderer — move, Strike, HP, flanking (flat-footed), finish a fight.

**Gate 1 targets:** pipeline contract test in `tests/contract/`; scripted fight reconstructable from event log; renderer holds zero game state.

**Gate 2:** move Fighter and Rogue, kill an enemy.
