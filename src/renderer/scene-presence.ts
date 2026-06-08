/** Dev-only report of what is actually on screen vs registered elsewhere. */

export type PresenceKind = "rendered" | "manifest_only" | "procedural";

export interface PresenceEntry {
  id: string;
  kind: PresenceKind;
  detail: string;
}

export class ScenePresence {
  private readonly entries: PresenceEntry[] = [];

  registerRendered(id: string, detail: string): void {
    this.entries.push({ id, kind: "rendered", detail });
  }

  registerProcedural(id: string, detail: string): void {
    this.entries.push({ id, kind: "procedural", detail });
  }

  registerManifestOnly(id: string, detail: string): void {
    this.entries.push({ id, kind: "manifest_only", detail });
  }

  list(): readonly PresenceEntry[] {
    return this.entries;
  }
}

export function formatPresenceKind(kind: PresenceKind): string {
  switch (kind) {
    case "rendered":
      return "VISIBLE";
    case "manifest_only":
      return "MANIFEST ONLY";
    case "procedural":
      return "PROCEDURAL";
  }
}
