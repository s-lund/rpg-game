# DESIGN.md — the core loop (north star)

> Settled 2026-06-12 in the M13 design-discovery session (human-signed). This is the vision record
> later milestones answer to. If a milestone's design conflicts with this document, the milestone is
> wrong. Changing this document requires an explicit design session with human sign-off — never a
> drive-by edit inside a build loop.

## The one-sentence fantasy

**EMBERWATCH is great when the player is reading a living three-way war and making the irreversible
call — where to strike, where to withdraw, what to feed and what to abandon — then walking onto the
field and proving it in person.**

You are the spark of a rebellion: from a hunted cell of four, to a liberation army raised from the
people you freed, to the power that breaks three kingdoms' spines.

## The frame

A frontier **region** — farmland, towns, crossings, with the ruined city at its heart — is contested
by **three factions** fighting each other for territorial control. The player is the **fourth
power**: a rebel who frees areas from whoever holds them. The war is **fully alive**: factions
genuinely fight each other, borders shift without the player's involvement, and the resulting
imbalance is welcome — the world is not built around you; reading and exploiting it is the game.

Three altitudes, each a real game with real challenge:

- **Strategy** — where to attack, where to withdraw; the shape of the war.
- **Operations** — soldiers are hired, paid, and fed; held areas yield resources; forces are spread
  to hold or concentrated to strike.
- **Tactics** — the four-hero party fights PF2e battles, attacking and defending areas, with or
  without NPC soldiers at their side.

## Beating heart + the fairness rule

When the layers conflict, **the strategic war wins**. The campaign owns fairness: fights are honest
consequences of the map — including hopeless ones — and **retreat is a first-class mechanic**.
Reading which fights *not* to take is the strategic skill. XCOM lives inside the fights, Battle
Brothers in the economy and the heat, BG in faction character and a personal thread — but the spine
is the war sim.

## The three loops

- **10-minute loop — a strategic turn, or a battle.** Read a fully visible map: three factions
  grinding at each other, heat building against you, food and gold ticking. Issue orders — move the
  party, move armies, recruit, garrison — and end the turn; the world resolves one readable tick.
  Or: stand a battle. Wherever the party is, autoresolve is suspended and tactical skill can beat
  odds the math would lose — the rebel's structural edge over richer powers.
- **1-hour loop — a push.** Liberate a cluster of areas, raising recruits from the people freed;
  weather the punitive response your heat earned; convert ground into gold, food, and soldiers
  before the next faction move. Carried forward: territory, troops, heat, and the party's levels
  and loot.
- **Campaign arc — spark to wildfire.** Early: no land, no army, guerrilla strikes (the pre-war
  game is the opening act; scarcity, not rules, keeps it small). Mid: holdings, garrisons,
  stack-vs-stack warfare, armies that can attack without you. End: break each faction's spine in a
  party-only setpiece — collapse cascades, no map-painting mop-up.

## Winning and losing

- **Victory: break all three spines.** Each faction has a heart (capital / leader / stronghold);
  destroying it collapses that faction (capitulation cascades). Three built-in climaxes, party-only.
- **Defeat: death of the spark.** Only a full party wipe ends the campaign. Territory is fully
  elastic — the rebellion can be ground back to a hunted cell and rise again. Heroes who drop in a
  won or escaped fight are downed, not dead (per-hero permadeath stays a later optional dial).

## Structural decisions (locked 2026-06-12)

1. **Discrete strategic turns.** Issue all orders, end turn, the war resolves one tick. The tick is
   a deterministic campaign event sequence — readable, replayable.
2. **Full map visibility.** Chess, not poker: the whole war is legible; skill is interpretation and
   timing, not fog-clearing.
3. **Pure autoresolve** for any battle the party is not at — a deterministic strength calculation
   over the stacks involved. Being there in person is what changes the rules.
4. **Armies are stacks; one slot = one soldier or hero.** Total-War-style slot caps, but each slot
   is a single combatant. The thing that moves on the map is exactly the thing that stands on the
   battle grid — armies are small (frontier scale), and a tactical fight is the *whole* battle.
5. **Typed, fungible troops.** Soldiers are counts by type and tier with fixed stat blocks. The
   four heroes are the only individuals — special by contrast, not stat inflation.
6. **Gold hires, food sustains.** Gold = recruitment + wages (shortage → desertion over turns);
   food = per-soldier upkeep (shortage → immediate harm). Areas are strategically distinct by what
   they yield — mining towns vs breadbaskets. Gold limits growth; food limits concentration.
7. **Freed areas raise the army.** Liberated areas contribute recruits from population pools — the
   army literally is the people you freed; losing ground shrinks the recruiting base.
8. **Armies can always attack** (player and factions), via autoresolve, without the party. The
   spark phase self-limits through scarcity, not rules.
9. **The party's edge:** (a) wherever the party stands, the battle becomes tactical and skill can
   beat the math; (b) the three spine-breaks are party-only authored setpieces. Armies paint the
   map; the party decides the war. The party grows through levels + loot and should be genuinely
   powerful.
10. **No world-leveling.** The world never scales to the party. Factions field a *range* of fixed
    troop tiers — cheap militia never stops existing; elite (expensive) troops exist that can stand
    up to a leveled party. Pressure scales by what the enemy chooses to send and can afford, never
    by inflating stats.
11. **Heat + slow burn.** Factions respond to the player in proportion to the pain caused (patrols
    → expeditions → armies). Meanwhile the war doesn't wait: factions consolidate over time —
    turtle too long and one faction eats the others, and the endgame is a consolidated empire
    instead of three bleeding rivals.
12. **Story serves the war.** Authored content gives factions character (leaders, atmosphere, a
    spine-quest with real scenes) and the rebel a personal thread — but the plot is whatever the
    sim produces. No parallel authored mainline.
13. **Districts are normal areas.** The war treats the region uniformly; existing district content
    persists as contested areas without special sim status.

## Anti-goals (the "…or not")

Named failure modes every war-arc milestone must answer to:

- **Autoresolve dominance** — in either direction. If autoresolve is efficient, fighting yourself
  is pointless; if tactical play always crushes it, every fight demands your presence and the war
  becomes a fight queue. The coupling must keep both modes meaningful.
- **Illegible war** — areas flipping for untraceable reasons, inscrutable factions. Every flip must
  be traceable to causes the player can read (a UI/reporting obligation as much as an AI one).
- **World-leveling** — see decision 10. The moment everything is the party's level, the war is fake.

Watched (judged lower-risk, mitigations named): *snowballing* (heat + faction consolidation push
back — verify at gates), *spreadsheet busywork* (operations stays small: few resources, typed
troops, no per-soldier management).

## Architecture fit

Everything above lives inside the existing invariants: the end-turn tick is a deterministic effect/
event sequence through `campaign-apply.ts`; faction AI and autoresolve are pure functions over
campaign state; all war state is serialized and replayable from the event log; the core stays
headless; renderer and narrator remain read-only consumers.
