import { describe, expect, it } from "vitest";
import { CORE_VERSION } from "../../src/core/index";

describe("core", () => {
  it("exports and runs headless", () => {
    expect(CORE_VERSION).toBe("0.0.0-m0");
  });
});
