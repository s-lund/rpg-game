# ROADMAP.md

Built by an unattended agent loop. Every milestone has **two gates**:

- **Loop self-check** — automated contract tests. This is what the Ralph loop runs to know it's done; it never needs a human. Tests in `/tests/contract` are frozen (see `AGENTS.md`).
- **You can try** — a runnable artifact you launch and poke. When the self-check passes, the loop **stops and reports** this, and you accept by trying it. You never read code to accept a milestone.

Milestones are sequential and each is a bounded loop target. Stack: TypeScript + three.js, Vitest, Node. Rules core is pure TS, tested headless.

> Milestones marked **(new)** were added after the "things I can try out" review — they weren't distinct deliverables in the first draft.

---

## M0 — Scaffold
**Goal:** a real, empty project, with the asset manifest and dev overlay shells in place.
- **You can try:** `npm run dev` opens a blank three.js canvas with a dev overlay you can toggle (empty for now); `npm run test` runs green on a trivial test.
- **Loop self-check:** CI green; dev server boots; asset manifest loads; mutation tooling (Stryker) configured.
- **Stop signal:** "M0 done. Run `npm run dev`, confirm a window opens and the dev overlay toggles."
- **Model:** standard. Plumbing.

## M1 — Combat map: move + fight
**Goal:** the headless combat core AND a placeholder iso renderer, together, so the first thing you see is playable.
- **You can try:** place a Fighter and a Rogue on an isometric grid (placeholder boxes), click to move within action points, make a Strike, watch HP fall, see flanking make a target flat-footed, finish a fight.
- **Loop self-check:** the pipeline contract test (state mutates only via `apply(Effect)`; one Effect → one Event); a scripted fight resolves correctly and is reconstructable from the event log; renderer holds zero game state.
- **Stop signal:** "M1 done. Run it, move both characters, kill an enemy."
- **Model:** premium for the pipeline + effect contracts; standard for each action/condition against its test.

## M2 — Character creation *(new)*
**Goal:** build the party instead of hardcoding it.
- **You can try:** a screen to create a Fighter and a Rogue (distribute ability points and pick skills from the SRD subset), name them, and start the M1 combat map with the party you just made.
- **Loop self-check:** created characters validate against SRD rules; the party round-trips through the core unchanged into combat.
- **Stop signal:** "M2 done. Make a party, drop it into a fight."
- **Model:** standard; premium only if validation rules get hairy.

## M3 — World map: travel *(new)*
**Goal:** the strategic scale.
- **You can try:** a separate overworld map; move the party between sites; see where you are and where you can go.
- **Loop self-check:** world-map graph loads and validates (sites reachable, travel edges valid); party position persists across moves.
- **Stop signal:** "M3 done. Walk the party across the world map between sites."
- **Model:** standard.

## M4 — World ↔ combat transition *(new)*
**Goal:** connect the two scales — the thing that makes it one game.
- **You can try:** move into a site/encounter on the world map, drop into its combat map with your actual party and the right enemies, finish the fight, and return to the world map with HP/state carried over.
- **Loop self-check:** the transition contract (party state owned by core, survives both directions; correct local map + encounter loads; combat end returns updated state).
- **Stop signal:** "M4 done. Go from world map into a fight and back."
- **Model:** premium for the transition contract; standard for wiring.

## M5 — Storytelling *(new framing)*
**Goal:** the narrator as a thing you experience.
- **You can try:** during exploration and combat, atmospheric prose appears, generated from the event log; trigger a scripted story beat at a site and read it.
- **Loop self-check:** narrator consumes only the event log; disabling it changes nothing mechanical.
- **Stop signal:** "M5 done. Play a bit and read the narration; trigger the beat at site X."
- **Model:** standard at build; runtime narrator uses a cheap constrained model.

## M6 — District generation + reclamation loop
**Goal:** original content and the core game loop.
- **You can try:** generate an original district from a brief; **Enter** it from the world map into a **district strategic map** (same map UI as the frontier — nodes, paths, token); walk areas, fight hostiles, and see reclamation progress as areas flip hostile → held on both district and world maps; inward difficulty tier gradient is noticeable; return to the frontier only from the district entrance.
- **Loop self-check:** generated districts pass all validator invariants; ID/label rename works as a data edit; cleared/held state persists; `mapLayer` and interior graph round-trip through campaign serialize; frozen transition contract still passes.
- **Stop signal:** "M6 done. Generate a district, enter it, clear areas on the district map, see held status persist — then return to the world map from the entrance."
- **Model:** premium for validator invariants; standard for generator + loaders. *Candidate skill: `generate-and-validate-map`.* Strategic map *art* stays procedural until M8.

## M7 — Breadth + ranged combat
**Goal:** depth on the proven foundation — a 4-hero party with bow, melee, and first scoped magic.
- **You can try:** create a **Fighter (shortbow)**, **Rogue**, **Wizard** (Ray of Frost cantrip), and **Cleric** (2-action Heal); fight new enemy types at range; see placeholder projectiles fly on hits; **hover an enemy** for HP, hit%, and damage band (from implicit class weapons/spells — no equipment picker).
- **Loop self-check:** each new action/effect ships with its contract test and rides the existing pipeline (no new mutation paths); ranged strike, CastSpell, and CastHeal tested headless; combat inspector computed in pure core from the same math as the resolver.
- **Stop signal:** "M7 done. Play a fight with bow, Ray of Frost, and Heal; hover a foe for the combat breakdown."
- **Model:** standard. *Candidate skills: `add-effect`, `add-action`.*

## M8 — Map presentation + content packs *(new)*
**Goal:** real illustrated maps at every scale — world, district, and battle — loaded through the same swappable presentation seam. Engine stays fixed; a new game is mostly new data + assets.
- **You can try:** procedural parchment strategic maps and checkerboard combat tiles are replaced (or skinned) by real art: frontier overworld background, at least one district interior map, and battle-map tile meshes / floor art for encounters; site markers, paths, and the party token sit on top of strategic artwork; swapping the content pack (manifest + graph data + image/tile refs) changes the game's look and locations without touching core rules.
- **Loop self-check:** world map, district map, and battle-map presentation read backgrounds, marker icons, path styling, and tile meshes from the asset manifest / content pack — not hardcoded paths in renderer source; world and district layers use the same `StrategicMapScreen` presentation contract; combat tile grid reads battle-map assets from the manifest; core still owns only graphs and campaign state (no image URLs in authoritative state); a second minimal pack (e.g. relabel + recolor + different backgrounds/tiles) loads and plays.
- **Stop signal:** "M8 done. Open the game — world map, a district map, and a fight all look illustrated, not procedural; drop in the alt pack and see a different map skin."
- **Model:** standard for manifest + loader wiring; N/A for producing final art (out-of-loop). *Fixed authored maps and procedurally generated graphs both remain valid — art is presentation anchored to `mapX`/`mapY` (strategic) and grid layout (battle), topology stays data.*

## M9 — Combat rules depth *(deferred from M7)*
**Goal:** PF2e mechanics that were scoped out of M7 — saves, resistances, and spell-slot economy — without changing the map or art layers.
- **You can try:** spells and effects that call for saves (e.g. Reflex / Fort / Will) resolve with visible save outcomes in the combat log; creatures with resistance or weakness show the adjusted damage; leveled spells consume per-day slots instead of acting like at-will cantrips.
- **Loop self-check:** each new rule rides the existing action → effect → state pipeline with contract tests; save resolution, resistance/weakness math, and slot spend/recovery are headless in core; no renderer mutation of authoritative state.
- **Stop signal:** "M9 done. Cast a save-based effect, hit something with resistance, and spend a leveled spell slot — all visible in the log."
- **Model:** premium if save edge cases get hairy; standard per action/effect.

## M10 — Tactical character art pass (deferred on purpose)
**Goal:** make combat *entities* look good, last, behind the seam — after maps and rules depth land.
- **You can try:** placeholder entity boxes replaced with real GLB models (Tripo/Meshy) for party and foes; battle-map tiles from M8 unchanged; game otherwise unchanged.
- **Loop self-check:** character/prop assets load via `GLTFLoader` from the manifest; not one line of core code changed.
- **Stop signal:** "M10 done. Look at it."
- **Model:** N/A (asset tools). Asset-tool MCPs become relevant here.

---

### Standing rules (all milestones)
- Two gates: tests for the loop, a playable artifact for you. Stop and report at the second.
- Never touch `/tests/contract`. One milestone per loop. Don't work ahead.
- Keep it simple — no complexity before a milestone needs it. Tests must be real (meaningful assertions; periodic Stryker mutation audit on the core), run every loop.
- Interface is usable and legible on placeholders from M1; everything mocked is flagged in the dev overlay.
- Never block on a missing asset — flagged placeholder + a row in `ASSETS_NEEDED.md`.
- Rules core stays headless. Implement PF2e rules from the vendored SRD, never from memory.
- No Paizo setting IP, no copied map layouts, ever.
