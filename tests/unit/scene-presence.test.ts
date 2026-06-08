import { describe, expect, it } from "vitest";
import {
  formatPresenceKind,
  ScenePresence,
} from "../../src/renderer/scene-presence";

describe("scene presence", () => {
  it("tracks procedural, rendered, and manifest-only entries", () => {
    const presence = new ScenePresence();
    presence.registerProcedural("tile_grid", "stand-in");
    presence.registerManifestOnly("fighter_token", "not on scene");
    presence.registerRendered("goblin_token", "box mesh");

    expect(presence.list()).toEqual([
      { id: "tile_grid", kind: "procedural", detail: "stand-in" },
      { id: "fighter_token", kind: "manifest_only", detail: "not on scene" },
      { id: "goblin_token", kind: "rendered", detail: "box mesh" },
    ]);
  });

  it("formats presence kinds for overlay badges", () => {
    expect(formatPresenceKind("rendered")).toBe("VISIBLE");
    expect(formatPresenceKind("manifest_only")).toBe("MANIFEST ONLY");
    expect(formatPresenceKind("procedural")).toBe("PROCEDURAL");
  });
});
