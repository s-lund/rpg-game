import type { WorldGraph } from "../world/types";

export const M3_DEMO_GRAPH: WorldGraph = {
  id: "m3_demo",
  sites: [
    {
      id: "site_cinder_gate",
      label: "The Cinder Gate",
      tier: 1,
      encounterId: "enc_cinder_gate",
      mapX: 22,
      mapY: 72,
    },
    {
      id: "site_drowned_market",
      label: "Drowned Market",
      tier: 2,
      encounterId: "enc_drowned_market",
      mapX: 38,
      mapY: 52,
    },
    {
      id: "site_ash_foundry",
      label: "Ash Foundry",
      tier: 2,
      encounterId: "enc_ash_foundry",
      mapX: 62,
      mapY: 48,
    },
    {
      id: "site_bell_tower_ruins",
      label: "Bell Tower Ruins",
      tier: 3,
      encounterId: "enc_bell_tower",
      mapX: 50,
      mapY: 18,
    },
  ],
  edges: [
    { from: "site_cinder_gate", to: "site_drowned_market", bidirectional: true },
    { from: "site_drowned_market", to: "site_ash_foundry", bidirectional: true },
    { from: "site_ash_foundry", to: "site_bell_tower_ruins", bidirectional: true },
    { from: "site_cinder_gate", to: "site_ash_foundry", bidirectional: false },
  ],
  startSiteId: "site_cinder_gate",
};
