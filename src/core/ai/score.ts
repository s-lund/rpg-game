/**
 * M12 scoring helpers — every estimate is computed with the SAME pure core
 * functions the resolver and the hover inspector use (estimateHitPercent,
 * damageBand, expectedBasicSaveFactor, evaluateCover, effectiveAc, the
 * condition penalties, the reaction predicates): the AI can be wrong about
 * dice, never about rules.
 *
 * Documented estimates (not rules): damage is treated as uniform over the
 * adjusted [min, max] band for kill probability; rogue sneak-attack dice are
 * ignored (no enemy rogues exist); expected damage is capped at the target's
 * remaining HP so overkill never outbids a finishing blow.
 */
import type { EntityId } from "../../shared/ids";
import type { Entity } from "../types";
import type { Tile } from "../combat/cone";
import type { SpellId } from "../characters/subset";
import { spellDef } from "../characters/subset";
import { damageBand, estimateHitPercent } from "../combat/attack";
import { adjustedAmount } from "../combat/damage";
import { attackRollPenalty, hasCondition } from "../combat/conditions";
import { effectiveAc, isFlanking } from "../combat/flanking";
import { evaluateCover } from "../combat/los";
import { isAdjacent } from "../combat/grid";
import { canTargetEnemy, isInRange } from "../combat/range";
import { canReact } from "../combat/reactions";
import { findSlotToSpend } from "../actions/resolve";
import type { AiContext } from "./context";
import type { DamageType, GameState } from "../types";

/** Safety credit when an enemy ranged threat has no line of effect to the tile at all. */
const OUT_OF_SIGHT_SAFETY = 3;

/** 0..1, highest for the lowest-HP perceivable target — the focus-fire component. */
export function focusValue(ctx: AiContext, target: Entity): number {
  if (ctx.maxTargetHp <= 0) return 0;
  return (ctx.maxTargetHp - target.hp) / ctx.maxTargetHp;
}

/**
 * Offense score of one attack-roll option against one target: expected damage
 * (HP-capped) + kill-securing + focus-fire, per the profile weights. The
 * prospective off-guard −2 from flanking mirrors resolveStrike's AC math.
 */
export function offenseScore(
  ctx: AiContext,
  target: Entity,
  attackBonus: number,
  damage: { count: number; sides: number; modifier: number },
  damageType: DamageType,
  coverAcBonus: number,
  flanking: boolean,
): number {
  const { weights, actor, state } = ctx;
  const offGuardProspect =
    flanking && !hasCondition(target, "flat_footed") && !hasCondition(target, "prone");
  const effAc = effectiveAc(state, target.id) + coverAcBonus - (offGuardProspect ? 2 : 0);
  const pHit = estimateHitPercent(attackBonus - attackRollPenalty(actor), effAc) / 100;

  const band = damageBand(damage.count, damage.sides, damage.modifier);
  const min = adjustedAmount(target, band.min, damageType);
  const max = adjustedAmount(target, band.max, damageType);
  const avg = (min + max) / 2;

  const expectedDamage = pHit * Math.min(avg, target.hp);
  const killFraction =
    max < target.hp ? 0 : min >= target.hp ? 1 : (max - target.hp + 1) / (max - min + 1);
  const pKill = pHit * killFraction;

  return (
    weights.expectedDamage * expectedDamage +
    weights.killSecure * pKill +
    weights.focusFire * focusValue(ctx, target)
  );
}

/**
 * Opposing melee reactors whose reach contains (x, y) and whose reaction is
 * still up — the same predicate the resolver's in-reach triggers use, minus
 * any reactors already consumed earlier in the plan (e.g. by the move that
 * got the actor here: baiting an already-spent reaction is free).
 */
export function reactorsThreatening(
  ctx: AiContext,
  x: number,
  y: number,
  consumed: ReadonlySet<EntityId>,
): Entity[] {
  return ctx.meleeThreats.filter(
    (reactor) =>
      canReact(reactor) && !consumed.has(reactor.id) && isAdjacent(reactor.x, reactor.y, x, y),
  );
}

/** Expected Reactive Strike damage the actor takes from these reactors (uncapped band average). */
export function expectedReactionDamage(ctx: AiContext, reactors: readonly Entity[]): number {
  const { actor, state } = ctx;
  const actorAc = effectiveAc(state, actor.id);
  let total = 0;
  for (const reactor of reactors) {
    const pHit =
      estimateHitPercent(reactor.attackBonus - attackRollPenalty(reactor), actorAc) / 100;
    const band = damageBand(reactor.damage.count, reactor.damage.sides, reactor.damage.modifier);
    const min = adjustedAmount(actor, band.min, reactor.damageType);
    const max = adjustedAmount(actor, band.max, reactor.damageType);
    total += pHit * ((min + max) / 2);
  }
  return total;
}

/**
 * Positional value of standing on `tile` at end of action: cover safety
 * against every enemy ranged threat's sightline, minus melee zoning. Added by
 * choose() to every candidate via its end tile, so staying put and moving are
 * priced on the same scale.
 */
export function positionValue(ctx: AiContext, tile: Tile): number {
  const { weights } = ctx;
  let value = 0;
  for (const threat of ctx.rangedThreats) {
    const cover = evaluateCover(
      ctx.state.map,
      { x: threat.x, y: threat.y },
      tile,
      ctx.occupiedOthers,
    );
    value += weights.coverSeek * (cover.lineOfEffect ? cover.acBonus : OUT_OF_SIGHT_SAFETY);
  }
  for (const melee of ctx.meleeThreats) {
    if (isAdjacent(melee.x, melee.y, tile.x, tile.y)) {
      value -= weights.meleeZoneAvoid;
    }
  }
  return value;
}

export interface AttackOption {
  kind: "strike" | "spell_attack";
  spellId?: SpellId;
  targetId: EntityId;
  /** Net score including flank bonus and AoO risk of attacking from this tile. */
  score: number;
}

/**
 * Every attack-roll option (weapon Strike, single-target attack spells) legal
 * from (x, y) with `apLeft` action points — evaluated against the same range,
 * line-of-effect, AP-cost, and slot rules the resolver enforces, via a
 * hypothetical actor position. Used stationary by the strike/cast families and
 * prospectively by the move family (followup after stepping).
 */
export function attackOptionsFrom(
  ctx: AiContext,
  x: number,
  y: number,
  apLeft: number,
  consumed: ReadonlySet<EntityId>,
): AttackOption[] {
  const { actor, state } = ctx;
  const atHome = x === actor.x && y === actor.y;
  const hypoActor = atHome ? actor : { ...actor, x, y };
  const hypoState: GameState = atHome
    ? state
    : { ...state, entities: { ...state.entities, [actor.id]: hypoActor } };

  const options: AttackOption[] = [];

  if (apLeft >= 1 && actor.strikeRange >= 1) {
    for (const target of ctx.targets) {
      if (!canTargetEnemy(hypoState, actor.id, target.id, actor.strikeRange)) continue;
      const cover = evaluateCover(state.map, { x, y }, { x: target.x, y: target.y }, ctx.occupiedOthers);
      if (!cover.lineOfEffect) continue;

      const flanking =
        isInRange(hypoActor, target.x, target.y, 1) && isFlanking(hypoState, actor.id, target.id);
      // Only ranged attacks provoke; melee Strikes never do (reactive-strike.md M12).
      const provoking = actor.strikeRange > 1 ? reactorsThreatening(ctx, x, y, consumed) : [];

      options.push({
        kind: "strike",
        targetId: target.id,
        score:
          offenseScore(ctx, target, actor.attackBonus, actor.damage, actor.damageType, cover.acBonus, flanking) +
          (flanking ? ctx.weights.flank : 0) -
          ctx.weights.aooRisk * expectedReactionDamage(ctx, provoking),
      });
    }
  }

  for (const spellId of actor.knownSpells) {
    const def = spellDef(spellId) as Record<string, unknown>;
    // Single-target attack-roll spell shape (Ray of Frost today): damage +
    // range, no save, no area. Heal and area spells belong to the cast family.
    if (!def.damage || !def.rangeTiles || def.save || def.coneLengthTiles) continue;
    const actionCost = def.actionCost as number;
    if (apLeft < actionCost) continue;
    if (findSlotToSpend(actor, spellId) === "none") continue;
    const damage = def.damage as { count: number; sides: number };
    const damageType = def.damageType as DamageType;
    const rangeTiles = def.rangeTiles as number;

    for (const target of ctx.targets) {
      if (!canTargetEnemy(hypoState, actor.id, target.id, rangeTiles)) continue;
      const cover = evaluateCover(state.map, { x, y }, { x: target.x, y: target.y }, ctx.occupiedOthers);
      if (!cover.lineOfEffect) continue;

      // Casting provokes in reach (manipulate trait — all current spells).
      const provoking = reactorsThreatening(ctx, x, y, consumed);

      options.push({
        kind: "spell_attack",
        spellId,
        targetId: target.id,
        score:
          offenseScore(
            ctx,
            target,
            actor.spellAttackBonus,
            { ...damage, modifier: 0 },
            damageType,
            cover.acBonus,
            false,
          ) -
          ctx.weights.aooRisk * expectedReactionDamage(ctx, provoking),
      });
    }
  }

  return options;
}

/** Best attack-option score from a tile, floored at 0 ("no worthwhile attack"). */
export function bestAttackScoreFrom(
  ctx: AiContext,
  x: number,
  y: number,
  apLeft: number,
  consumed: ReadonlySet<EntityId>,
): number {
  let best = 0;
  for (const option of attackOptionsFrom(ctx, x, y, apLeft, consumed)) {
    if (option.score > best) best = option.score;
  }
  return best;
}
