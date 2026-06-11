import type { AttackResolution, GameEvent, HealResolution } from "../types";
import type { NarrationContext } from "./types";

function label(ctx: NarrationContext, id: string): string {
  return ctx.entityLabels[id] ?? id;
}

function formatDiceRolls(rolls: number[], modifier: number): string {
  const sum = rolls.reduce((a, b) => a + b, 0);
  const modStr = modifier >= 0 ? ` + ${modifier}` : ` − ${Math.abs(modifier)}`;
  return `(${rolls.join("+")})${modStr} = ${sum + modifier}`;
}

function formatAttackResolution(event: GameEvent, ctx: NarrationContext): string[] {
  const res = event.payload.attack_resolution as AttackResolution;
  const actor = label(ctx, event.actorId);
  const target = label(ctx, String(event.payload.target_id));
  const lines: string[] = [];

  const hitMiss = res.hit ? "HIT" : "MISS";
  lines.push(
    `${actor} → ${target}: d20(${res.d20Natural}) + ${res.attackBonus} = ${res.attackTotal} vs AC ${res.targetAc} — ${hitMiss}`,
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
    lines.push(`  ${target} takes ${amount} ${dtype} (${hpAfter} HP left)`);
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
        if (event.payload.condition === "flat_footed") {
          const target = label(ctx, String(event.payload.target_id));
          lines.push(`  ${target} is flat-footed (flanked).`);
        }
        break;
      }
      case "DamageDealt": {
        if (event.payload.attack_resolution) {
          lines.push(...formatAttackResolution(event, ctx));
        } else if ((event.payload.amount as number) > 0) {
          const target = label(ctx, String(event.payload.target_id));
          const amount = event.payload.amount as number;
          const dtype = event.payload.damage_type as string;
          const hpAfter = event.payload.hp_after as number;
          lines.push(`${target} takes ${amount} ${dtype} damage (${hpAfter} HP left)`);
        }
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
