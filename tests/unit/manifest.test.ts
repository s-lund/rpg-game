import { describe, expect, it } from "vitest";
import {
  loadManifest,
  summarizeManifest,
  validateManifest,
} from "../../src/renderer/assets/load-manifest";

describe("asset manifest", () => {
  it("loads and validates the committed manifest", () => {
    const manifest = loadManifest();

    expect(manifest.assets).toBeDefined();
    expect(manifest.assets.tile_floor).toEqual({
      placeholder: "primitives/flat-gray.png",
    });
    expect(manifest.assets.fighter_token).toEqual({
      placeholder: "primitives/box-blue.glb",
    });
  });

  it("summarizes placeholder vs real counts", () => {
    const summary = summarizeManifest(loadManifest());

    expect(summary.total).toBe(2);
    expect(summary.withReal).toBe(0);
    expect(summary.withPlaceholder).toBe(2);
    expect(summary.placeholderOnly).toBe(2);
  });

  it("rejects manifests missing assets", () => {
    expect(() => validateManifest({})).toThrow(/assets/);
  });

  it("rejects entries without placeholder or real", () => {
    expect(() =>
      validateManifest({ assets: { bad_entry: {} } }),
    ).toThrow(/at least one/);
  });
});
