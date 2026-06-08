import rawManifest from "./manifest.json";

export interface AssetEntry {
  placeholder?: string;
  real?: string;
}

export interface AssetManifest {
  assets: Record<string, AssetEntry>;
}

export interface ManifestSummary {
  total: number;
  withReal: number;
  withPlaceholder: number;
  placeholderOnly: number;
}

const FORBIDDEN_KEYS = new Set(["label", "name", "displayName"]);

export function validateManifest(data: unknown): AssetManifest {
  if (typeof data !== "object" || data === null || !("assets" in data)) {
    throw new Error("Manifest must have an 'assets' object");
  }

  const { assets } = data as { assets: unknown };

  if (typeof assets !== "object" || assets === null || Array.isArray(assets)) {
    throw new Error("Manifest 'assets' must be a non-null object");
  }

  for (const [id, entry] of Object.entries(assets)) {
    if (!id || typeof id !== "string") {
      throw new Error(`Invalid asset id: ${String(id)}`);
    }

    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new Error(`Asset '${id}' must be an object`);
    }

    for (const key of Object.keys(entry)) {
      if (FORBIDDEN_KEYS.has(key)) {
        throw new Error(`Asset '${id}' must not use display key '${key}' — use stable id only`);
      }
    }

    const { placeholder, real } = entry as AssetEntry;

    if (placeholder !== undefined && typeof placeholder !== "string") {
      throw new Error(`Asset '${id}'.placeholder must be a string`);
    }
    if (real !== undefined && typeof real !== "string") {
      throw new Error(`Asset '${id}'.real must be a string`);
    }
    if (!placeholder && !real) {
      throw new Error(`Asset '${id}' must have at least one of 'placeholder' or 'real'`);
    }
  }

  return data as AssetManifest;
}

export function loadManifest(): AssetManifest {
  return validateManifest(rawManifest);
}

export function summarizeManifest(manifest: AssetManifest): ManifestSummary {
  const entries = Object.values(manifest.assets);
  const withReal = entries.filter((e) => e.real).length;
  const withPlaceholder = entries.filter((e) => e.placeholder).length;
  const placeholderOnly = entries.filter((e) => e.placeholder && !e.real).length;

  return {
    total: entries.length,
    withReal,
    withPlaceholder,
    placeholderOnly,
  };
}

export function resolveAssetPath(entry: AssetEntry): string | null {
  if (entry.real) return entry.real;
  if (entry.placeholder) return entry.placeholder;
  return null;
}
