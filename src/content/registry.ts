import type { ContentPack } from "../core/index";
import type { PackId } from "../shared/ids";
import { EMBERWATCH_MANIFEST_ENTRIES, EMBERWATCH_PACK } from "./emberwatch/pack";
import { MIRRORMARSH_MANIFEST_ENTRIES, MIRRORMARSH_PACK } from "./mirrormarsh/pack";

export interface RegisteredPack {
  pack: ContentPack;
  /** Asset id → file entries this pack contributes to the manifest. */
  manifestEntries: Record<string, { real?: string; placeholder?: string }>;
}

/** All shippable content packs. Adding a pack = add data + art + one entry here. */
export const PACK_REGISTRY: Record<PackId, RegisteredPack> = {
  pack_emberwatch: {
    pack: EMBERWATCH_PACK,
    manifestEntries: EMBERWATCH_MANIFEST_ENTRIES,
  },
  pack_mirrormarsh: {
    pack: MIRRORMARSH_PACK,
    manifestEntries: MIRRORMARSH_MANIFEST_ENTRIES,
  },
};

export const DEFAULT_PACK_ID: PackId = "pack_emberwatch";

export function getPack(packId: PackId): RegisteredPack {
  const entry = PACK_REGISTRY[packId];
  if (!entry) {
    throw new Error(`unknown content pack: ${packId}`);
  }
  return entry;
}

export function listPacks(): { id: PackId; label: string; description?: string }[] {
  return Object.values(PACK_REGISTRY).map(({ pack }) => ({
    id: pack.id,
    label: pack.label,
    description: pack.description,
  }));
}

/** Pack owning a campaign's world graph id — how saved games find their content. */
export function findPackByGraphId(graphId: string): RegisteredPack | null {
  for (const entry of Object.values(PACK_REGISTRY)) {
    if (entry.pack.worldGraph.id === graphId) return entry;
  }
  return null;
}
