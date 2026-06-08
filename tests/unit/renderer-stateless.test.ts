import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const RENDERER_DIR = join(process.cwd(), "src/renderer");

const FORBIDDEN_STATE_FIELDS = [
  /\bhp\s*[:=]/,
  /\bactionPoints\s*[:=]/,
  /\bmaxHp\s*[:=]/,
  /\bconditions\s*[:=]/,
  /\bcombat\s*[:=]/,
  /\bentities\s*[:=]/,
  /\beventLog\s*[:=]/,
];

const ALLOWED_FILES = new Set([
  join(RENDERER_DIR, "combat-scene.ts").replace(/\\/g, "/"),
]);

function listTsFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      files.push(...listTsFiles(fullPath));
    } else if (entry.endsWith(".ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

describe("renderer stateless contract", () => {
  it("combat scene does not declare authoritative game-state fields", () => {
    const combatScenePath = join(RENDERER_DIR, "combat-scene.ts");
    const source = readFileSync(combatScenePath, "utf-8");

    expect(source).toContain("onEvent(");
    expect(source).not.toMatch(/private\s+gameState/);
    expect(source).not.toMatch(/private\s+entities/);
  });

  it("renderer layer avoids storing combat state on classes (except event-driven view cache)", () => {
    const violations: string[] = [];

    for (const file of listTsFiles(RENDERER_DIR)) {
      const normalized = file.replace(/\\/g, "/");
      if (normalized.endsWith("/combat-session.ts")) continue;
      if (normalized.endsWith("/combat-scene.ts")) continue;
      if (normalized.endsWith("/combat-hud.ts")) continue;
      if (normalized.endsWith("/creation-screen.ts")) continue;
      if (normalized.endsWith("/world-map-session.ts")) continue;
      if (normalized.endsWith("/world-map-screen.ts")) continue;

      const source = readFileSync(file, "utf-8");
      if (!source.includes("class ")) continue;

      for (const pattern of FORBIDDEN_STATE_FIELDS) {
        if (pattern.test(source) && !ALLOWED_FILES.has(normalized)) {
          violations.push(`${normalized}: ${pattern}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
