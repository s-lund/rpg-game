import type { ManifestSummary } from "./assets/load-manifest";
import {
  formatPresenceKind,
  type PresenceEntry,
  type ScenePresence,
} from "./scene-presence";

const OVERLAY_ID = "emberwatch-dev-overlay";

export interface AcceptanceItem {
  id: string;
  label: string;
  proof: "visual" | "overlay" | "test";
  how: string;
}

export interface DevOverlayState {
  summary: ManifestSummary;
  presence: ScenePresence;
  acceptance: AcceptanceItem[];
}

const PROOF_LABEL: Record<AcceptanceItem["proof"], string> = {
  visual: "LOOK",
  overlay: "OVERLAY",
  test: "TEST",
};

const KIND_COLOR: Record<string, string> = {
  VISIBLE: "#6fcf97",
  "MANIFEST ONLY": "#ffb43c",
  PROCEDURAL: "#7eb8ff",
};

export class DevOverlay {
  private element: HTMLDivElement | null = null;
  private visible = false;
  private state: DevOverlayState | null = null;

  constructor(private readonly enabled: boolean) {
    if (!enabled) return;
    this.createElement();
    this.bindToggle();
  }

  setState(state: DevOverlayState): void {
    this.state = state;
    if (this.visible) {
      this.renderContent();
    }
  }

  toggle(): void {
    if (!this.enabled || !this.element) return;
    this.visible = !this.visible;
    this.element.style.display = this.visible ? "block" : "none";
    if (this.visible) {
      this.renderContent();
    }
  }

  isVisible(): boolean {
    return this.visible;
  }

  private createElement(): void {
    this.element = document.createElement("div");
    this.element.id = OVERLAY_ID;
    this.element.style.cssText = [
      "display: none",
      "position: fixed",
      "top: 12px",
      "right: 12px",
      "z-index: 10000",
      "min-width: 280px",
      "max-width: 360px",
      "max-height: 85vh",
      "overflow-y: auto",
      "padding: 12px 14px",
      "background: rgba(12, 14, 22, 0.92)",
      "border: 1px solid rgba(255, 180, 60, 0.55)",
      "border-radius: 6px",
      "color: #e8e4dc",
      "font: 12px/1.5 ui-monospace, Consolas, monospace",
      "pointer-events: none",
      "box-shadow: 0 4px 24px rgba(0,0,0,0.45)",
    ].join(";");
    document.body.appendChild(this.element);
  }

  private bindToggle(): void {
    window.addEventListener("keydown", (event) => {
      if (event.key === "F3" || event.key === "`" || event.key === "~") {
        event.preventDefault();
        this.toggle();
      }
    });
  }

  private renderContent(): void {
    if (!this.element) return;

    const state = this.state;
    const sections: string[] = [
      "<strong style='color:#ffb43c'>Dev Overlay</strong>",
      "<span style='color:#888'>F3 / ~ to toggle</span>",
    ];

    if (!state) {
      sections.push("", "Loading…");
      this.element.innerHTML = sections.join("<br>");
      return;
    }

    sections.push("", "<strong>Presence</strong>");
    sections.push(
      "<span style='color:#888'>What exists vs what you can see</span>",
    );

    for (const entry of state.presence.list()) {
      sections.push(this.formatPresenceLine(entry));
    }

    sections.push(
      "",
      "<strong>Manifest</strong>",
      `total ${state.summary.total} · real ${state.summary.withReal} · placeholder ${state.summary.withPlaceholder}`,
    );

    sections.push("", "<strong>Acceptance (M0)</strong>");
    for (const item of state.acceptance) {
      const tag = PROOF_LABEL[item.proof];
      const tagColor =
        item.proof === "visual" ? "#6fcf97" : item.proof === "overlay" ? "#ffb43c" : "#7eb8ff";
      sections.push(
        `<span style='color:${tagColor}'>[${tag}]</span> ${this.escapeHtml(item.label)}`,
        `<span style='color:#888;margin-left:8px'>→ ${this.escapeHtml(item.how)}</span>`,
      );
    }

    this.element.innerHTML = sections.join("<br>");
  }

  private formatPresenceLine(entry: PresenceEntry): string {
    const kind = formatPresenceKind(entry.kind);
    const color = KIND_COLOR[kind] ?? "#e8e4dc";
    return [
      `<span style='color:${color}'>[${kind}]</span>`,
      `<strong>${this.escapeHtml(entry.id)}</strong>`,
      `<span style='color:#aaa'>— ${this.escapeHtml(entry.detail)}</span>`,
    ].join(" ");
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
}
