# ARCHITECTURE.md

## Three layers

```
build-time generators        runtime core (truth)            read-only consumers
─────────────────────        ───────────────────             ───────────────────
LLM proposes:                deterministic rules engine       renderer  (three.js iso)
 - map layouts          ──▶   - owns ALL game state      ──▶  narrator  (flavor text)
 - encounter seeds            - resolves actions              (anything else later)
 - district contents          - emits event log
        │                            ▲
        ▼                            │
   deterministic               consumes validated
   VALIDATOR                   structured input only
```

The LLM never holds authoritative state. At build time it *proposes* data; a validator accepts or rejects. At runtime the engine is the only thing that mutates state, and only through the effect pipeline.

**Language note:** everything is TypeScript. The rules core is *pure* TS — it imports nothing from three.js or the DOM, so it runs headless under Vitest. three.js lives only in the renderer layer.

## The action → effect → state pipeline (central invariant)

Every state change is an `Effect` produced by an `Action`, applied to state, and recorded as an `Event`. No bypasses.

```
Action  ──resolve──▶  [Effect, Effect, ...]  ──apply──▶  new State  ──record──▶  [Event, ...]
```

- **Action**: an intent (Strike, Step, Heal, Stride, Raise Shield). Carries actor, target(s), parameters. Costs action-economy points.
- **Effect**: an atomic, validated state mutation (Damage, Heal, ApplyCondition, RemoveCondition, MoveTo, GrantTempHP). The *only* thing allowed to change state.
- **State**: authoritative. Mutated exclusively by applying Effects.
- **Event**: an immutable record of what happened, appended to the event log.

**Contract test (write first, Phase 1):** assert that no code path mutates `State` except through `apply(Effect)`, and that every applied Effect produces exactly one Event. New effect types inherit this path for free. This is what makes "the healer is just an effect, and so is everything else" true forever.

## Event log schema (the seam)

Append-only list. Consumers read; they never write back.

```jsonc
{
  "seq": 1421,                  // monotonic, gap-free
  "turn": 12,
  "actor_id": "ent_fighter_01",
  "type": "DamageDealt",        // DamageDealt | Healed | ConditionApplied |
                                //   ConditionRemoved | Moved | ActionDeclared |
                                //   TurnStarted | TurnEnded | EntityDowned | ...
  "payload": {                  // type-specific, schema-validated
    "target_id": "ent_goblin_03",
    "amount": 7,
    "damage_type": "slashing",
    "from_effect": "eff_sneak_attack"
  },
  "derived_from": "act_strike_88" // the Action that caused this
}
```

- The **renderer** turns events into animations/positions on the iso grid.
- The **narrator** turns events into prose.
- Both can be absent, swapped, or rebuilt with zero core changes. Replaying the log reconstructs the entire game state.

## Map layers (strategic vs tactical)

Navigation uses **two presentation paradigms**, with **three layers** in the Emberwatch slice:

| Layer | Scale | Data | Renderer |
|-------|-------|------|----------|
| **World map** | Strategic | `WorldGraph` of frontier sites (districts, travel points) | `StrategicMapScreen` (`mapLayer: world`) |
| **District interior** | Strategic | `WorldGraph` of areas inside one district (gate, ward, market, …) | Same `StrategicMapScreen` (`mapLayer: district`) — same map UI as world; different enter/exit and encounter rules |
| **Combat** | Tactical | Per-area `TileGrid` + encounter template | Iso `CombatScene` |

- **Strategic maps** are graphs with `mapX`/`mapY`, travel edges, and an animated party token. No tactical grid.
- **Tactical maps** are the tile grids you fight on. Tile grids are validated and stored per area (for combat layout and future local exploration); M6 drops into combat on hostile arrival rather than free-roaming the grid first.

**Transition contracts:**

1. **World → district:** at a world site with a `districtId`, **Enter** sets `mapLayer: district`, loads the district's interior graph, and places the party at the district entrance area. Only the entrance area can **Return to world map**.
2. **District → combat:** arriving at a hostile area (or entering combat from there) loads that area's tactical grid and encounter; victory marks the area **held** and returns to the **district strategic map** (party stays in the district).
3. **World travel (M3):** `travelTo` on the world graph; pathfinding may skip through held/safe sites. District interior uses the same path rules via `travelWithinDistrict`.

Party and campaign state are owned by the core and survive every transition; renderers are read-only views over that state.

## Map data model (local / combat maps)

A map is a **graph of areas** plus a **tile grid per area**. Consistency is owned by a deterministic validator, never the generator.

```jsonc
// area graph
{
  "areas": [
    { "id": "area_gate_quarter", "label": "The Cinder Gate", "tier": 1 },
    { "id": "area_drowned_market", "label": "Drowned Market", "tier": 2 }
  ],
  "edges": [
    { "from": "area_gate_quarter", "to": "area_drowned_market",
      "via": "exit_north", "bidirectional": true }
  ]
}

// per-area tile grid (separate file, keyed by area id)
{
  "area_id": "area_gate_quarter",
  "width": 24, "height": 18,
  "tiles": [ /* row-major: floor | wall | door | exit_<id> | spawn | cover */ ],
  "exits": { "exit_north": { "x": 12, "y": 0, "leads_to": "area_drowned_market" } }
}
```

**ID / label split:** everything (encounters, dialogue, quests) references `id`. `label` is display only. Renaming the whole setting is a label edit; nothing breaks.

**Generate-and-validate loop (build time):**
1. LLM generates a candidate area graph + tile grids from a *design brief* (district types, tier gradient, target count). It does NOT reproduce any existing map.
2. **Validator** checks deterministic invariants, rejects + regenerates on failure:
   - every exit leads to a real area; declared edges are bidirectional
   - no overlapping or unreachable rooms; whole graph reachable from the entrance
   - spawn/cover counts within bounds; difficulty tier monotonic inward
3. Only validated data is committed.

The LLM is good at *contents and variety* (what's in a room, encounter flavor) given a checked layout; bad at *geometry*. The validator absorbs the weakness.

## Assets, placeholders, and mock flagging

Final assets are produced outside the loop (Tripo/Meshy → GLB, illustrated map PNGs/WebPs) and added later, so insertion must be frictionless and the loop must never stall waiting for art.

- **Asset manifest.** One registry maps each asset `id` to its files: `{ placeholder?, real? }`. The renderer shows `real` if present, else `placeholder`, else a primitive. Adding or replacing an asset is a manifest edit plus a file drop — no code change.
- **Content packs (M8 target).** A *pack* is swappable presentation + scenario data, not a fork of the engine: world graph, district definitions (generated or authored), encounter templates, story-beat hooks, labels, and manifest entries (strategic map backgrounds, marker icons, battle-map tile meshes). Character/prop GLBs ship in M10. The pure core reads graphs and rules; renderers read the manifest. **Fixed illustrated maps** and **procedurally generated layouts** are both supported — topology and reclamation stay in validated graph data; artwork is a skin anchored to site `mapX`/`mapY` (strategic) and grid layout (battle). Shipping a different game is mostly a new pack, not a rewrite.
- **Placeholders are cheap and need not match the final medium.** A 32×32 image on a billboard quad, or a flat-colored box, is a fine stand-in for a goblin whose final form is a rigged GLB.
- **Mock flagging.** A dev-only overlay reads the manifest (and the mock-data providers below) and badges anything that is a placeholder, mock, or stub, so the human can tell real from stand-in at a glance. Off in release builds.
- **Asset requests.** When the loop needs an asset that doesn't exist, it appends a structured row to `ASSETS_NEEDED.md` (`id, type, dimensions, view, one-line description`), then proceeds on a flagged placeholder. Fulfilling a request is a drop-in.
- **Mock data, same rule.** Systems whose dependencies aren't built yet (e.g. world-map UI before generation exists) run against mock-data providers, always flagged, swapped for the real provider when it lands.

## Rendering approach (three.js)

- **2.5D:** real-time 3D models (GLB) under a fixed isometric camera. Consistency is free vs. 2D sprite drift, and AI tools generate GLB directly — no manual modeling.
- **Loading assets:** three.js `GLTFLoader` reads Tripo/Meshy GLB exports natively, including rig + animation clips.
- **Picking / input:** three.js raycasting from the iso camera for tile/entity selection.
- **Navigation:** Fallout-style free isometric exploration; turn-based action-point movement on the *same* view when initiative triggers. Decide the explore↔combat mode transition deliberately — it drives the AP economy and pathfinding.
- **Placeholder-first:** primitive meshes (boxes/capsules) + flat colored tiles until the slice plays well. World, district, and battle-map illustration land in M8; combat rules depth in M9; character/prop GLBs in M10 — all behind the event-log seam. Defer character art; worst effort-to-payoff at slice stage.
