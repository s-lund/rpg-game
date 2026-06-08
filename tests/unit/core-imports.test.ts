import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CORE_DIR = join(process.cwd(), "src/core");
const FORBIDDEN_IMPORTS = ["three", "three/", "three/examples"];

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

function findForbiddenImports(source: string): string[] {
  const importPattern =
    /(?:import\s+.*?\s+from\s+['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\))/g;
  const hits: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = importPattern.exec(source)) !== null) {
    const specifier = match[1] ?? match[2];
    if (FORBIDDEN_IMPORTS.some((blocked) => specifier === blocked || specifier.startsWith(blocked))) {
      hits.push(specifier);
    }
  }

  return hits;
}

describe("core layer boundary", () => {
  it("never imports three.js", () => {
    const violations: string[] = [];

    for (const file of listTsFiles(CORE_DIR)) {
      const source = readFileSync(file, "utf-8");
      const hits = findForbiddenImports(source);
      if (hits.length > 0) {
        violations.push(`${file}: ${hits.join(", ")}`);
      }
    }

    expect(violations).toEqual([]);
  });
});
