import { describe, expect, it } from "vitest";
import { M3_DEMO_GRAPH } from "../../src/core/scenarios/m3-demo";
import type { WorldGraph } from "../../src/core/world/types";
import {
  getNeighbors,
  loadWorldGraph,
  validateWorldGraph,
} from "../../src/core/world/validate";

describe("world graph validation", () => {
  it("accepts the M3 demo graph", () => {
    const result = validateWorldGraph(M3_DEMO_GRAPH);
    expect(result).toEqual({ ok: true });
  });

  it("rejects duplicate site IDs", () => {
    const graph: WorldGraph = {
      ...M3_DEMO_GRAPH,
      sites: [
        { id: "site_cinder_gate", label: "A", tier: 1, mapX: 10, mapY: 10 },
        { id: "site_cinder_gate", label: "B", tier: 1, mapX: 20, mapY: 20 },
      ],
    };
    const result = validateWorldGraph(graph);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("duplicate"))).toBe(true);
    }
  });

  it("rejects edges referencing unknown sites", () => {
    const graph: WorldGraph = {
      ...M3_DEMO_GRAPH,
      edges: [{ from: "site_cinder_gate", to: "site_nowhere", bidirectional: true }],
    };
    const result = validateWorldGraph(graph);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("site_nowhere"))).toBe(true);
    }
  });

  it("rejects empty graph", () => {
    const graph: WorldGraph = {
      id: "empty",
      sites: [],
      edges: [],
      startSiteId: "site_cinder_gate",
    };
    const result = validateWorldGraph(graph);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("site"))).toBe(true);
    }
  });

  it("rejects invalid startSiteId", () => {
    const graph: WorldGraph = {
      ...M3_DEMO_GRAPH,
      startSiteId: "site_missing",
    };
    const result = validateWorldGraph(graph);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("startSiteId"))).toBe(true);
    }
  });

  it("rejects unreachable sites from start", () => {
    const graph: WorldGraph = {
      ...M3_DEMO_GRAPH,
      sites: [
        ...M3_DEMO_GRAPH.sites,
        { id: "site_island", label: "Lonely Isle", tier: 9, mapX: 90, mapY: 90 },
      ],
    };
    const result = validateWorldGraph(graph);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("unreachable"))).toBe(true);
    }
  });

  it("getNeighbors returns bidirectional and one-way edges correctly", () => {
    const graph: WorldGraph = {
      id: "neighbor_test",
      sites: [
        { id: "site_a", label: "A", tier: 1, mapX: 20, mapY: 50 },
        { id: "site_b", label: "B", tier: 1, mapX: 50, mapY: 50 },
        { id: "site_c", label: "C", tier: 1, mapX: 80, mapY: 50 },
      ],
      edges: [
        { from: "site_a", to: "site_b", bidirectional: true },
        { from: "site_a", to: "site_c", bidirectional: false },
      ],
      startSiteId: "site_a",
    };

    expect(getNeighbors(graph, "site_a").sort()).toEqual(["site_b", "site_c"]);
    expect(getNeighbors(graph, "site_b")).toEqual(["site_a"]);
    expect(getNeighbors(graph, "site_c")).toEqual([]);
  });

  it("getNeighbors for demo graph from start site", () => {
    const neighbors = getNeighbors(M3_DEMO_GRAPH, "site_cinder_gate");
    expect(neighbors.sort()).toEqual(["site_ash_foundry", "site_drowned_market"]);
  });

  it("loadWorldGraph validates and returns graph", () => {
    const loaded = loadWorldGraph(M3_DEMO_GRAPH);
    expect(loaded.id).toBe("m3_demo");
    expect(loaded.startSiteId).toBe("site_cinder_gate");
  });

  it("rejects sites with missing or out-of-bounds map position", () => {
    const graph: WorldGraph = {
      ...M3_DEMO_GRAPH,
      sites: [{ id: "site_cinder_gate", label: "Gate", tier: 1, mapX: 150, mapY: 50 }],
    };
    const result = validateWorldGraph(graph);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("map position"))).toBe(true);
    }
  });

  it("loadWorldGraph throws on invalid graph", () => {
    expect(() =>
      loadWorldGraph({
        ...M3_DEMO_GRAPH,
        startSiteId: "site_missing",
      }),
    ).toThrow();
  });
});
