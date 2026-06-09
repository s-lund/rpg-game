const PANEL_ID = "emberwatch-combat-log";
const MAX_LINES = 40;

export class CombatLogPanel {
  private readonly root: HTMLDivElement;
  private readonly linesEl: HTMLDivElement;
  private lines: string[] = [];

  constructor(container: HTMLElement) {
    this.root = document.createElement("div");
    this.root.id = PANEL_ID;
    this.root.style.cssText = [
      "position: fixed",
      "top: 12px",
      "right: 12px",
      "z-index: 9520",
      "width: min(360px, 42vw)",
      "max-height: 50vh",
      "display: none",
      "flex-direction: column",
      "padding: 10px 12px",
      "background: rgba(10, 12, 18, 0.94)",
      "border: 1px solid rgba(100, 140, 200, 0.45)",
      "border-radius: 6px",
      "color: #d0d4dc",
      "font: 12px/1.45 ui-monospace, Consolas, monospace",
      "pointer-events: auto",
      "box-shadow: 0 4px 20px rgba(0,0,0,0.35)",
    ].join(";");

    const title = document.createElement("div");
    title.textContent = "Combat log";
    title.style.cssText = [
      "margin-bottom: 8px",
      "font: 600 11px/1 ui-sans-serif, system-ui, sans-serif",
      "letter-spacing: 0.06em",
      "text-transform: uppercase",
      "color: #7eb8ff",
    ].join("; ");
    this.root.appendChild(title);

    this.linesEl = document.createElement("div");
    this.linesEl.style.cssText = "overflow-y: auto; flex: 1;";
    this.root.appendChild(this.linesEl);

    container.appendChild(this.root);
    this.render();
  }

  show(): void {
    this.root.style.display = "flex";
  }

  hide(): void {
    this.root.style.display = "none";
  }

  clear(): void {
    this.lines = [];
    this.render();
  }

  appendLines(newLines: string[]): void {
    if (newLines.length === 0) return;
    this.lines.push(...newLines);
    if (this.lines.length > MAX_LINES) {
      this.lines = this.lines.slice(-MAX_LINES);
    }
    this.render();
  }

  destroy(): void {
    this.root.remove();
  }

  private render(): void {
    if (this.lines.length === 0) {
      this.linesEl.innerHTML =
        '<span style="color:#6a7080;font-family:ui-sans-serif,system-ui,sans-serif;">Actions and dice rolls appear here.</span>';
      return;
    }
    this.linesEl.innerHTML = this.lines
      .map((line) => `<div style="margin:0 0 4px;">${escapeHtml(line)}</div>`)
      .join("");
    this.linesEl.scrollTop = this.linesEl.scrollHeight;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
