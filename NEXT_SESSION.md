# Next session — M13 "The War Turn", Phase A (premium model)

> The design is locked. The 2026-06-12 design-discovery session settled the core loop with human
> sign-off — **read `DESIGN.md` first; it is the north star this milestone answers to.** This file
> is back to being a normal build prompt: STEP 0 baseline → contract-test-first → gate.
>
> **Model: premium for this session (Phase A).** It builds the war-state model and turn-pipeline
> contract that every later war milestone (M14–M17) rides. Phase B (UI + pack data wiring) is a
> separate **standard-model** session against the Phase A handoff — same two-session pattern as
> M11/M12.

---

## Status check before you start

- **M12 gate 2 is STILL OWED.** Gate 1 passed (290 tests green / 51 files); the human deferred the
  playtest. The LOOK checklist lives in `PROGRESS.md` (M12 section). If the human wants to run it
  now, help with that first. It can also be combined with the M13 gate-2 playtest later — but M12
  must not silently become "accepted" without it.
- **Do not work ahead.** M13 is the war turn ONLY. Economy (M14), autoresolve (M15), troops in
  tactical combat (M15), faction AI / heat (M16), and win/lose (M17) are all out of scope. The v1
  pressure here is a **scripted, data-driven raid schedule** — deliberately dumb, visibly flagged.

## Orientation (read first)

`DESIGN.md` (north star), `AGENTS.md`, `ARCHITECTURE.md`, `ROADMAP.md` (Phase 3 intro + M13),
`PROGRESS.md`. The game today: M0–M12 built (M12 gate-2 pending) — party creation, world/district
strategic maps, deep PF2e tactical combat with archetype AI, reclamation via `siteControl`. There is
no clock, no factions, no troops, no win/lose. M13 adds the first three.

On this machine npm isn't on PATH — it lives at
`%LOCALAPPDATA%\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_*\node-v24.16.0-win-x64` (prepend to
PATH).

---

## M13 scope (from `ROADMAP.md`, design-resolved in `DESIGN.md`)

The campaign becomes a **discrete-turn war over an owned map**:

1. **Factions.** Three enemy factions + the rebellion (+ neutral, if Phase A decides to keep
   unowned areas) as first-class campaign data with stable IDs. Existing `siteControl`
   (hostile/held) migrates into per-area **faction ownership**.
2. **The turn.** An `EndCampaignTurn` action: the player issues orders freely (travel within the
   turn's movement allowance, future: recruit/garrison), then ends the turn; the world resolves one
   deterministic tick through `campaign-apply.ts` — every change an effect → event, replayable.
3. **Army stacks as data.** Stack = owner + location + slots, one slot = one soldier of a typed
   troop (or a hero) — per `DESIGN.md` decision 4. A troop-type catalog (IDs + labels + tier; stat
   blocks come in M15) lives in pack data behind the validator. Garrisons are stacks. In M13 stacks
   exist, serialize, and move; they do not fight yet.
4. **Scripted raids (v1 pressure).** A deterministic, data-driven raid schedule: a raid targets one
   of the player's areas with a visible warning and a deadline (in turns). If the party is at the
   area when the deadline hits (or travels there and triggers the fight), it resolves as a normal
   tactical encounter — win = raid repelled; if unattended, the area flips to the raiding faction.
   Scripted faction-vs-faction flips on the same schedule mechanism make the wider war visibly move.
   All of it flagged in the overlay as placeholder until M16 (`m13_scripted_war`).
5. **The war log.** Every ownership change, raid, and faction move is reported **with its cause**
   (anti-goal: illegible war). Core emits the events; the renderer panel is Phase B.
6. **Serialize version bump + migration.** Old saves load: held → rebellion ownership, hostile →
   faction ownership per pack data (or a deterministic default split).

**Phase A decides (the remaining "Clarify first" items — record decisions in `ROADMAP.md` as a
dated resolved block, pattern M9–M12):** turn-length fiction (days vs weeks label); party movement
allowance per turn (proposal: N edges, N small); whether neutral/unowned areas exist at start;
whether a garrisoned area delays a scripted raid flip (proposal: keep v1 brutally simple — it
doesn't; garrison combat math is M15's job).

**Architecture constraints (non-negotiable):** all war state is campaign state, serialized,
replayable from the event log; the tick is a pure deterministic function (seeded if randomness is
ever needed — prefer none in M13); core stays headless; renderer read-only; **`tests/contract/` is
frozen — never modify existing files there.** New contract tests get new files.

---

## Phase A (THIS session, premium) — contracts + core

1. **STEP 0 — baseline.** `npm run test` → 290 green / 51 files; `npm run build` clean. If not,
   stop and report.
2. Write the frozen contract tests FIRST, then implement to green:
   - `tests/contract/war-turn.test.ts` — `EndCampaignTurn` produces one deterministic effect/event
     sequence; same state + same orders → identical events; full replay reconstructs state;
     ownership changes only via effects.
   - `tests/contract/war-state.test.ts` — factions/ownership/stacks/troop-catalog/raid-schedule
     round-trip the campaign serialize version bump; an old-version save migrates correctly.
   - `tests/contract/raid-schedule.test.ts` — raid warning → deadline → flip when unattended;
     repelled when the tactical fight is won; faction-vs-faction scheduled flips fire
     deterministically.
3. Pack schema + validator extensions: faction definitions, per-area starting owner, troop-type
   catalog, raid/war schedule entries. Both shipped packs get minimal valid data (full region
   content is M18).
4. Unit tests where behavior is real (movement allowance, schedule arithmetic); no ceremonial
   tests.
5. **Write the Phase B handoff** (what UI/wiring is owed, against which core APIs) into this file,
   and **STOP.** Print the stop signal: what's built, what `npm run test` shows, and that Phase B
   is a standard-model session.

## Phase B (next session, standard) — renderer + content wiring

Ownership colors/banners on the strategic maps; war-log panel; End Turn button + turn counter;
raid-warning markers with deadlines; movement-allowance UX; overlay flags (`m13_scripted_war`,
serialize/migration presence); M13 console banner. Also: update the stale one-liner in `AGENTS.md`
("What this is" / design DNA) to point at `DESIGN.md` — the pitch is now the living three-faction
war, not only "reclaim a ruined city."

## Gates

- **Gate 1 (loop self-check):** all new contract tests green alongside the full suite; build clean;
  no frozen file touched.
- **Gate 2 (human, after Phase B):** LOOK — end turns and watch the war move with causes in the log;
  see faction ownership at a glance; get a raid warning, save that area in person, lose an ignored
  one; load an old save and keep playing. OVERLAY — `m13_scripted_war` flagged. Stop signal:
  **"M13 done. End turns, watch the war move, lose an ignored area, save an attended one."**
  (The owed M12 LOOK checklist can be run in the same sitting — keep its acceptance separate.)

One milestone. No economy, no autoresolve, no faction brains, no win/lose. Build the heartbeat;
the war grows organs in M14–M17.
