# Breathe Fire (spell 1)

**Source:** Pathfinder Player Core (ORC) pg. 319, via [Archives of Nethys](https://2e.aonprd.com/Spells.aspx?ID=1457). Remaster name for the legacy spell *Burning Hands*. Vendored 2026-06-11.

- **Rank:** 1 · **Traits:** concentrate, fire, manipulate · **Traditions:** arcane, primal
- **Cast:** 2 actions
- **Area:** 15-foot cone
- **Defense:** basic Reflex save

> "A gout of flame sprays from your mouth. You deal 2d6 fire damage to creatures in the area with a basic Reflex save."

**Heightened (+1):** The damage increases by 2d6. *(M9 casts at rank 1 only.)*

## Cone area ([Areas — Cone](https://2e.aonprd.com/Rules.aspx?ID=2386))

> "A cone shoots out from you in a quarter circle on the grid." … "When you aim a cone, the first square of that cone must share an edge with your space if you're aiming orthogonally, or it must touch a corner of your space if you're aiming diagonally." … "You can't aim a cone so that it overlaps your space."

## M9 grid template (deterministic derivation)

1 tile = 5 feet → a 15-foot cone is 3 tiles long. The template is the set of tiles whose **center** lies inside the quarter circle of radius 3 tiles centered on the cone's origin point (edge midpoint for cardinal aim, corner for diagonal aim), spanning ±45° around the aim direction.

**Cardinal** (e.g. east, caster at C): 7 tiles —

```
. . x x
C x x x
. . x x
```

**Diagonal** (e.g. north-east): 8 tiles —

```
. x x .
. x x x
. x x x
C . . .
```

Aim direction snaps to the nearest of the 8 directions from the caster toward the chosen target tile; the target tile must be inside the template. Creatures in the area — **allies included** (friendly fire per RAW), caster excluded — each attempt their own basic Reflex save against the caster's spell DC. The damage dice are rolled once for all targets.

**M9 simplification (flagged):** the cone ignores walls — line of effect arrives with line of sight in M11.
