/**
 * Cast family — every known spell, enumerated by its subset-def SHAPE (attack
 * spell / heal / cone), never by a hand-maintained spell list: a new spell in
 * the data generates candidates without touching this module's call sites.
 * Legality (AP cost, slots, range, line of effect, cone aim) comes from the
 * same core rules the resolver enforces.
 */
import type { EntityId } from "../../../shared/ids";
import type { DamageType, Entity, SaveKind } from "../../types";
import type { SpellId } from "../../characters/subset";
import { spellDef } from "../../characters/subset";
import { findSlotToSpend } from "../../actions/resolve";
import { damageBand } from "../../combat/attack";
import { adjustedAmount } from "../../combat/damage";
import { dcPenalty, savePenalty } from "../../combat/conditions";
import { coneTiles } from "../../combat/cone";
import { canTargetAlly } from "../../combat/range";
import { expectedBasicSaveFactor } from "../../combat/save";
import {
  coneTilesWithLineOfEffect,
  coverReflexVsAreaBonus,
  evaluateCover,
  hasLineOfEffect,
} from "../../combat/los";
import type { ActionFamily, AiCandidate, AiContext } from "../context";
import { attackOptionsFrom, expectedReactionDamage, reactorsThreatening } from "../score";

const NO_CONSUMED: ReadonlySet<EntityId> = new Set();

function attackSpellCandidates(ctx: AiContext): AiCandidate[] {
  const { actor } = ctx;
  return attackOptionsFrom(ctx, actor.x, actor.y, actor.actionPoints, NO_CONSUMED)
    .filter((option) => option.kind === "spell_attack")
    .map((option) => ({
      family: "cast",
      score: option.score,
      endTile: { x: actor.x, y: actor.y },
      action: {
        kind: "CastSpell",
        actionId: `${ctx.actionIdBase}_cast_${option.spellId}_${option.targetId}`,
        actorId: actor.id,
        spellId: option.spellId!,
        targetId: option.targetId,
      },
    }));
}

function healCandidates(ctx: AiContext, spellId: SpellId, def: Record<string, unknown>): AiCandidate[] {
  const { actor, state, weights } = ctx;
  const actionCost = def.actionCost as number;
  if (actor.actionPoints < actionCost) return [];
  if (findSlotToSpend(actor, spellId) === "none") return [];
  const heal = def.heal as { count: number; sides: number; flatBonus: number };
  const rangeTiles = def.rangeTiles as number;
  const band = damageBand(heal.count, heal.sides, heal.flatBonus);
  const avgHeal = (band.min + band.max) / 2;

  // Downed allies are valid Heal targets (revive) — enumerate from state, not
  // ctx.allies (which holds only standing entities).
  const woundedAllies = Object.values(state.entities)
    .filter((e) => e.team === actor.team && (e.downed || e.hp < e.maxHp))
    .sort((a, b) => a.id.localeCompare(b.id));

  const provoking = reactorsThreatening(ctx, actor.x, actor.y, NO_CONSUMED);
  const aooCost = weights.aooRisk * expectedReactionDamage(ctx, provoking);

  const candidates: AiCandidate[] = [];
  for (const ally of woundedAllies) {
    if (!canTargetAlly(state, actor.id, ally.id, rangeTiles)) continue;
    if (!hasLineOfEffect(state.map, { x: actor.x, y: actor.y }, { x: ally.x, y: ally.y })) continue;
    const restored = Math.min(avgHeal, ally.maxHp - ally.hp);
    candidates.push({
      family: "cast",
      score: weights.expectedHealing * restored - aooCost,
      endTile: { x: actor.x, y: actor.y },
      action: {
        kind: "CastHeal",
        actionId: `${ctx.actionIdBase}_heal_${spellId}_${ally.id}`,
        actorId: actor.id,
        spellId,
        targetId: ally.id,
      },
    });
  }
  return candidates;
}

function coneCandidates(ctx: AiContext, spellId: SpellId, def: Record<string, unknown>): AiCandidate[] {
  const { actor, state, weights } = ctx;
  const actionCost = def.actionCost as number;
  if (actor.actionPoints < actionCost) return [];
  if (findSlotToSpend(actor, spellId) === "none") return [];
  const length = def.coneLengthTiles as number;
  const damage = def.damage as { count: number; sides: number };
  const damageType = def.damageType as DamageType;
  const saveKind = def.save as SaveKind;
  const band = damageBand(damage.count, damage.sides, 0);
  const avgBase = (band.min + band.max) / 2;
  const effectiveDc = actor.spellDc - dcPenalty(actor);

  const provoking = reactorsThreatening(ctx, actor.x, actor.y, NO_CONSUMED);
  const aooCost = weights.aooRisk * expectedReactionDamage(ctx, provoking);

  const standing = Object.values(state.entities)
    .filter((e) => !e.downed && e.id !== actor.id)
    .sort((a, b) => a.id.localeCompare(b.id));

  const candidates: AiCandidate[] = [];
  const seenAims = new Set<string>();
  for (const target of ctx.targets) {
    const aimKey = `${target.x},${target.y}`;
    if (seenAims.has(aimKey)) continue;
    seenAims.add(aimKey);
    // Resolver legality: the aim tile must be inside the raw template.
    const raw = coneTiles(actor.x, actor.y, target.x, target.y, length);
    if (!raw.some((t) => t.x === target.x && t.y === target.y)) continue;
    const tiles = coneTilesWithLineOfEffect(state.map, actor.x, actor.y, target.x, target.y, length);

    let score = 0;
    for (const entity of standing) {
      if (!tiles.some((t) => t.x === entity.x && t.y === entity.y)) continue;
      score +=
        (entity.team === actor.team ? -1 : 1) *
        weights.expectedDamage *
        expectedConeDamage(ctx, entity, avgBase, damageType, saveKind, effectiveDc);
    }
    if (score <= 0) continue; // never roast more friend than foe

    candidates.push({
      family: "cast",
      score: score - aooCost,
      endTile: { x: actor.x, y: actor.y },
      action: {
        kind: "CastConeSpell",
        actionId: `${ctx.actionIdBase}_cone_${spellId}_${target.x}_${target.y}`,
        actorId: actor.id,
        spellId,
        targetX: target.x,
        targetY: target.y,
      },
    });
  }
  return candidates;
}

/** Expected save-spell damage on one creature — same cover/save/adjustment math as the resolver. */
function expectedConeDamage(
  ctx: AiContext,
  entity: Entity,
  avgBase: number,
  damageType: DamageType,
  saveKind: SaveKind,
  dc: number,
): number {
  const coverTier = evaluateCover(
    ctx.state.map,
    { x: ctx.actor.x, y: ctx.actor.y },
    { x: entity.x, y: entity.y },
    ctx.occupiedOthers,
  ).tier;
  const saveModifier = entity.saves[saveKind] - savePenalty(entity) + coverReflexVsAreaBonus(coverTier);
  const factor = expectedBasicSaveFactor(saveModifier, dc);
  return Math.min(adjustedAmount(entity, avgBase * factor, damageType), entity.hp);
}

export const castFamily: ActionFamily = {
  family: "cast",
  candidates(ctx) {
    const candidates = attackSpellCandidates(ctx);
    for (const spellId of ctx.actor.knownSpells) {
      const def = spellDef(spellId) as Record<string, unknown>;
      if (def.heal) {
        candidates.push(...healCandidates(ctx, spellId, def));
      } else if (def.coneLengthTiles) {
        candidates.push(...coneCandidates(ctx, spellId, def));
      }
    }
    return candidates;
  },
};
