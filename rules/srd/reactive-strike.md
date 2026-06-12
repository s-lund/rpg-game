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
