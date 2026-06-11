# AGENTS.md — Project Instructions

> This is the vendor-neutral instruction file read by coding agents (Cursor, Cline, Roo Code, Windsurf, Kilo Code, Codex, Aider, etc.) at the start of a session. It is plain markdown, no schema.
> If you ever use Claude Code, symlink it: `ln -s AGENTS.md CLAUDE.md`.
> Working title: **EMBERWATCH** (placeholder, not setting IP — rename freely).
> Keep this file lean; it loads on every invocation. Detail lives in `ARCHITECTURE.md`, `ROADMAP.md`, and `PROGRESS.md`.

**Read `PROGRESS.md` before coding** — it records which milestone is current and what is already done. Update it only when the human approves session progression (milestone gate 2 accepted). Keep updates strictly to build progress; no design essays.

## What this is

A 2.5D, party-based, turn-based tactical RPG. Free isometric exploration of a contiguous map; turn-based action-point combat on the same view. Design DNA: "reclaim a ruined frontier city, district by district, with a difficulty gradient running inward." Rules build on **Pathfinder 2e** mechanics released under the **ORC License**. The setting is **original**.

## Non-negotiable invariants

Load-bearing. Breaking any of these is a defect even if tests pass. If a task seems to require it, stop and flag instead.

1. **The deterministic rules engine is the single source of truth for game state.** The LLM (narrator, generators) never holds or mutates authoritative state; it proposes into a system that validates.
2. **All state changes flow through the action → effect → state pipeline.** No special-case mutations. Strike, heal, shield, stun, and every future effect travel the same path. See `ARCHITECTURE.md`.
3. **The engine emits a structured event log; the renderer and narrator are read-only consumers.** Presentation never reaches back into the engine. This is what lets visuals be added or thrown away anytime.
4. **The deterministic core imports nothing from three.js or the DOM.** It is pure TypeScript logic that runs headless under tests. Rendering is a separate layer.
5. **Referential integrity is by stable ID, never string match.** Locations, entities, effects have IDs; display names are labels over IDs. Renaming is a data edit.
6. **Maps are structured data validated deterministically.** A generator may propose layouts; a validator owns consistency. See `ARCHITECTURE.md`.

## IP hygiene (read before adding any content)

- Use **only** Pathfinder 2e *rules* content available under the ORC License. Keep the ORC attribution at `/legal/ORC-NOTICE.md`.
- **No Paizo setting IP**: no Golarion, Lost Omens, named gods, named places, iconic characters, or the "Pathfinder" trademark anywhere in product, assets, or strings.
- **No copied map layouts**, and renaming-and-reusing one does not make it clean. Build original layouts from the design DNA.
- Vendored SRD text lives in `/rules/srd/` and is reference-only ground truth. **Implement rules from the vendored SRD, never from memory.**

## Working conventions

- **Test-first. The contract test IS the definition of done.** Write/confirm the test before implementing. A task ends when its target test passes.
- **Small tasks.** One action, one effect, one validator rule, one component per task. Never "build the combat system."
- **Model routing / cost discipline.**
  - *Default tier* — cheap models (DeepSeek V4-Flash, Kimi, GLM, etc.) for spec'd implementation against an existing test. This is the normal mode.
  - *Premium tier* — a frontier model only for load-bearing design: the effect-pipeline contract, the map validator invariants, ambiguous combat-resolution edge cases.
  - If a cheap model loops twice on a task, escalate that one task. Don't let it burn ten attempts.
- **Keep context stable** across turns (stable repo map) to ride cache-hit pricing.
- **Core stays headless.** If a change to the rules core requires importing three.js or touching the DOM, it's in the wrong layer.

## Build principles

- **Keep it simple.** Write the simplest thing that passes the current milestone's tests. No speculative abstraction, config, or layers before they're needed. The architecture in `ARCHITECTURE.md` is the one sanctioned up-front structure — don't add more, and don't shortcut it either (no direct state mutation in the name of "simpler"). Comments explain non-obvious *why*, never restate the code.
- **Tests must be real.** Test behavior and logic thoroughly (core, effects, validators); skip ceremonial tests for trivial glue. Every test has meaningful assertions and must fail if the code it covers breaks — no `assert true`, no assertion-free tests, no mocking away the thing under test. Run the full suite every loop. Periodically run mutation testing (Stryker) on the core: a surviving mutant means a test is vacuous — fix it.
- **Interface first-class, art deferred.** The interface (HUD, controls, state readouts, menus) must be clean, legible, and usable from M1, even on placeholder graphics. World, district, and battle-map art plus swappable content packs land in M8; combat rules depth (saves, resistance, spell slots) in M9; tactical character GLB art in M10. Usability now; asset polish last.
- **Flag everything mocked.** Anything not real — placeholder asset, mock data, stubbed system — is visibly badged in a dev overlay so the human always knows whether they're seeing the real thing or a stand-in. The overlay exists from M1.
- **Never block on a missing asset.** Use a flagged placeholder and append a structured request to `ASSETS_NEEDED.md` (`id, type, dimensions, view, one-line description` — e.g. `goblin_token, 32×32 jpg, top-down, green humanoid`). Adding a real asset is a file drop + manifest line, never a code change.

## Autonomous loop rules (Ralph loops)

This project is built by an unattended agent loop. These rules keep that safe.

- **Two gates per milestone.** (1) *Loop self-check* — the milestone's contract tests must pass; this is how the loop knows it's progressing. (2) *Human acceptance* — a runnable artifact the human launches and tries. The loop runs on gate 1 and **halts at gate 2**.
- **Stop and report.** When a milestone's self-check passes, STOP. Print the milestone name, what to run (e.g. `npm run dev`), and exactly what the human should try. Do not start the next milestone.
- **Split acceptance by proof type.** Every "you can try" item must say how to verify it: **LOOK** (on screen), **OVERLAY** (dev overlay presence/acceptance list), or **TEST** (`npm run test` / named test). If a deliverable is not visible, say so explicitly — never imply the human should see it. Register manifest-only and procedural stand-ins in the dev overlay `ScenePresence` report.
- **Contract tests are frozen.** Never modify, weaken, skip, or delete anything in `/tests/contract`. If a contract test seems wrong, STOP and flag it — do not "fix" it to pass.
- **Bound the loop to the current milestone only.** Do not work ahead. One milestone per run.
- **Default model tier:** Composer 2.5 standard (cheaper than Fast and the right tier for unattended runs). Escalate a single stuck task to a frontier model, never the whole loop.

## Architecture in one line

Three layers: build-time generators (LLM-assisted, validated) → deterministic rules engine (source of truth, emits event log) → read-only consumers (renderer, narrator). Full detail in `ARCHITECTURE.md`.

## Stack

- **Language:** TypeScript (everything — core and renderer).
- **Rendering:** three.js, fixed isometric camera, real-time 3D models.
- **Runtime:** runs as a local web app / static site (not inside any chat artifact), so browser storage for saves works normally.
- **Tests:** Vitest. The rules core must test headless with no three.js/DOM imports.
- **Tooling:** Node + npm/pnpm.

3D character/prop models are AI-generated (Tripo / Meshy) and exported as **GLB**, which three.js loads natively. No manual modeling required. Assets are the final phase — build on placeholders first.

## Run / test

```
npm install
npm run test     # vitest — contract + unit tests (headless core)
npm run dev      # local dev server, opens the playable slice
```

## Current phase

See `PROGRESS.md` (current milestone) and `ROADMAP.md` (full plan). Do not work ahead. Map presentation and content packs are M8; combat rules depth is M9; tactical character GLBs are M10.
