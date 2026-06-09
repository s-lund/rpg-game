const PANEL_ID = "emberwatch-narrator-panel";

export class NarratorPanel {
  private readonly root: HTMLDivElement;
  private readonly bodyEl: HTMLDivElement;
  private readonly toggleEl: HTMLInputElement;
  private enabled = true;
  private onEnabledChange: ((enabled: boolean) => void) | null = null;

  constructor(container: HTMLElement) {
    this.root = document.createElement("div");
    this.root.id = PANEL_ID;
    this.root.style.cssText = [
      "position: fixed",
      "top: 12px",
      "right: 12px",
      "z-index: 9520",
      "width: min(320px, 40vw)",
      "max-height: 40vh",
      "display: none",
      "flex-direction: column",
      "padding: 10px 12px",
      "background: rgba(12, 14, 22, 0.92)",
      "border: 1px solid rgba(140, 120, 180, 0.45)",
      "border-radius: 6px",
      "color: #d8d4cc",
      "font: 13px/1.5 ui-serif, Georgia, serif",
      "pointer-events: auto",
      "box-shadow: 0 4px 20px rgba(0,0,0,0.35)",
    ].join(";");

    const header = document.createElement("div");
    header.style.cssText = [
      "display: flex",
      "align-items: center",
      "justify-content: space-between",
      "gap: 8px",
      "margin-bottom: 8px",
      "font: 600 11px/1 ui-sans-serif, system-ui, sans-serif",
      "letter-spacing: 0.06em",
      "text-transform: uppercase",
      "color: #a898c8",
    ].join("; ");

    const title = document.createElement("span");
    title.textContent = "Narration";
    header.appendChild(title);

    const toggleLabel = document.createElement("label");
    toggleLabel.style.cssText =
      "display:flex;align-items:center;gap:4px;cursor:pointer;font-size:11px;color:#9a9080;text-transform:none;letter-spacing:0;";
    this.toggleEl = document.createElement("input");
    this.toggleEl.type = "checkbox";
    this.toggleEl.checked = true;
    this.toggleEl.addEventListener("change", () => {
      this.enabled = this.toggleEl.checked;
      this.onEnabledChange?.(this.enabled);
    });
    toggleLabel.appendChild(this.toggleEl);
    toggleLabel.appendChild(document.createTextNode("On"));
    header.appendChild(toggleLabel);

    this.root.appendChild(header);

    this.bodyEl = document.createElement("div");
    this.bodyEl.style.cssText = "overflow-y: auto; flex: 1;";
    this.root.appendChild(this.bodyEl);

    container.appendChild(this.root);
    this.render();
  }

  setOnEnabledChange(handler: (enabled: boolean) => void): void {
    this.onEnabledChange = handler;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  show(): void {
    this.root.style.display = "flex";
  }

  hide(): void {
    this.root.style.display = "none";
  }

  /** Replace with the current location only — past places are not kept. */
  setCurrentPlace(label: string, lines: string[]): void {
    if (!this.enabled) return;
    this.renderPlace(label, lines);
  }

  appendCurrentLine(line: string): void {
    if (!this.enabled) return;
    const section = this.bodyEl.querySelector<HTMLElement>("[data-narrator-body]");
    if (!section) return;
    const p = document.createElement("p");
    p.style.cssText = "margin:0 0 8px;font-style:italic;color:#c8c0b4;";
    p.textContent = line;
    section.appendChild(p);
  }

  destroy(): void {
    this.root.remove();
  }

  private renderPlace(label: string, lines: string[]): void {
    if (lines.length === 0) {
      this.bodyEl.innerHTML =
        '<span style="color:#6a6458;font-style:normal;font-size:12px;">Place impressions appear here as you travel.</span>';
      return;
    }
    const body = lines
      .map(
        (line) =>
          `<p style="margin:0 0 8px;font-style:italic;color:#c8c0b4;">${escapeHtml(line)}</p>`,
      )
      .join("");
    this.bodyEl.innerHTML = [
      `<div style="font:600 11px/1.2 ui-sans-serif,system-ui,sans-serif;color:#c9a86c;margin-bottom:6px;letter-spacing:0.03em;">${escapeHtml(label)}</div>`,
      `<div data-narrator-body>${body}</div>`,
    ].join("");
  }

  private render(): void {
    this.renderPlace("", []);
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
