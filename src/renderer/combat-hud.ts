import type { GameState } from "../core/index";

const HUD_ID = "emberwatch-combat-hud";
const END_TURN_BTN_ID = "emberwatch-end-turn-btn";

export class CombatHud {
  private element: HTMLDivElement;
  private buttonEl: HTMLButtonElement;
  private onEndTurn: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.element = document.createElement("div");
    this.element.id = HUD_ID;
    this.element.style.cssText = [
      "position: fixed",
      "bottom: 12px",
      "left: 12px",
      "z-index: 9000",
      "min-width: 280px",
      "max-width: 400px",
      "padding: 10px 12px",
      "background: rgba(12, 14, 22, 0.92)",
      "border: 1px solid rgba(100, 140, 200, 0.45)",
      "border-radius: 6px",
      "color: #e8e4dc",
      "font: 13px/1.45 ui-sans-serif, system-ui, sans-serif",
      "pointer-events: none",
    ].join(";");
    container.appendChild(this.element);

    this.buttonEl = document.createElement("button");
    this.buttonEl.id = END_TURN_BTN_ID;
    this.buttonEl.type = "button";
    this.buttonEl.textContent = "End Turn";
    this.buttonEl.style.cssText = [
      "pointer-events: auto",
      "cursor: pointer",
      "margin-top: 8px",
      "padding: 8px 16px",
      "width: 100%",
      "border: 1px solid rgba(255, 180, 60, 0.7)",
      "border-radius: 5px",
      "background: rgba(255, 180, 60, 0.18)",
      "color: #ffb43c",
      "font: 600 13px/1 ui-sans-serif, system-ui, sans-serif",
    ].join(";");
    this.buttonEl.addEventListener("click", () => this.onEndTurn?.());
    this.element.appendChild(this.buttonEl);

    this.renderEmpty();
  }

  setOnEndTurn(handler: () => void): void {
    this.onEndTurn = handler;
  }

  update(state: GameState): void {
    const active = state.combat.activeActorId
      ? state.entities[state.combat.activeActorId]
      : null;

    const lines: string[] = [
      "<strong style='color:#7eb8ff'>Combat</strong>",
      `Round ${state.combat.round} · Phase: ${state.combat.phase}`,
    ];

    if (state.combat.phase === "victory") {
      lines.push("", "<span style='color:#6fcf97'>Victory — encounter cleared.</span>");
      this.buttonEl.style.display = "none";
    } else if (state.combat.phase === "defeat") {
      lines.push("", "<span style='color:#e07070'>Defeat.</span>");
      this.buttonEl.style.display = "none";
    } else if (active) {
      const isPartyTurn = active.team === "party";

      if (isPartyTurn) {
        lines.push(
          "",
          `<strong style='color:#ffb43c'>Your turn: ${escapeHtml(active.label)}</strong>`,
          `<span style='color:#aaa'>${active.actionPoints} action point${active.actionPoints === 1 ? "" : "s"} left</span>`,
          "",
          "<strong>What to do</strong>",
          "1. Click a <strong>party token</strong> to select them (active character is auto-selected).",
          "2. Click a <strong>tile</strong> to move — each tile costs 1 AP.",
          "3. Click an <strong>adjacent enemy</strong> to Strike — costs 1 AP.",
          `4. Click <strong>End Turn</strong> below when you are done (or press <kbd style='background:#333;padding:1px 5px;border-radius:3px'>E</kbd>).`,
        );
        this.buttonEl.textContent = "End Turn";
        this.buttonEl.style.display = "block";
        this.buttonEl.disabled = false;
        this.buttonEl.style.opacity = "1";
        this.buttonEl.style.cursor = "pointer";
      } else {
        lines.push(
          "",
          `<span style='color:#aaa'>${escapeHtml(active.label)}'s turn (enemy) — passing automatically…</span>`,
        );
        this.buttonEl.style.display = "none";
      }

      lines.push(
        "",
        `<span style='color:#888'>Active:</span> ${escapeHtml(active.label)} (${active.actionPoints} AP)`,
      );
    }

    lines.push("", "<strong>Party</strong>");
    for (const entity of Object.values(state.entities)) {
      if (entity.team !== "party") continue;
      const cond = entity.conditions.length ? ` [${entity.conditions.join(", ")}]` : "";
      const status = entity.downed ? " DOWN" : "";
      const marker =
        entity.id === state.combat.activeActorId ? " <span style='color:#ffb43c'>← active</span>" : "";
      lines.push(
        `${escapeHtml(entity.label)}: ${entity.hp}/${entity.maxHp} HP · AC ${entity.ac} · +${entity.attackBonus} atk · ${entity.actionPoints} AP${cond}${status}${marker}`,
      );
    }

    lines.push("", "<strong>Enemies</strong>");
    for (const entity of Object.values(state.entities)) {
      if (entity.team !== "enemy") continue;
      const cond = entity.conditions.length ? ` [${entity.conditions.join(", ")}]` : "";
      const status = entity.downed ? " DOWN" : "";
      lines.push(
        `${escapeHtml(entity.label)}: ${entity.hp}/${entity.maxHp} HP${cond}${status}`,
      );
    }

    this.element.innerHTML = lines.join("<br>");
    this.element.appendChild(this.buttonEl);
  }

  hide(): void {
    this.element.style.display = "none";
  }

  show(): void {
    this.element.style.display = "block";
  }

  destroy(): void {
    this.element.remove();
  }

  private renderEmpty(): void {
    this.element.textContent = "Loading combat…";
    this.element.appendChild(this.buttonEl);
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
