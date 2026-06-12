# Reactive Strike / Attack of Opportunity (M10)

**Source:** Pathfinder Player Core (ORC), via [Archives of Nethys — Reactive Strike (action)](https://2e.aonprd.com/Actions.aspx?ID=2256), [Reactive Strike (fighter feature)](https://2e.aonprd.com/Feats.aspx?ID=5832), [Fighter class](https://2e.aonprd.com/Classes.aspx?ID=35), [Step 1: Start Your Turn](https://2e.aonprd.com/Rules.aspx?ID=2428). Vendored 2026-06-11.

"Reactive Strike" is the remaster name for the legacy "Attack of Opportunity."

## Rules text

Fighter level-1 class feature:

> "Ever watchful for weaknesses, you can quickly attack foes that leave an opening in their defenses. You gain the Reactive Strike reaction."

The reaction:

> **Trigger** "A creature within your reach uses a manipulate action or a move action, makes a ranged attack, or leaves a square during a move action it's using."
>
> **Effect** "You lash out at a foe that leaves an opening. Make a melee Strike against the triggering creature. If your attack is a critical hit and the trigger was a manipulate action, you disrupt that action. This Strike doesn't count toward your multiple attack penalty, and your multiple attack penalty doesn't apply to this Strike."

## Reaction economy (Player Core pg. 435)

> "Regain your 3 actions and 1 reaction. If you haven't spent your reaction from your last turn, you lose it—you can't 'save' actions or reactions from one turn to use during the next turn."

One reaction per round, refreshed at the start of the entity's own turn.

## M10 scope — HOUSE RULE divergence

- **Availability (HOUSE RULE, decision 2026-06-11):** in RAW only Fighters (and specific monsters) get Reactive Strike at low level. EMBERWATCH gives the reaction to **every combatant holding a melee weapon** for stronger XCOM-style zoning both ways. The one-reaction-per-round economy is RAW.
- **Trigger subset:** only *"leaves a square during a move action it's using"* — the move-trigger. Manipulate actions and ranged attacks made in melee reach do not yet trigger (no manipulate-trait actions exist in the core; ranged-attack triggers would make archers unplayable before M11 cover exists). Flagged in the dev overlay.
- **No multiple attack penalty:** MAP is not yet modeled in core at all, so "doesn't count toward / isn't subject to MAP" is trivially satisfied.
- **Disruption:** the critical-hit-disrupts-manipulate clause is out of scope (no manipulate trigger). For move triggers, RAW does not disrupt the move: the Strike resolves at the square where it triggers and the movement continues (unless the mover is downed — a downed mover stops at the triggering square).
- Reaction spend rides the pipeline as an effect so replay holds.

## M12 scope — trigger subset closed at full RAW (2026-06-12)

Closes `m10_aoo_trigger_subset`. The availability house rule (every melee-armed
combatant threatens) and the once-per-round economy are unchanged; the trigger
list is now the full RAW sentence, **symmetric** — heroes provoke and react too.

- **Triggers, all live:**
  1. *Leaves a square during a move action* — shipped in M10, unchanged
     (RAW does not disrupt the move; a downed mover stops at the trigger square).
  2. *Makes a ranged attack while within reach* — ranged weapon Strikes and
     ranged spell attacks made while in a reactor's melee reach.
  3. *Uses a manipulate action while within reach* — all three shipped spells
     (Ray of Frost, Heal, Breathe Fire) carry the manipulate trait per their
     vendored pages; the check is data (`m12-subset.json` `spells.*.traits`),
     not code.
  4. *Uses a move action while within reach* — **Stand provokes** (move trait,
     no exemption). The game's Step move is **exempt from this clause** per the
     RAW Step rules text (`step.md`) but keeps its M10 leaving-reach trigger,
     which is the house rule's deliberate disengage zoning. With 1-tile reach
     the within-reach clause is vacuous for Step anyway; recorded for reach-2
     weapons (M14+).
- **Ordering:** the reaction resolves **before** the triggering action's
  effects. The triggering action's AP (and spell slot, if any) are spent
  regardless — the action was used; if the reaction downs the actor, the rest
  of the action is lost. After a reactor downs the actor, remaining reactors do
  not pile on (M10 pattern: no beating a downed creature).
- **Disruption (RAW):** if the reaction Strike is a **critical hit** and the
  trigger was a **manipulate** action, the action is disrupted — the cast's
  spell effects are dropped, AP and spell slot stay spent, and the disruption
  is recorded on the reaction's attack resolution (`disruptedCast`) for the
  combat log. Crit detection reuses the shared degree-of-success ladder
  (`saving-throws.md`: total ≥ AC + 10, natural 20/1 shift one step) and is
  used **only** for disruption — critical *damage* (double damage) remains
  unmodeled game-wide (M1 attack model, unchanged).
- **Move triggers are never disrupted** even by a crit (move actions are not
  manipulate): Stand still gets the actor up after eating a crit.
- **Resolution snapshot simplification:** the resolver computes the whole
  action from the pre-action state in one pass (M10 pattern), so a condition
  rider applied by the reaction (e.g. frightened) penalizes the actor's *next*
  action, not the very roll it interrupted. HP from reaction damage **is**
  chained (a downed actor loses the action).
- **Mitigation is deliberately out of scope:** skill/feat counters ("battle
  casting" / steady-spellcasting-style feats) belong to M15's feat subset.

