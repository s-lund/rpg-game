import type { SiteId } from "../../shared/ids";
import type { WorldGraph } from "../../core/index";

/**
 * The Emberwatch Frontier — authored world map. Positions are percentages
 * matched 1:1 by the painted map (art/emberwatch/world.svg, 1000×750 canvas).
 */
export const EMBERWATCH_WORLD: WorldGraph = {
  id: "graph_world_emberwatch",
  startSiteId: "site_emberwatch_gate",
  sites: [
    {
      id: "site_emberwatch_gate",
      label: "Emberwatch Gate",
      tier: 1,
      siteKind: "shelter",
      mapX: 20,
      mapY: 78,
    },
    {
      id: "site_ashen_road",
      label: "The Ashen Road",
      tier: 1,
      encounterId: "enc_ashen_road",
      mapX: 34,
      mapY: 64,
    },
    {
      id: "site_pilgrims_rest",
      label: "Pilgrim's Rest",
      tier: 1,
      siteKind: "shelter",
      mapX: 52,
      mapY: 72,
    },
    {
      id: "site_drowned_quay",
      label: "The Drowned Quay",
      tier: 2,
      siteKind: "quest",
      districtId: "district_drowned_quay",
      mapX: 18,
      mapY: 46,
    },
    {
      id: "site_watchers_bridge",
      label: "Watcher's Bridge",
      tier: 2,
      encounterId: "enc_watchers_bridge",
      mapX: 44,
      mapY: 50,
    },
    {
      id: "site_cinder_market",
      label: "Cinder Market",
      tier: 2,
      encounterId: "enc_cinder_market",
      mapX: 62,
      mapY: 56,
    },
    {
      id: "site_bell_spire",
      label: "The Bell Spire",
      tier: 3,
      siteKind: "quest",
      districtId: "district_bell_spire",
      mapX: 52,
      mapY: 30,
    },
    {
      id: "site_ember_vaults",
      label: "The Ember Vaults",
      tier: 3,
      siteKind: "quest",
      districtId: "district_ember_vaults",
      mapX: 76,
      mapY: 38,
    },
    {
      id: "site_last_light_chapel",
      label: "Chapel of the Last Light",
      tier: 3,
      siteKind: "quest",
      mapX: 70,
      mapY: 18,
    },
  ],
  edges: [
    { from: "site_emberwatch_gate", to: "site_ashen_road", bidirectional: true },
    { from: "site_ashen_road", to: "site_pilgrims_rest", bidirectional: true },
    { from: "site_ashen_road", to: "site_drowned_quay", bidirectional: true },
    { from: "site_ashen_road", to: "site_watchers_bridge", bidirectional: true },
    { from: "site_drowned_quay", to: "site_watchers_bridge", bidirectional: true },
    { from: "site_watchers_bridge", to: "site_bell_spire", bidirectional: true },
    { from: "site_watchers_bridge", to: "site_cinder_market", bidirectional: true },
    { from: "site_pilgrims_rest", to: "site_cinder_market", bidirectional: true },
    { from: "site_cinder_market", to: "site_ember_vaults", bidirectional: true },
    { from: "site_bell_spire", to: "site_last_light_chapel", bidirectional: true },
    { from: "site_ember_vaults", to: "site_last_light_chapel", bidirectional: true },
  ],
};

/** Per-site ambient prose; the narrator falls back to a generic line for anything missing. */
export const EMBERWATCH_AMBIENCE: Record<SiteId, string> = {
  // World layer
  site_emberwatch_gate:
    "The last held gate of the frontier. Watchfires gutter along the palisade, and the road beyond runs into ash.",
  site_ashen_road:
    "Cart ruts vanish under drifts of grey. Burnt milestones count the distance to places that no longer answer.",
  site_pilgrims_rest:
    "A waystation with its roof half-patched. Someone still sweeps the step, out of habit or defiance.",
  site_drowned_quay:
    "Masts lean out of black water like grave markers. The tide moves through sunken doorways with a sound like breathing.",
  site_watchers_bridge:
    "The old toll bridge groans over a swollen channel. Whatever watched from its towers has been replaced by something else.",
  site_cinder_market:
    "Stalls stand in rows of char. A scale still hangs from one awning, weighing smoke.",
  site_bell_spire:
    "The spire leans against the clouds, its great bell silent. Climbers say the stairs creak in answer to footsteps no one takes.",
  site_ember_vaults:
    "A cracked cathedral floor opens onto descending dark. Warm air rises from below, smelling of cold iron and old fire.",
  site_last_light_chapel:
    "A chapel scoured to bare stone. Through the broken rose window, the frontier looks almost peaceful.",

  // The Drowned Quay
  site_quay_gate:
    "Barnacled chains bar the harbor gate. Salt has eaten the hinges to lace.",
  site_fishrow:
    "Fishrow's stalls shelter the quay's few holdouts. Nets hang as walls; lamplight pools on wet stone.",
  site_pier_row:
    "Piers stagger out over the swell, half their planks gone to the tide.",
  site_salt_warehouse:
    "Crates of spoiled salt-catch tower in the gloom. Something moves between the rows.",
  site_sunken_chapel:
    "The chapel floor lies under a foot of seawater. Votive candles float, long extinguished.",
  site_harbormasters:
    "The Harbormaster's Hall still keeps its ledgers — and its master, who never left.",

  // The Bell Spire
  site_spire_gatehouse:
    "The gatehouse doors hang open. Dust falls in slow spirals from the dark overhead.",
  site_great_hall:
    "Echoes outlive their voices here. The hall answers your steps a beat too late.",
  site_broken_stair:
    "The stair winds upward past missing flights. Wind moans through the gaps like a low bell.",
  site_bell_gallery:
    "Bronze bells hang in ranked silence. The ropes are gone; something cut them.",
  site_wardens_walk:
    "A sheltered walk circles the spire below the crown. The wind is clean here, and the frontier spreads out small and far.",
  site_spire_crown:
    "The crown platform holds the great bell and its last warden. Neither has rung true in years.",

  // The Ember Vaults
  site_vault_door:
    "The vault door stands ajar on darkness. The stone around it is warm to the touch.",
  site_bone_walk:
    "Ossuary niches line the walk, bones stacked with terrible neatness. Some niches are empty.",
  site_ember_cistern:
    "A cistern of embers that never cool. Their light crawls along the ceiling like slow water.",
  site_reliquary:
    "Reliquaries lie pried open, their saints evicted. What was kept in is now kept out.",
  site_ember_heart:
    "The deep vault opens around a core of banked fire. It beats. It has noticed you.",
};
