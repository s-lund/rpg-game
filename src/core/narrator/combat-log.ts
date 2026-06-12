import type {
  AttackResolution,
  ConditionId,
  DamageAdjustment,
  GameEvent,
  HealResolution,
  SaveOutcome,
  SaveResolution,
} from "../types";
import type { PersistentTick } from "../effects/types";
import { M9_SUBSET } from "../characters/subset";
import type { NarrationContext } from "./types";

function label(ctx: NarrationContext, id: string): string {
  return ctx.entityLabels[id] ?? id;
}

function formatDiceRolls(rolls: number[], modifier: number): string {
  const sum = rolls.reduce((a, b) => a + b, 0);
  const modStr = modifier >= 0 ? ` + ${modifier}` : ` − ${Math.abs(modifier)}`;
  return `(${rolls.join("+")})${modStr} = ${sum + modifier}`;
}

/** "(6 base + 2 cold weakness − 3 fire resistance)" — only when something applied. */
function adjustmentNote(event: GameEvent): string {
  const adj = event.payload.damage_adjustment as DamageAdjustment | undefined;
  if (!adj) return "";
  const parts = [`${adj.before} base`];
  if (adj.weakness) {
    parts.push(`+ ${adj.weakness.value} ${adj.weakness.damageType} weakness`);
  }
  if (adj.resistance) {
    parts.push(`− ${adj.resistance.value} ${adj.resistance.damageType} resistance`);
  }
  return ` (${parts.join(" ")})`;
}

const SAVE_OUTCOME_LABELS: Record<SaveOutcome, string> = {
  critSuccess: "CRITICAL SUCCESS — no damage",
  success: "SUCCESS — half damage",
  failure: "FAILURE — full damage",
  critFailure: "CRITICAL FAILURE — double damage",
};

const SAVE_KIND_LABELS = {
  fortitude: "Fortitude",
  reflex: "Reflex",
  will: "Will",
} as const;

export const CONDITION_LABELS: Record<ConditionId, string> = {
  flat_footed: "flat-footed",
  frightened: "frightened",
  prone: "prone",
  stunned: "stunned",
  slowed: "slowed",
  persistent_damage: "persistent damage",
};

/** "frightened 2" / "persistent fire damage" — the bit after "X is …". */
function conditionPhrase(
  condition: ConditionId,
  value?: number,
  damageType?: string,
): string {
  if (condition === "persistent_damage") {
    return damageType ? `taking persistent ${damageType} damage` : "taking persistent damage";
  }
  const base = CONDITION_LABELS[condition] ?? condition;
  return value !== undefined ? `${base} ${value}` : base;
}

function formatSaveResolution(event: GameEvent, ctx: NarrationContext): string[] {
  const res = event.payload.save_resolution as SaveResolution;
  const target = label(ctx, String(event.payload.target_id));
  const lines: string[] = [];

  const coverPart =
    res.coverBonus && res.coverBonus > 0 ? ` + ${res.coverBonus} cover` : "";
  lines.push(
    `  ${target} ${SAVE_KIND_LABELS[res.saveKind]} save: d20(${res.d20Natural}) + ${res.saveModifier}${coverPart} = ${res.saveTotal} vs DC ${res.dc} — ${SAVE_OUTCOME_LABELS[res.outcome]}`,
  );

  const amount = event.payload.amount as number;
  const hpAfter = event.payload.hp_after as number;
  const dtype = event.payload.damage_type as string;
  if (amount > 0) {
    lines.push(`  ${target} takes ${amount} ${dtype}${adjustmentNote(event)} (${hpAfter} HP left)`);
  } else {
    lines.push(`  ${target} takes no damage`);
  }
  return lines;
}

function formatAttackResolution(event: GameEvent, ctx: NarrationContext): string[] {
  const res = event.payload.attack_resolution as AttackResolution;
  // An AoO's event actor is the MOVER who provoked — name the reactor instead.
  const actor = res.reactionBy
    ? (ctx.entityLabels[res.reactionBy.reactorId] ?? res.reactionBy.reactorLabel)
    : label(ctx, event.actorId);
  const target = label(ctx, String(event.payload.target_id));
  const lines: string[] = [];

  const hitMiss = res.hit ? "HIT" : "MISS";
  const acPart =
    res.coverAcBonus && res.coverAcBonus > 0
      ? `AC ${res.targetAc} +${res.coverAcBonus} cover = ${res.targetAc + res.coverAcBonus}`
      : `AC ${res.targetAc}`;
  lines.push(
    `${actor} → ${target}: d20(${res.d20Natural}) + ${res.attackBonus} = ${res.attackTotal} vs ${acPart} — ${hitMiss}`,
  );

  if (!res.hit) {
    return lines;
  }

  if (res.damageRolls && res.damageRolls.length > 0) {
    const mod = res.damageModifier ?? 0;
    lines.push(`  ${res.weaponLabel}: ${formatDiceRolls(res.damageRolls, mod)}`);
  }
  if (res.sneakRolls && res.sneakRolls.length > 0) {
    const sneakSum = res.sneakRolls.reduce((a, b) => a + b, 0);
    lines.push(`  Sneak attack: 1d6(${res.sneakRolls.join("+")}) = ${sneakSum}`);
  }

  const amount = event.payload.amount as number;
  if (amount > 0) {
    const dtype = event.payload.damage_type as string;
    const hpAfter = event.payload.hp_after as number;
    lines.push(`  ${target} takes ${amount} ${dtype}${adjustmentNote(event)} (${hpAfter} HP left)`);
  } else if (event.payload.damage_adjustment) {
    lines.push(`  ${target} takes no damage${adjustmentNote(event)}`);
  }

  return lines;
}

function formatHealResolution(event: GameEvent, ctx: NarrationContext): string[] {
  const res = event.payload.heal_resolution as HealResolution;
  const actor = label(ctx, event.actorId);
  const target = label(ctx, String(event.payload.target_id));
  const amount = event.payload.amount as number;
  const hpAfter = event.payload.hp_after as number;
  const rolled = formatDiceRolls(res.healRolls, res.flatBonus);
  return [
    `${actor} casts ${res.spellLabel} on ${target}: ${rolled}`,
    `  ${target} heals ${amount} HP (${hpAfter} HP now)`,
  ];
}

export function formatCombatLogBatch(events: GameEvent[], ctx: NarrationContext): string[] {
  const lines: string[] = [];

  for (const event of events) {
    switch (event.type) {
      case "TurnStarted": {
        const who = label(ctx, String(event.payload.entity_id));
        lines.push(`— ${who}'s turn —`);
        break;
      }
      case "Moved": {
        const who = label(ctx, String(event.payload.entity_id));
        const fromX = event.payload.from_x as number;
        const fromY = event.payload.from_y as number;
        const toX = event.payload.to_x as number;
        const toY = event.payload.to_y as number;
        const dist = Math.abs(toX - fromX) + Math.abs(toY - fromY);
        lines.push(`${who} moves ${dist} tile${dist === 1 ? "" : "s"} to (${toX}, ${toY})`);
        break;
      }
      case "ConditionApplied": {
        const target = label(ctx, String(event.payload.target_id));
        const condition = event.payload.condition as ConditionId;
        if (condition === "flat_footed") {
          lines.push(`  ${target} is flat-footed (flanked).`);
        } else {
          const phrase = conditionPhrase(
            condition,
            event.payload.value as number | undefined,
            event.payload.damage_type as string | undefined,
          );
          lines.push(`  ${target} is ${phrase}!`);
        }
        break;
      }
      case "ConditionTicked": {
        const target = label(ctx, String(event.payload.target_id));
        const condition = event.payload.condition as ConditionId;
        const valueAfter = event.payload.value_after as number;
        const name = CONDITION_LABELS[condition] ?? condition;
        if (valueAfter > 0) {
          lines.push(`  ${target}: ${name} drops to ${valueAfter}`);
        } else {
          lines.push(`  ${target} is no longer ${name}`);
        }
        break;
      }
      case "ConditionRemoved": {
        const target = label(ctx, String(event.payload.target_id));
        const condition = event.payload.condition as ConditionId;
        if (condition === "persistent_damage") {
          const dtype = event.payload.damage_type as string | undefined;
          lines.push(`  ${target} recovers from persistent ${dtype ?? ""} damage`.trimEnd());
        } else if (condition === "prone") {
          lines.push(`  ${target} stands up`);
        } else if (condition !== "flat_footed") {
          lines.push(`  ${target} is no longer ${CONDITION_LABELS[condition] ?? condition}`);
        }
        break;
      }
      case "ReactionSpent": {
        const who = label(ctx, String(event.payload.entity_id));
        lines.push(`${who}'s reaction — Attack of Opportunity:`);
        break;
      }
      case "DamageDealt": {
        if (event.payload.persistent_tick) {
          const tick = event.payload.persistent_tick as PersistentTick;
          const target = label(ctx, String(event.payload.target_id));
          const amount = event.payload.amount as number;
          const hpAfter = event.payload.hp_after as number;
          lines.push(
            `${target} takes ${amount} persistent ${tick.damageType} damage${adjustmentNote(event)} (${hpAfter} HP left)`,
          );
          lines.push(
            `  flat check d20(${tick.flatCheckRoll}) vs DC ${tick.flatCheckDc} — ${tick.recovered ? "recovers!" : "it persists"}`,
          );
        } else if (event.payload.attack_resolution) {
          lines.push(...formatAttackResolution(event, ctx));
        } else if (event.payload.save_resolution) {
          lines.push(...formatSaveResolution(event, ctx));
        } else if ((event.payload.amount as number) > 0) {
          const target = label(ctx, String(event.payload.target_id));
          const amount = event.payload.amount as number;
          const dtype = event.payload.damage_type as string;
          const hpAfter = event.payload.hp_after as number;
          lines.push(`${target} takes ${amount} ${dtype} damage (${hpAfter} HP left)`);
        }
        break;
      }
      case "SpellSlotSpent": {
        const who = label(ctx, String(event.payload.entity_id));
        const spellId = event.payload.spell_id as string | null;
        const rank = event.payload.rank as number | null;
        const remaining = event.payload.remaining as number;
        const spells = M9_SUBSET.spells as Record<string, { label: string }>;
        const spellName = (spellId && spells[spellId]?.label) || "spell";
        lines.push(
          `${who} expends a rank-${rank ?? 1} slot (${spellName}) — ${remaining} slot${remaining === 1 ? "" : "s"} left`,
        );
        break;
      }
      case "Healed": {
        if (event.payload.heal_resolution) {
          lines.push(...formatHealResolution(event, ctx));
        }
        break;
      }
      case "EntityDowned": {
        const who = label(ctx, String(event.payload.entity_id));
        lines.push(`  ${who} falls!`);
        break;
      }
      case "CombatEnded": {
        const outcome = event.payload.outcome as string;
        lines.push(outcome === "victory" ? "Victory!" : "Defeat…");
        break;
      }
      default:
        break;
    }
  }

  return lines;
}
