# Cover (M11)

**Source:** Pathfinder Player Core (ORC) pg. 424, via [Archives of Nethys — Cover](https://2e.aonprd.com/Rules.aspx?ID=2372); Take Cover from Player Core pg. 418, [Archives of Nethys — Take Cover](https://2e.aonprd.com/Actions.aspx?ID=2307). Vendored 2026-06-12.

## Cover tiers and bonuses (Player Core pg. 424)

| Cover | AC | Reflex vs area effects | Stealth to Hide/Sneak/avoid detection | Can Hide |
|---|---|---|---|---|
| Lesser | +1 | — | — | no |
| Standard | +2 | +2 | +2 | yes |
| Greater | +4 | +4 | +4 | yes |

All bonuses are circumstance bonuses.

> "Standard cover gives you a +2 circumstance bonus to AC, to Reflex saves against area effects, and to Stealth checks to Hide, Sneak, or otherwise avoid detection."

- **Lesser cover** is especially light cover, typically from an intervening *creature*: +1 circumstance bonus to AC only. Not sufficient to Hide, and grants nothing against area effects.
- **Standard cover** comes from intervening terrain or objects.
- **Greater cover** applies when the obstruction is extreme or via Take Cover:

> "You can increase this to greater cover using the Take Cover basic action, increasing the circumstance bonus to +4."

## Measuring cover (Player Core pg. 424)

Draw a line from the center of the attacker's space to the center of the target's space:

- line passes through **terrain or an object** that would block the effect → the target has **standard cover** (greater if the obstruction is extreme);
- line passes through a **creature** instead → the target has **lesser cover**;
- an intervening creature two or more sizes larger than both attacker and target grants **standard** cover rather than lesser. *(All M11 combatants are within one size; not modeled.)*

Special circumstances: the GM may let tactical positioning (e.g. leaning around a corner) reduce or change cover, typically at the cost of an action.

## Take Cover (Player Core pg. 418) — basic action, 1 action

Requirements: benefiting from standard cover, near a feature that allows cover, or prone. With standard cover it becomes greater cover (+4); otherwise grants standard cover. While prone, grants greater cover against ranged attacks. Lasts until you move, use an attack action, or become unconscious, or end it as a free action. **M11 scope: Take Cover and greater cover are NOT implemented** — only lesser (+1) and standard (+2) cover exist in the engine; greater cover is vendored here for completeness.

## M11 scope — divergences and derivations (decisions 2026-06-12)

- **Wall cover is corner-sampled, not GM-adjudicated (DERIVATION, replaces the RAW center-to-center line for walls only):** the attacker picks their best tile corner and traces rays to all four corners of the target tile. **All rays wall-blocked → no line of effect** (the target cannot be targeted at all — stricter than RAW standard cover); **some blocked → standard cover** (the "half cover" of the roadmap, +2 AC); **none blocked → no cover from walls**. This makes wall cover angle-dependent (corner-peeking) deterministically, where RAW leaves partial occlusion to the GM. There is **no shooting through walls, ever**.
- **Creatures (RAW):** any standing creature other than the attacker and target whose tile the center-to-center line crosses grants the target **lesser cover (+1 AC)**. This is the friendly-fire decision: an ally in the firing line means +1 AC for the enemy; **misses never redirect to the ally** (a redirect house rule was offered and declined).
- **Raised props (DERIVATION from tileset semantics):** blocked tiles with a raised extrusion *below* the wall threshold (carts, rubble, crates, reeds — `raised < 0.7`) are **objects**: they grant **standard cover (+2)** when the center-to-center line crosses them, and **never block targeting**. Blocked tiles at or above the threshold (`raised >= 0.7` — walls, pillars) are **walls**: corner-sampled, can fully block. Flat blocked tiles (water, chasms, embers — no `raised`) are impassable but grant **no cover** and never block line of effect.
- **Cover vs area effects (RAW):** standard cover grants +2 to Reflex saves against area effects ("cover helps against a fireball"); lesser cover grants nothing. Measured from the area's origin point.
- Stealth bonuses and Hide are vendored above but unused until a stealth system exists.
