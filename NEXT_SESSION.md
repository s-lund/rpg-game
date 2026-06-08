# Next session prompt (copy into a new chat)

```
Continue EMBERWATCH development. Read AGENTS.md, ARCHITECTURE.md, ROADMAP.md, and PROGRESS.md first.

M0 is done and accepted. Implement M1 only — Combat map: move + fight.

M1 goal: headless combat core + placeholder iso renderer together. Fighter, Rogue, and enemies on the grid (placeholder boxes). Click to move within action points. Strike, HP changes, flanking → flat-footed. Finish a fight.

M1 gate 1 (do not stop until green):
- Pipeline contract test in tests/contract/ (state mutates only via apply(Effect); one Effect → one Event)
- Scripted fight resolves and reconstructs from event log
- Renderer holds zero game state

M1 gate 2 (then STOP and report):
- Run npm run dev, move both characters, kill an enemy

Rules: test-first; src/core stays pure (no three.js/DOM); never modify/weaken tests/contract once written; flag mocked items in dev overlay; one milestone only.

Start by planning M1 in small tasks, then implement.
```
