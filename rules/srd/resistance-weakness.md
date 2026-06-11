# Immunity, Weakness, and Resistance (M9)

**Source:** Pathfinder Player Core (ORC) pg. 407–408, via [Archives of Nethys](https://2e.aonprd.com/Rules.aspx?ID=2312) and [Step 3: Apply Immunities, Weaknesses, and Resistances](https://2e.aonprd.com/Rules.aspx?ID=2309). Vendored 2026-06-11.

**Order of application: immunities first, then weaknesses, then resistances.**

## Weakness

> "Whenever you would take that type of damage, increase the amount of damage by the value of the weakness."

A weakness only triggers when you **would take** damage of that type — an effect that deals no damage (e.g. a critical success on a basic save) does not trigger weakness.

## Resistance

> "If you have resistance to a type of damage, each time you would take damage of that type, reduce the amount of damage by the listed number (to a minimum of 0 damage)."

> "After any weaknesses, apply resistances."

## M9 scope

- Immunities are out of scope (no immune creatures yet); weakness and resistance are implemented for all `Damage` effects (strikes, spell attacks, save spells).
- Applied in core damage adjustment: `final = max(0, amount + weakness − resistance)` when `amount > 0`; an amount of 0 stays 0.
- Creatures carry `resistances` / `weaknesses` as damage-type → value maps in their blueprints (content packs).
