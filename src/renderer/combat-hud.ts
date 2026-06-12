import type { Entity, GameState, InspectActionKind, TargetInspection } from "../core/index";

const HUD_ID = "emberwatch-combat-hud";
const END_TURN_BTN_ID = "emberwatch-end-turn-btn";
const INSPECTOR_ID = "emberwatch-combat-inspector";

export type CombatActionMode = "move" | "strike" | "cast_spell" | "cast_heal" | "cast_cone";

function unexpendedSlots(entity: Entity, spellId: string): number {
  return (entity.spellSlots ?? []).filter((s) => !s.expended && s.preparedSpellId === spellId)
    .length;
}

/** "frightened 2", "prone", "persistent fire" — badges from activeConditions (M10). */
export function conditionBadges(entity: Entity): string[] {
  return entity.activeConditions.map((c) => {
    if (c.id === "persistent_damage") {
      return `persistent ${c.damageType ?? "?"}`;
    }
    const name = c.id === "flat_footed" ? "flat-footed" : c.id;
    return c.value !== undefined ? `${name} ${c.value}` : name;
  });
}

function isProne(entity: Entity): boolean {
  return entity.conditions.includes("prone");
}

export class CombatHud {
  private element: HTMLDivElement;
  private buttonEl: HTMLButtonElement;
  private actionBar: HTMLDivElement;
  private inspectorEl: HTMLDivElement;
  private onEndTurn: (() => void) | null = null;
  private onActionModeChange: ((mode: CombatActionMode) => void) | null = null;
  private onStand: (() => void) | null = null;
  private actionMode: CombatActionMode = "strike";

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

    this.actionBar = document.createElement("div");
    this.actionBar.style.cssText = [
      "display: flex",
      "gap: 6px",
      "margin-top: 8px",
      "flex-wrap: wrap",
      "pointer-events: auto",
    ].join(";");
    this.element.appendChild(this.actionBar);

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

    this.inspectorEl = document.createElement("div");
    this.inspectorEl.id = INSPECTOR_ID;
    this.inspectorEl.style.cssText = [
      "position: fixed",
      "left: 0",
      "top: 0",
      "z-index: 9600",
      "min-width: 180px",
      "max-width: 240px",
      "padding: 8px 10px",
      "background: rgba(12, 14, 22, 0.94)",
      "border: 1px solid rgba(100, 200, 140, 0.55)",
      "border-radius: 6px",
      "color: #e8e4dc",
      "font: 12px/1.4 ui-sans-serif, system-ui, sans-serif",
      "display: none",
      "pointer-events: none",
      "box-shadow: 0 4px 16px rgba(0,0,0,0.4)",
    ].join(";");
    container.appendChild(this.inspectorEl);

    this.renderEmpty();
  }

  setOnEndTurn(handler: () => void): void {
    this.onEndTurn = handler;
  }

  setOnActionModeChange(handler: (mode: CombatActionMode) => void): void {
    this.onActionModeChange = handler;
  }

  setOnStand(handler: () => void): void {
    this.onStand = handler;
  }

  getActionMode(): CombatActionMode {
    return this.actionMode;
  }

  setActionMode(mode: CombatActionMode): void {
    this.actionMode = mode;
    this.onActionModeChange?.(mode);
  }

  showInspector(
    label: string,
    info: TargetInspection,
    clientX: number,
    clientY: number,
    conditions: string[] = [],
  ): void {
    const saveLabels = { fortitude: "Fortitude", reflex: "Reflex", will: "Will" } as const;
    const isSaveSpell = info.savePercent !== undefined && info.savePercent !== null;
    const lines = [
      `<strong style='color:#6fcf97'>${escapeHtml(label)}</strong>`,
      `HP ${info.hp}/${info.maxHp}`,
      info.inRange
        ? "<span style='color:#8fd4a0'>In range</span>"
        : "<span style='color:#e07070'>Out of range</span>",
    ];
    if (info.hitPercent !== null) {
      lines.push(`Hit ~${info.hitPercent}%`);
    }
    if (isSaveSpell && info.saveKind) {
      lines.push(`${saveLabels[info.saveKind]} save ~${info.savePercent}% (half on save)`);
    }
    if (info.damageMin !== null && info.damageMax !== null) {
      const prefix = isSaveSpell
        ? "Damage (on fail)"
        : info.hitPercent === null
          ? "Heal"
          : "Damage";
      lines.push(`${prefix} ${info.damageMin}–${info.damageMax}`);
    }
    if (info.weaknessApplied) {
      lines.push(
        `<span style='color:#e0a060'>Weak to ${info.weaknessApplied.damageType} (+${info.weaknessApplied.value})</span>`,
      );
    }
    if (info.resistanceApplied) {
      lines.push(
        `<span style='color:#7eb8ff'>Resists ${info.resistanceApplied.damageType} (−${info.resistanceApplied.value})</span>`,
      );
    }
    if (conditions.length > 0) {
      lines.push(`<span style='color:#e0a060'>${conditions.map(escapeHtml).join(", ")}</span>`);
    }
    this.inspectorEl.innerHTML = lines.join("<br>");
    this.inspectorEl.style.display = "block";
    this.positionInspector(clientX, clientY);
  }

  private positionInspector(clientX: number, clientY: number): void {
    const offset = 16;
    const margin = 8;
    const rect = this.inspectorEl.getBoundingClientRect();
    let left = clientX + offset;
    let top = clientY + offset;

    if (left + rect.width > window.innerWidth - margin) {
      left = clientX - rect.width - offset;
    }
    if (top + rect.height > window.innerHeight - margin) {
      top = clientY - rect.height - offset;
    }
    left = Math.max(margin, left);
    top = Math.max(margin, top);

    this.inspectorEl.style.left = `${left}px`;
    this.inspectorEl.style.top = `${top}px`;
  }

  hideInspector(): void {
    this.inspectorEl.style.display = "none";
  }

  update(state: GameState): void {
    const active = state.combat.activeActorId
      ? state.entities[state.combat.activeActorId]
      : null;

    const lines: string[] = [
      "<strong style='color:#7eb8ff'>Combat</strong>",
      `Round ${state.combat.round} · Phase: ${state.combat.phase}`,
    ];

    // Initiative strip (M10): rolled order, party gold / enemy red, active boxed.
    if (state.combat.phase === "active") {
      const chips = state.combat.turnOrder.map((id) => {
        const e = state.entities[id];
        if (!e) return "";
        const roll = state.combat.initiative?.[id];
        const title = roll ? ` (${roll.total})` : "";
        const color = e.team === "party" ? "#ffd27a" : "#e07070";
        const deco = e.downed ? "text-decoration:line-through;opacity:0.45;" : "";
        const box =
          id === state.combat.activeActorId
            ? "border:1px solid #ffb43c;border-radius:3px;padding:0 3px;"
            : "";
        return `<span style='color:${color};${deco}${box}'>${escapeHtml(e.label)}${title}</span>`;
      });
      lines.push(`<span style='color:#888'>Initiative:</span> ${chips.filter(Boolean).join(" → ")}`);
    }

    if (state.combat.phase === "victory") {
      lines.push("", "<span style='color:#6fcf97'>Victory — encounter cleared.</span>");
      this.buttonEl.style.display = "none";
      this.actionBar.style.display = "none";
    } else if (state.combat.phase === "defeat") {
      lines.push("", "<span style='color:#e07070'>Defeat.</span>");
      this.buttonEl.style.display = "none";
      this.actionBar.style.display = "none";
    } else if (active) {
      const isPartyTurn = active.team === "party";

      if (isPartyTurn) {
        this.syncDefaultActionMode(active);
        lines.push(
          "",
          `<strong style='color:#ffb43c'>Your turn: ${escapeHtml(active.label)}</strong>`,
          `<span style='color:#aaa'>${active.actionPoints} action point${active.actionPoints === 1 ? "" : "s"} left</span>`,
        );
        if (isProne(active)) {
          lines.push(
            "<span style='color:#e0a060'>You are prone — Stand (1 AP) before moving; attacks at −2.</span>",
          );
        }
        lines.push(
          "",
          "<strong>What to do</strong>",
          "1. Pick an action mode below — <strong>Move</strong> never casts.",
          "2. Click a <strong>tile</strong> to move (1 AP/tile); with Breathe Fire selected the click casts there instead.",
          "3. Click a <strong>target</strong> — enemy to attack/cast, ally to heal.",
          "<span style='color:#e0a060'>Leaving a melee enemy's reach provokes its Attack of Opportunity — and yours.</span>",
          `4. <strong>End Turn</strong> or press <kbd style='background:#333;padding:1px 5px;border-radius:3px'>E</kbd>.`,
        );
        this.buttonEl.textContent = "End Turn";
        this.buttonEl.style.display = "block";
        this.actionBar.style.display = "flex";
        this.renderActionButtons(active);
      } else {
        lines.push(
          "",
          `<span style='color:#aaa'>${escapeHtml(active.label)}'s turn (enemy) — passing automatically…</span>`,
        );
        this.buttonEl.style.display = "none";
        this.actionBar.style.display = "none";
      }

      lines.push(
        "",
        `<span style='color:#888'>Active:</span> ${escapeHtml(active.label)} (${active.actionPoints} AP)`,
      );
    }

    lines.push("", "<strong>Party</strong>");
    for (const entity of Object.values(state.entities)) {
      if (entity.team !== "party") continue;
      const badges = conditionBadges(entity);
      const cond = badges.length
        ? ` <span style='color:#e0a060'>[${badges.map(escapeHtml).join(", ")}]</span>`
        : "";
      const status = entity.downed ? " DOWN" : "";
      const slots = entity.spellSlots
        ? ` · slots ${entity.spellSlots.filter((s) => !s.expended).length}/${entity.spellSlots.length}`
        : "";
      // Reaction marker only where it matters: melee-armed combatants threaten (M10 house rule).
      const reaction =
        !entity.downed && entity.strikeRange === 1
          ? entity.reactionAvailable
            ? " <span title='reaction ready' style='color:#ffd27a'>⚡</span>"
            : " <span title='reaction spent' style='color:#555'>⚡</span>"
          : "";
      const marker =
        entity.id === state.combat.activeActorId ? " <span style='color:#ffb43c'>← active</span>" : "";
      lines.push(
        `${escapeHtml(entity.label)}: ${entity.hp}/${entity.maxHp} HP · AC ${entity.ac} · ${entity.actionPoints} AP${slots}${reaction}${cond}${status}${marker}`,
      );
    }

    lines.push("", "<strong>Enemies</strong>");
    for (const entity of Object.values(state.entities)) {
      if (entity.team !== "enemy") continue;
      const badges = conditionBadges(entity);
      const cond = badges.length
        ? ` <span style='color:#e0a060'>[${badges.map(escapeHtml).join(", ")}]</span>`
        : "";
      const status = entity.downed ? " DOWN" : "";
      lines.push(
        `${escapeHtml(entity.label)}: ${entity.hp}/${entity.maxHp} HP${cond}${status}`,
      );
    }

    this.element.innerHTML = lines.join("<br>");
    this.element.appendChild(this.actionBar);
    this.element.appendChild(this.buttonEl);
  }

  hide(): void {
    this.element.style.display = "none";
    this.hideInspector();
  }

  show(): void {
    this.element.style.display = "block";
  }

  destroy(): void {
    this.element.remove();
    this.inspectorEl.remove();
  }

  private renderEmpty(): void {
    this.element.textContent = "Loading combat…";
    this.element.appendChild(this.buttonEl);
  }

  /** Keep the player's mode choice while it stays valid for the active hero; else fall back. */
  private syncDefaultActionMode(entity: Entity): void {
    const classId = entity.classId;
    const valid: CombatActionMode[] = ["move"];
    if (classId === "fighter" || classId === "rogue") {
      valid.push("strike");
    } else if (classId === "wizard") {
      valid.push("cast_spell");
      if (unexpendedSlots(entity, "breathe_fire") > 0) {
        valid.push("cast_cone");
      }
    } else if (classId === "cleric") {
      valid.push("cast_heal");
    }
    if (!valid.includes(this.actionMode)) {
      this.actionMode =
        classId === "wizard" ? "cast_spell" : classId === "cleric" ? "cast_heal" : "strike";
    }
  }

  private renderActionButtons(entity: Entity): void {
    const classId = entity.classId;
    this.actionBar.innerHTML = "";
    const fireSlots = unexpendedSlots(entity, "breathe_fire");
    const healSlots = unexpendedSlots(entity, "heal_ranged");
    const modes: { mode: CombatActionMode; label: string; show: boolean; disabled?: boolean }[] = [
      { mode: "move", label: "Move", show: true },
      { mode: "strike", label: "Strike", show: classId === "fighter" || classId === "rogue" },
      { mode: "cast_spell", label: "Ray of Frost", show: classId === "wizard" },
      {
        mode: "cast_cone",
        label: `Breathe Fire (${fireSlots})`,
        show: classId === "wizard",
        disabled: fireSlots === 0,
      },
      {
        mode: "cast_heal",
        label: entity.spellSlots ? `Heal (${healSlots})` : "Heal",
        show: classId === "cleric",
        disabled: entity.spellSlots ? healSlots === 0 : false,
      },
    ];

    // Stand (M10): immediate 1-action button while prone, not a click mode.
    if (isProne(entity)) {
      const standBtn = document.createElement("button");
      standBtn.type = "button";
      standBtn.textContent = "Stand (1 AP)";
      const standDisabled = entity.actionPoints < 1;
      standBtn.disabled = standDisabled;
      standBtn.style.cssText = [
        "pointer-events: auto",
        standDisabled ? "cursor: not-allowed" : "cursor: pointer",
        standDisabled ? "opacity: 0.45" : "opacity: 1",
        "padding: 6px 10px",
        "border-radius: 4px",
        "border: 1px solid rgba(224, 160, 96, 0.9)",
        "background: rgba(224, 160, 96, 0.18)",
        "color: #e0a060",
        "font: 600 12px/1 ui-sans-serif, system-ui, sans-serif",
      ].join(";");
      standBtn.addEventListener("click", () => {
        if (!standDisabled) this.onStand?.();
      });
      this.actionBar.appendChild(standBtn);
    }

    for (const { mode, label, show, disabled } of modes) {
      if (!show) continue;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = label;
      btn.disabled = Boolean(disabled);
      const active = this.actionMode === mode;
      btn.style.cssText = [
        "pointer-events: auto",
        disabled ? "cursor: not-allowed" : "cursor: pointer",
        disabled ? "opacity: 0.45" : "opacity: 1",
        "padding: 6px 10px",
        "border-radius: 4px",
        "border: 1px solid",
        active ? "border-color: rgba(255, 180, 60, 0.9)" : "border-color: rgba(100, 140, 200, 0.45)",
        active ? "background: rgba(255, 180, 60, 0.22)" : "background: rgba(18, 20, 28, 0.95)",
        active ? "color: #ffb43c" : "color: #c8c4c0",
        "font: 600 12px/1 ui-sans-serif, system-ui, sans-serif",
      ].join(";");
      btn.addEventListener("click", () => {
        if (disabled) return;
        this.setActionMode(mode);
        this.onActionModeChange?.(mode);
      });
      this.actionBar.appendChild(btn);
    }
  }
}

export function actionModeToInspectKind(mode: CombatActionMode): InspectActionKind {
  switch (mode) {
    case "cast_spell":
      return "cast_spell";
    case "cast_cone":
      return "cast_cone";
    case "cast_heal":
      return "cast_heal";
    default:
      return "strike";
  }
}

/** Inspector always reflects what the active hero can do, not a stale HUD mode. */
export function inspectModeForActor(
  classId: string | undefined,
  hudMode: CombatActionMode,
): CombatActionMode {
  if (hudMode === "move") return "move";
  if (classId === "wizard") return hudMode === "cast_cone" ? "cast_cone" : "cast_spell";
  if (classId === "cleric") return "cast_heal";
  if (classId === "fighter" || classId === "rogue") return "strike";
  return hudMode;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
