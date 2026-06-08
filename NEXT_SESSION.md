# Next session prompt (copy into a new chat)

```
Continue EMBERWATCH development. Read AGENTS.md, ARCHITECTURE.md, ROADMAP.md, and PROGRESS.md first.

M2 is done and accepted. Implement M3 only — World map: travel.

M3 goal: add the strategic overworld scale. Player sees a separate world map (not the tactical combat grid), moves the created party between sites on a graph, and always knows current position and reachable neighbors. No combat-map transition yet — that is M4.

M3 gate 1 (do not stop until green):
- World-map graph loads and validates in pure core (sites reachable, travel edges valid; tests in tests/unit/ or tests/contract/ as appropriate — do not weaken existing contract tests)
- Party world position persists across moves (serialize → load → same site; headless tests)

M3 gate 2 (then STOP and report):
- Run npm run dev, create or load party, open the world map, walk between at least three sites, confirm position and available routes update correctly

Rules: test-first; src/core stays pure (no three.js/DOM); never modify/weaken tests/contract once written; flag mocked items in dev overlay; one milestone only. World map is structured data + validator — see ARCHITECTURE.md “Two map scales”. Enemy AI and world↔combat transition remain out of scope (M1/M4).

Start by planning M3 in small tasks, then implement.
```
