# Next session prompt (copy into a new chat)

```
Continue EMBERWATCH development. Read AGENTS.md, ARCHITECTURE.md, ROADMAP.md, and PROGRESS.md first.

M5 is done and accepted. Implement M6 only — District generation + reclamation loop.

M6 goal: original district content and the core reclamation loop. Generate an original district from a brief (procedural/template stand-in for gate 1 — flag PROCEDURAL; no copied map layouts). Walk it on the world map, clear its encounters, and see district reclamation progress (hostile → held) persist on the overworld. Inward difficulty tier gradient should be noticeable.

M6 gate 1 (do not stop until green):
- Frozen district/map validator contract in tests/contract/ (write first, then implement): area graph + per-area tile grid invariants from ARCHITECTURE.md — exits lead to real areas, bidirectional edges, reachable from entrance, spawn/cover bounds, tier monotonic inward; reject invalid proposals deterministically
- Pure-core district types + validator + loader (no three.js/DOM in core): area graph, tile grids keyed by area id, district brief → candidate layout (procedural generator acceptable for gate 1)
- District reclamation state on CampaignState or adjacent authoritative state: per-district or per-site cleared/hostile flags; changes only via effect pipeline or explicit validated transitions (no renderer mutation)
- Serialize round-trip preserves cleared state; ID/label rename is a data-only edit (test with label swap, ids unchanged)
- Do not weaken tests/contract/pipeline.test.ts, tests/contract/transition.test.ts, tests/contract/narrator.test.ts, or any existing frozen contract
- M4 enter-site → combat → return with HP carry-over must keep working for demo and generated encounters

M6 gate 2 (then STOP and report):
- Run npm run dev — generate (or load) a district, travel it on the world map, enter sites and win fights, see district/site flip from hostile to held
- Confirm inward tier gradient feels stronger toward the center
- Rename a district label in data only — confirm nothing breaks mechanically
- Dev overlay flags procedural generator, placeholder district art, and any mock reclamation UI as PROCEDURAL

Existing hooks (do not reinvent):
- World graph: WorldSite, WorldGraph, validateWorldGraph, M3_DEMO_GRAPH — extend or add parallel district model per ARCHITECTURE.md (area graph + tile grids per area)
- Campaign: CampaignState, travelTo, campaign eventLog, serializeCampaign v1 — extend carefully or bump schema with migration tests
- Transitions: buildEncounterForSite, applyCombatResultToCampaign, frozen transition.test.ts
- Narration: current-site ambience via sites.ts / campaign events — optional: wire generated site labels into ambience catalog
- Dev overlay ScenePresence + acceptance checklist from M1–M5

Suggested shape (names TBD):
- src/core/map/ or src/core/district/ — types, validateDistrict, validateAreaGraph, validateTileGrid, procedural generateDistrictFromBrief
- src/core/world/reclamation.ts — mark site/district cleared after victory; persist on campaign
- tests/contract/district.test.ts (frozen) + tests/unit/map-validator.test.ts
- Renderer: world map shows hostile/held status; optional “Generate district” dev control or auto-load one generated district for the slice

Explicitly out of scope for M6 gate 1:
- Runtime LLM map generation (build-time / procedural stand-in only; flag PROCEDURAL)
- Free-roam local submap before combat (enter site may still drop into tactical combat like M4 — local exploration layer is a later milestone unless you can add it without breaking transition contract)
- Enemy AI, M7 combat inspector, M8 art pass

Rules: test-first; src/core stays pure; never modify/weaken frozen contract tests once written; flag all mocks in dev overlay; one milestone only. Premium model tier only for validator contract design if stuck.

Start by planning M6 in small tasks, then implement.
```
