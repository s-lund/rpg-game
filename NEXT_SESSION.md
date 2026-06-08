# Next session prompt (copy into a new chat)

```
Continue EMBERWATCH development. Read AGENTS.md, ARCHITECTURE.md, ROADMAP.md, and PROGRESS.md first.

M3 is done and accepted. Implement M4 only — World ↔ combat transition.

M4 goal: connect the two map scales so it is one game. From the BG-style world map, the player enters the current site (or a site-specific encounter), drops into the tactical combat grid with their actual created party and site-appropriate enemies, finishes the fight, and returns to the world map with party HP/state carried over. World travel (animated token between graph neighbors) stays as built in M3.

M4 gate 1 (do not stop until green):
- Frozen transition contract in tests/contract/ (write first, then implement): party/campaign state owned by core; entering combat loads the correct local encounter from the current site; combat victory/defeat returns updated party stats (at minimum HP) into CampaignState; serialize → combat → return → serialize round-trips without losing world position or party identity
- Site → encounter mapping in pure core (structured data + validation; e.g. each WorldSite references an encounter config id)
- Do not weaken tests/contract/pipeline.test.ts or any existing frozen contract

M4 gate 2 (then STOP and report):
- Run npm run dev, travel on world map to a site, enter it, fight with your created party, win or lose, return to world map
- Confirm you are back on the overworld at the same site (or documented rule for defeat), party names unchanged, HP reflects the fight
- Dev overlay flags any mocked encounter data or enter-site UI as PROCEDURAL

Existing hooks (do not reinvent):
- CampaignState + serializeCampaign / deserializeCampaign (emberwatch.campaign v1)
- buildEncounterConfig(party) + createInitialState — extend or replace with site-aware encounter builder
- startCombat in src/renderer/main.ts (currently on window.__emberwatch.startCombat only)
- WorldMapScreen / WorldMapSession — add “Enter site” when not traveling; hide world map, show iso combat; on combat end, merge entity HP back into campaign and show world map again
- M3_DEMO_GRAPH sites: site_cinder_gate, site_drowned_market, site_ash_foundry, site_bell_tower_ruins

Rules: test-first; src/core stays pure (no three.js/DOM); never modify/weaken tests/contract once written; flag mocked items in dev overlay; one milestone only. See ARCHITECTURE.md “Two map scales” transition contract. Enemy AI remains out of scope (auto-pass like M1). District generation and tile-map validators remain M6.

Start by planning M4 in small tasks, then implement.
```
