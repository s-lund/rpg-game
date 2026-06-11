import {
  ABILITY_IDS,
  ABILITY_POINT_BUY,
  M2_SUBSET,
  abilityModifier,
  abilityPointsRemaining,
  abilityPointsSpent,
  createDefaultParty,
  validateParty,
  type AbilityId,
  type CharacterDraft,
  type PartyDraft,
  type SkillId,
} from "../core/index";

const SCREEN_ID = "emberwatch-creation-screen";

export interface PackChoice {
  id: string;
  label: string;
  description?: string;
}

export interface CreationScreenOptions {
  onEnterWorld: (party: PartyDraft) => void;
  onContinueSaved?: () => void;
  hasSavedCampaign?: () => boolean;
  /** Selectable content packs (campaign worlds); omit to hide the picker. */
  packs?: PackChoice[];
  getSelectedPackId?: () => string;
  onPackChange?: (packId: string) => void;
}

interface AbilityRowRefs {
  scoreEl: HTMLSpanElement;
  modEl: HTMLSpanElement;
  minusBtn: HTMLButtonElement;
  plusBtn: HTMLButtonElement;
}

export class CreationScreen {
  private readonly root: HTMLDivElement;
  private party: PartyDraft;
  private readonly onEnterWorld: (party: PartyDraft) => void;
  private readonly onContinueSaved?: () => void;
  private readonly hasSavedCampaign?: () => boolean;
  private continueBtn: HTMLButtonElement | null = null;
  private readonly errorEl: HTMLDivElement;
  private readonly startBtn: HTMLButtonElement;
  private readonly poolLabels = new Map<CharacterDraft["classId"], HTMLSpanElement>();
  private readonly abilityRows = new Map<
    CharacterDraft["classId"],
    Map<AbilityId, AbilityRowRefs>
  >();

  constructor(container: HTMLElement, options: CreationScreenOptions) {
    this.onEnterWorld = options.onEnterWorld;
    this.onContinueSaved = options.onContinueSaved;
    this.hasSavedCampaign = options.hasSavedCampaign;
    this.party = createDefaultParty();
    this.party.members[0].name = "Aldric";
    this.party.members[1].name = "Sera";
    this.party.members[2].name = "Mira";
    this.party.members[3].name = "Oren";

    this.root = document.createElement("div");
    this.root.id = SCREEN_ID;
    this.root.style.cssText = [
      "position: fixed",
      "inset: 0",
      "z-index: 9500",
      "display: flex",
      "flex-direction: column",
      "align-items: center",
      "justify-content: flex-start",
      "overflow: auto",
      "padding: 24px 16px 32px",
      "background: #0a0a0f",
      "color: #e8e4dc",
      "font: 14px/1.5 ui-sans-serif, system-ui, sans-serif",
    ].join(";");

    const title = document.createElement("h1");
    title.textContent = "Recruit your party";
    title.style.cssText = "margin: 0 0 6px; font-size: 22px; font-weight: 600; color: #7eb8ff;";
    this.root.appendChild(title);

    const subtitle = document.createElement("p");
    subtitle.textContent =
      "Build a 4-hero party (archer Fighter, Rogue, Wizard, Cleric) at level 1. Abilities use a point pool from base 10. Ancestry/background are fixed defaults — see dev overlay.";
    subtitle.style.cssText = "margin: 0 0 20px; max-width: 720px; color: #a8a4a0; text-align: center;";
    this.root.appendChild(subtitle);

    if (options.packs && options.packs.length > 1) {
      this.root.appendChild(this.buildPackPicker(options));
    }

    const columns = document.createElement("div");
    columns.style.cssText = [
      "display: grid",
      "grid-template-columns: repeat(auto-fit, minmax(260px, 1fr))",
      "gap: 16px",
      "width: min(1200px, 100%)",
    ].join(";");

    for (const slot of M2_SUBSET.partySlots) {
      const member = this.party.members.find((m) => m.classId === slot.classId)!;
      columns.appendChild(this.buildMemberPanel(member, slot.classId as CharacterDraft["classId"]));
    }
    this.root.appendChild(columns);

    this.errorEl = document.createElement("div");
    this.errorEl.style.cssText = [
      "width: min(960px, 100%)",
      "margin-top: 16px",
      "color: #ff8a80",
      "min-height: 1.5em",
    ].join(";");
    this.root.appendChild(this.errorEl);

    this.startBtn = document.createElement("button");
    this.startBtn.type = "button";
    this.startBtn.textContent = "Enter World";
    this.startBtn.style.cssText = [
      "margin-top: 12px",
      "padding: 10px 24px",
      "border: 1px solid rgba(255, 180, 60, 0.7)",
      "border-radius: 6px",
      "background: rgba(255, 180, 60, 0.18)",
      "color: #ffb43c",
      "font: 600 15px/1 ui-sans-serif, system-ui, sans-serif",
      "cursor: pointer",
    ].join(";");
    this.startBtn.addEventListener("click", () => this.handleStart());
    this.root.appendChild(this.startBtn);

    if (this.onContinueSaved) {
      const continueBtn = document.createElement("button");
      continueBtn.type = "button";
      continueBtn.textContent = "Continue saved party";
      continueBtn.style.cssText = [
        "margin-top: 10px",
        "padding: 10px 24px",
        "border: 1px solid rgba(100, 140, 200, 0.55)",
        "border-radius: 6px",
        "background: rgba(60, 100, 160, 0.15)",
        "color: #7eb8ff",
        "font: 600 15px/1 ui-sans-serif, system-ui, sans-serif",
        "cursor: pointer",
      ].join(";");
      continueBtn.addEventListener("click", () => this.onContinueSaved?.());
      this.root.appendChild(continueBtn);
      this.continueBtn = continueBtn;
    }

    container.appendChild(this.root);
    this.refresh();
    this.refreshSavedCampaignButton();
  }

  hide(): void {
    this.root.style.display = "none";
  }

  show(): void {
    this.root.style.display = "flex";
  }

  getElement(): HTMLDivElement {
    return this.root;
  }

  private buildPackPicker(options: CreationScreenOptions): HTMLDivElement {
    const wrap = document.createElement("div");
    wrap.style.cssText = [
      "display: flex",
      "flex-direction: column",
      "align-items: center",
      "gap: 6px",
      "margin: 0 0 18px",
      "width: min(720px, 100%)",
    ].join(";");

    const title = document.createElement("div");
    title.textContent = "Campaign world";
    title.style.cssText =
      "font-size: 12px; font-weight: 600; color: #9a9080; text-transform: uppercase; letter-spacing: 0.04em;";
    wrap.appendChild(title);

    const row = document.createElement("div");
    row.style.cssText = "display: flex; flex-wrap: wrap; gap: 8px; justify-content: center;";
    wrap.appendChild(row);

    const descEl = document.createElement("p");
    descEl.style.cssText =
      "margin: 2px 0 0; font-size: 12px; color: #8a857c; text-align: center; min-height: 1.4em;";
    wrap.appendChild(descEl);

    const buttons = new Map<string, HTMLButtonElement>();
    const selectedId = (): string => options.getSelectedPackId?.() ?? options.packs![0]!.id;

    const paint = (): void => {
      const current = selectedId();
      for (const [id, btn] of buttons) {
        const active = id === current;
        btn.style.borderColor = active ? "rgba(255, 180, 60, 0.7)" : "rgba(100, 140, 200, 0.4)";
        btn.style.color = active ? "#ffb43c" : "#a8b4c8";
        btn.style.background = active ? "rgba(255, 180, 60, 0.14)" : "rgba(30, 36, 50, 0.6)";
      }
      descEl.textContent =
        options.packs!.find((p) => p.id === current)?.description ?? "";
    };

    for (const pack of options.packs!) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = pack.label;
      btn.style.cssText = [
        "padding: 7px 16px",
        "border-radius: 6px",
        "border: 1px solid",
        "cursor: pointer",
        "font: 600 13px/1 ui-sans-serif, system-ui, sans-serif",
      ].join(";");
      btn.addEventListener("click", () => {
        options.onPackChange?.(pack.id);
        paint();
      });
      buttons.set(pack.id, btn);
      row.appendChild(btn);
    }

    paint();
    return wrap;
  }

  private buildMemberPanel(member: CharacterDraft, classId: CharacterDraft["classId"]): HTMLDivElement {
    const panel = document.createElement("div");
    panel.style.cssText = [
      "padding: 14px 16px",
      "border: 1px solid rgba(100, 140, 200, 0.45)",
      "border-radius: 8px",
      "background: rgba(12, 14, 22, 0.92)",
    ].join(";");

    const classRules = M2_SUBSET.classes[classId];
    const heading = document.createElement("h2");
    heading.textContent = classRules.label;
    heading.style.cssText = "margin: 0 0 10px; font-size: 17px; color: #6fcf97;";
    panel.appendChild(heading);

    const nameLabel = document.createElement("label");
    nameLabel.textContent = "Name";
    nameLabel.style.display = "block";
    nameLabel.style.marginBottom = "4px";
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = member.name;
    nameInput.maxLength = 32;
    nameInput.style.cssText = [
      "width: 100%",
      "box-sizing: border-box",
      "margin-bottom: 12px",
      "padding: 6px 8px",
      "border-radius: 4px",
      "border: 1px solid rgba(100, 140, 200, 0.35)",
      "background: #12141c",
      "color: #e8e4dc",
    ].join(";");
    nameInput.addEventListener("input", () => {
      member.name = nameInput.value;
      this.refresh();
    });
    panel.appendChild(nameLabel);
    panel.appendChild(nameInput);

    const abilitiesHeader = document.createElement("div");
    abilitiesHeader.style.cssText = "display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;";
    const abilitiesTitle = document.createElement("span");
    abilitiesTitle.textContent = "Abilities";
    abilitiesTitle.style.fontWeight = "600";
    const poolLabel = document.createElement("span");
    poolLabel.style.cssText = "font-size: 12px; color: #a8a4a0;";
    abilitiesHeader.appendChild(abilitiesTitle);
    abilitiesHeader.appendChild(poolLabel);
    panel.appendChild(abilitiesHeader);
    this.poolLabels.set(classId, poolLabel);

    const abilityGrid = document.createElement("div");
    abilityGrid.style.cssText = "display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px;";
    const rowMap = new Map<AbilityId, AbilityRowRefs>();

    for (const abilityId of ABILITY_IDS) {
      const row = document.createElement("div");
      row.style.cssText = "display: flex; align-items: center; gap: 8px;";

      const label = document.createElement("span");
      label.textContent = abilityId.toUpperCase();
      label.style.cssText = "width: 36px; font-weight: 600;";

      const minusBtn = document.createElement("button");
      minusBtn.type = "button";
      minusBtn.textContent = "−";
      minusBtn.style.cssText = this.abilityButtonStyle();

      const scoreEl = document.createElement("span");
      scoreEl.style.cssText = "width: 24px; text-align: center; font-weight: 600;";

      const modEl = document.createElement("span");
      modEl.style.cssText = "width: 36px; font-size: 12px; color: #a8a4a0;";

      const plusBtn = document.createElement("button");
      plusBtn.type = "button";
      plusBtn.textContent = "+";
      plusBtn.style.cssText = this.abilityButtonStyle();

      minusBtn.addEventListener("click", () => {
        this.adjustAbility(member, abilityId, -1);
      });
      plusBtn.addEventListener("click", () => {
        this.adjustAbility(member, abilityId, 1);
      });

      row.appendChild(label);
      row.appendChild(minusBtn);
      row.appendChild(scoreEl);
      row.appendChild(modEl);
      row.appendChild(plusBtn);
      abilityGrid.appendChild(row);
      rowMap.set(abilityId, { scoreEl, modEl, minusBtn, plusBtn });
    }
    this.abilityRows.set(classId, rowMap);
    panel.appendChild(abilityGrid);

    const skillsTitle = document.createElement("div");
    skillsTitle.textContent = "Trained skills";
    skillsTitle.style.cssText = "margin-bottom: 6px; font-weight: 600;";
    panel.appendChild(skillsTitle);

    const skillsBox = document.createElement("div");
    skillsBox.style.cssText = "display: flex; flex-direction: column; gap: 4px;";
    const classRulesFull = M2_SUBSET.classes[classId];
    for (const skillId of classRulesFull.skillChoices) {
      const skillLabel = M2_SUBSET.skillLabels[skillId as SkillId];
      const isMandatory =
        classId === "rogue" &&
        (M2_SUBSET.classes.rogue.mandatoryTrainedSkills as string[]).includes(skillId);
      const row = document.createElement("label");
      row.style.cssText = "display: flex; align-items: center; gap: 8px; cursor: pointer;";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = member.trainedSkills.includes(skillId as SkillId);
      checkbox.disabled = isMandatory;
      checkbox.addEventListener("change", () => {
        const skill = skillId as SkillId;
        if (checkbox.checked) {
          if (!member.trainedSkills.includes(skill)) {
            member.trainedSkills.push(skill);
          }
        } else {
          member.trainedSkills = member.trainedSkills.filter((s) => s !== skill);
        }
        this.refresh();
      });
      const text = document.createElement("span");
      text.textContent = isMandatory ? `${skillLabel} (required)` : skillLabel;
      row.appendChild(checkbox);
      row.appendChild(text);
      skillsBox.appendChild(row);
    }
    panel.appendChild(skillsBox);

    return panel;
  }

  private abilityButtonStyle(): string {
    return [
      "width: 28px",
      "height: 28px",
      "padding: 0",
      "border: 1px solid rgba(100, 140, 200, 0.45)",
      "border-radius: 4px",
      "background: #12141c",
      "color: #e8e4dc",
      "cursor: pointer",
      "font-size: 16px",
      "line-height: 1",
    ].join(";");
  }

  private adjustAbility(member: CharacterDraft, abilityId: AbilityId, delta: number): void {
    const { minScore, maxScore } = ABILITY_POINT_BUY;
    const next = member.abilities[abilityId] + delta;
    if (next < minScore || next > maxScore) return;

    const trial = { ...member.abilities, [abilityId]: next };
    if (abilityPointsSpent(trial) > ABILITY_POINT_BUY.pointPool) return;

    member.abilities[abilityId] = next;
    this.refresh();
  }

  private refresh(): void {
    for (const member of this.party.members) {
      if (member.classId === "rogue") {
        for (const mandatory of M2_SUBSET.classes.rogue.mandatoryTrainedSkills as SkillId[]) {
          if (!member.trainedSkills.includes(mandatory)) {
            member.trainedSkills.unshift(mandatory);
          }
        }
      }

      const remaining = abilityPointsRemaining(member.abilities);
      const poolLabel = this.poolLabels.get(member.classId);
      if (poolLabel) {
        poolLabel.textContent = `${remaining} of ${ABILITY_POINT_BUY.pointPool} points left (base ${ABILITY_POINT_BUY.baseScore})`;
        poolLabel.style.color = remaining < 0 ? "#ff8a80" : "#a8a4a0";
      }

      const rows = this.abilityRows.get(member.classId);
      if (rows) {
        for (const abilityId of ABILITY_IDS) {
          const refs = rows.get(abilityId);
          if (!refs) continue;
          const score = member.abilities[abilityId];
          const mod = abilityModifier(score);
          refs.scoreEl.textContent = String(score);
          refs.modEl.textContent = mod >= 0 ? `+${mod}` : String(mod);
          refs.minusBtn.disabled = score <= ABILITY_POINT_BUY.minScore;
          refs.plusBtn.disabled =
            score >= ABILITY_POINT_BUY.maxScore || abilityPointsRemaining(member.abilities) <= 0;
        }
      }
    }

    const validation = validateParty(this.party);
    if (!validation.ok) {
      this.errorEl.textContent = validation.errors.join(" · ");
      this.startBtn.disabled = true;
      this.startBtn.style.opacity = "0.45";
      this.startBtn.style.cursor = "not-allowed";
    } else {
      this.errorEl.textContent = "";
      this.startBtn.disabled = false;
      this.startBtn.style.opacity = "1";
      this.startBtn.style.cursor = "pointer";
    }
  }

  private handleStart(): void {
    const validation = validateParty(this.party);
    if (!validation.ok) {
      this.errorEl.textContent = validation.errors.join(" · ");
      return;
    }
    this.onEnterWorld(this.party);
  }

  refreshSavedCampaignButton(): void {
    if (!this.continueBtn || !this.hasSavedCampaign) return;
    const visible = this.hasSavedCampaign();
    this.continueBtn.style.display = visible ? "block" : "none";
  }
}
