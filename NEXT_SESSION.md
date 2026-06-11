# Next session prompt (copy into a new chat)

```
Continue EMBERWATCH development. Read AGENTS.md, ARCHITECTURE.md, ROADMAP.md, and PROGRESS.md first.

M8 gate 1 is done (156 tests green). M6/M7/M8 gate 2 (human acceptance) are all pending — playtest them together, or fix issues found during playtesting.

M8 delivered: content-pack architecture + authored standard maps. Default pack "The Emberwatch Frontier" (illustrated world map, Drowned Quay harbor district, 3-level Bell Spire tower, 2-level Ember Vaults dungeon, 12 themed battle maps); alt pack "The Mirrormarsh" proves pack swapping.

M8 gate 2 checklist (STOP and report when ready):
- npm run dev — recruit a party, Enter World: illustrated parchment world map with painted sea/river/roads under the site markers
- Travel to The Ashen Road — fight on a themed battle map (road, carts, rubble walls that block movement); win; site flips to Held on the world map
- Enter The Drowned Quay — illustrated harbor plan; clear areas; Fishrow Market is a safe haven
- Enter The Bell Spire — three floor plans; the map switches as you climb past the stairs; Warden's Walk shelter below the crown
- Enter The Ember Vaults — two descending levels; ember glow art
- On the recruit screen, switch Campaign world to The Mirrormarsh — green fen world map, Sunken Granary district, marsh battle maps (no code change)
- F3/~ overlay: strategic_map_art and battle_map_tilesets VISIBLE; battle_map_blocking flagged PROCEDURAL (landing blocked only, no path check)

Key architecture (do not regress):
- Content packs live in src/content/<pack>/ + public/art/<pack>/; registry in src/content/registry.ts; adding a pack = data + art + one registry entry
- Core validates packs (src/core/pack/validate.ts); asset IDs only in pack data, file paths only in pack manifest entries; renderers resolve via the merged asset manifest
- StrategicMapScreen renders world + district layers incl. per-level backgrounds; CombatScene renders battle-map tilesets; both read-only consumers
- Blocked terrain is core data (MapGrid.blocked) — Step rejects landing on it; enemy AI avoids it

If gate 2 is accepted, update PROGRESS.md and do not start M9 until prompted.

Explicitly out of scope for M8: saves/resistance/spell slots (M9), path-aware Step movement (M9), character GLBs (M10), free-roam tile-grid exploration, runtime LLM narrator.

Rules: never weaken frozen contract tests; src/core stays pure; flag mocks in dev overlay.
```
