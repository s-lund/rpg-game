# Line of Effect + Line of Sight (M11)

**Source:** Pathfinder Player Core (ORC) pg. 426, via [Archives of Nethys — Line of Effect](https://2e.aonprd.com/Rules.aspx?ID=2382) and [Line of Sight](https://2e.aonprd.com/Rules.aspx?ID=2383). Vendored 2026-06-12.

## Line of effect (Player Core pg. 426)

> "When creating an effect, you usually need an unblocked path to the target of a spell, the origin point of an effect's area, or the place where you create something with a spell or other ability. This is called a line of effect. You have line of effect unless a creature is entirely behind a solid physical barrier. Visibility doesn't matter for line of effect, nor do portcullises and other barriers that aren't totally solid. Usually a 1-foot-square gap is enough to maintain a line of effect, though the GM makes the final call.
>
> In an area effect, creatures or targets must have line of effect to the point of origin to be affected. If there's no line of effect between the origin of the area and the target, the effect doesn't apply to that target. For example, if there's a solid wall between the origin of a fireball and a creature that's within the burst radius, the wall blocks the effect—that creature is unaffected by the fireball and doesn't need to attempt a save against it. Likewise, any ongoing effects created by an ability with an area cease to affect anyone who moves outside of the line of effect."

## Line of sight (Player Core pg. 426)

> Some effects require line of sight. As long as you can precisely sense the area and it is not blocked by a solid barrier (as described in Cover), you have line of sight. An area of darkness prevents line of sight if you don't have darkvision, but portcullises and other obstacles that aren't totally solid do not. Usually a 1-foot-square gap is enough to maintain line of sight, though the GM makes the final call.

## M11 scope (decisions 2026-06-12)

- **Line of effect is the implemented concept.** No vision, light, or sense system exists, so line of *sight* collapses to line of effect: only solid barriers (walls) matter. Darkness/darkvision are out of scope.
- **"Entirely behind a solid physical barrier" is decided by corner-occlusion sampling (DERIVATION, replaces GM adjudication):** rays from the attacker's best tile corner to all four target-tile corners; all rays blocked by wall tiles → no line of effect (cannot target, no reticle). See `rules/srd/cover.md` for the full sampling rule and tier mapping.
- **Walls block; raised props and creatures never do** — props and creatures grant cover only (cover.md). Flat hazards (water, chasms) block movement but not effects.
- **Area effects (RAW):** Breathe Fire's cone template is clipped by line of effect from the cone's origin — tiles with no line of effect from the caster are removed and creatures there are unaffected (no save needed). This closes the M9 `m9_cone_line_of_effect` simplification. Standard cover still applies +2 to Reflex saves against the area for tiles that *are* affected (cover.md).
