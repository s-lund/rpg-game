const SCREEN_ID = "emberwatch-game-over";

export interface GameOverScreenOptions {
  onReturnToCreation: () => void;
}

export class GameOverScreen {
  private readonly root: HTMLDivElement;
  private readonly onReturnToCreation: () => void;

  constructor(container: HTMLElement, options: GameOverScreenOptions) {
    this.onReturnToCreation = options.onReturnToCreation;

    this.root = document.createElement("div");
    this.root.id = SCREEN_ID;
    this.root.style.cssText = [
      "position: fixed",
      "inset: 0",
      "z-index: 9600",
      "display: none",
      "flex-direction: column",
      "align-items: center",
      "justify-content: center",
      "gap: 16px",
      "background: rgba(8, 6, 10, 0.94)",
      "color: #e8e4dc",
      "font: 16px/1.5 ui-sans-serif, system-ui, sans-serif",
      "text-align: center",
      "padding: 24px",
    ].join("; ");

    const title = document.createElement("h1");
    title.textContent = "Game Over";
    title.style.cssText = "margin: 0; font-size: 36px; font-weight: 700; color: #e07070;";
    this.root.appendChild(title);

    const message = document.createElement("p");
    message.textContent = "Your party has fallen. The frontier reclaims another hope.";
    message.style.cssText = "margin: 0; max-width: 420px; color: #a8a090;";
    this.root.appendChild(message);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Return to recruitment";
    btn.style.cssText = [
      "cursor: pointer",
      "margin-top: 8px",
      "padding: 10px 20px",
      "border: 1px solid rgba(200, 100, 100, 0.6)",
      "border-radius: 6px",
      "background: rgba(120, 40, 40, 0.35)",
      "color: #f0c0c0",
      "font: 600 14px/1 ui-sans-serif, system-ui, sans-serif",
    ].join("; ");
    btn.addEventListener("click", () => this.onReturnToCreation());
    this.root.appendChild(btn);

    container.appendChild(this.root);
  }

  show(): void {
    this.root.style.display = "flex";
  }

  hide(): void {
    this.root.style.display = "none";
  }
}
