# Next session prompt (copy into a new chat)

```
Continue EMBERWATCH development. Read AGENTS.md, ARCHITECTURE.md, ROADMAP.md, and PROGRESS.md first.

M4 is done and accepted. Implement M5 only — Storytelling (narrator).

M5 goal: the narrator as a thing you experience. During exploration and combat, atmospheric prose appears derived from the authoritative event log. Trigger a scripted story beat at a site and read it. The narrator is a read-only consumer — it never mutates game state.

M5 gate 1 (do not stop until green):
- Frozen narrator contract in tests/contract/ (write first, then implement): narrator consumes only the event log (and optional static beat data); disabling/removing the narrator changes nothing mechanical (combat, travel, campaign HP, transitions unchanged)
- Pure-core narrator input adapter: map GameEvent[] (+ minimal context labels: entity names, site labels) → narration lines; no three.js/DOM in core
- Scripted story beat: at least one site in M3_DEMO_GRAPH (e.g. site_cinder_gate or site_drowned_market) has a beat id; triggering it appends beat prose without bypassing the effect pipeline
- Do not weaken tests/contract/pipeline.test.ts, tests/contract/transition.test.ts, or any existing frozen contract

M5 gate 2 (then STOP and report):
- Run npm run dev, play through world map travel, enter a site, fight briefly — narration panel updates as events occur
- Travel to the beat site and trigger/read the scripted story beat
- Toggle narrator off (dev overlay or UI control) — confirm combat/travel/HP still work identically
- Dev overlay flags narrator UI and any template/mock prose provider as PROCEDURAL

Existing hooks (do not reinvent):
- Event log on GameState (`eventLog`, append-only via effect pipeline) — see ARCHITECTURE.md event log schema
- CombatSession.subscribe / WorldMapSession.subscribe — renderer already receives events on combat; world travel emits campaign updates
- Dev overlay ScenePresence + acceptance checklist pattern from M1–M4
- M3_DEMO_GRAPH sites + labels; M4 enter-site / combat / return flow stays as built

Suggested shape (names TBD):
- src/core/narrator/ — formatEventLine(event, context), formatBeat(beatId, context); headless tests
- src/renderer/narrator-panel.ts — DOM panel showing recent lines; subscribe to combat events + world beats
- Optional: narrator enabled flag in renderer only (not authoritative state)

Rules: test-first; src/core stays pure (no three.js/DOM); never modify/weaken tests/contract once written; flag mocked/template narration in dev overlay; one milestone only. Runtime LLM narrator is out of scope for M5 gate 1 — use deterministic template prose from event types first; flag as PROCEDURAL. Enemy AI remains out of scope. District generation remains M6.

Start by planning M5 in small tasks, then implement.
```
