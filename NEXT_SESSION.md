# Next session prompt (copy into a new chat)

```
Continue EMBERWATCH development. Read AGENTS.md, ARCHITECTURE.md, ROADMAP.md, and PROGRESS.md first.

M6 gate 1 is done (117 tests green). Finish M6 gate 2 — human acceptance — or fix issues found during playtesting.

M6 goal: original district content and the reclamation loop. World map (strategic) → Enter district → district strategic map (same map UI, different rules) → combat on hostile areas → back to district map with area held. Return to world map only from the district entrance.

M6 gate 2 checklist (STOP and report when ready):
- Run npm run dev — generate (or load) a district, enter from world map, travel the district strategic map, win fights, see areas flip hostile → held
- Confirm inward tier gradient feels stronger toward the center
- Return to world map works only from the entrance area
- Rename a district label in data only — confirm nothing breaks mechanically
- Dev overlay flags procedural generator, strategic map chrome, and reclamation UI as PROCEDURAL

If gate 2 is accepted, update PROGRESS.md and do not start M7 until prompted.

Key architecture (do not regress):
- Strategic maps: world layer + district interior layer both use StrategicMapScreen (graph nodes, paths, token)
- Tactical maps: combat tile grids per area; no free-roam local exploration yet (later milestone)
- Core owns graphs, campaign state, reclamation; renderers are read-only consumers

Roadmap note: M8 = illustrated world/district/battle maps + content packs; M9 = saves, resistance, spell slots; M10 = tactical character GLB art pass.

Explicitly out of scope for M6:
- Illustrated map art (M8), combat rules depth (M9), tactical character GLBs (M10), free-roam tile-grid exploration, enemy AI, M7 combat inspector

Rules: never weaken frozen contract tests; src/core stays pure; flag mocks in dev overlay.
```
