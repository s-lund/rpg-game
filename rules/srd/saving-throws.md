# Saving Throws (M9)

**Source:** Pathfinder Player Core (ORC), via [Archives of Nethys — Saving Throws](https://2e.aonprd.com/Rules.aspx?ID=2296), [Spell DC](https://2e.aonprd.com/Rules.aspx?ID=2293), class pages. Vendored 2026-06-11.

There are three types of saving throws: **Fortitude**, **Reflex**, and **Will**.

- **Fortitude** saves reduce effects that debilitate the body. They use your **Constitution** modifier.
- **Reflex** saves measure how quickly and gracefully you avoid effects. They use your **Dexterity** modifier.
- **Will** saves measure resistance to attacks on mind and spirit. They use your **Wisdom** modifier.

**Formula:** save result = d20 roll + ability modifier + proficiency bonus (+ other bonuses − penalties).
Proficiency bonus = rank bonus + level (see `m2-subset.json` `proficiencyBonus`).

## Spell DC

> "Whenever a spell allows a saving throw, it uses the caster's spell DC."

**Spell DC = 10 + spellcasting attribute modifier + proficiency bonus.**

## Class save proficiencies at level 1 (Player Core)

| Class | Fortitude | Reflex | Will |
|-------|-----------|--------|------|
| Fighter | expert | expert | trained |
| Rogue | trained | expert | expert |
| Wizard | trained | trained | expert |
| Cleric | trained | trained | expert |

Wizard and Cleric: **trained** in spell attack modifier and spell DC at level 1.

## Degrees of success (Player Core pg. 401)

> "You critically succeed when the check's result meets or exceeds the DC by 10 or more." … "If you fail a check by 10 or more, that's a critical failure."
> "If you rolled a 20 on the die (a 'natural 20'), your result is one degree of success better than it would be by numbers alone. If you roll a 1 on the d20 (a 'natural 1'), your result is one degree worse."

Success: result ≥ DC. Failure: result < DC. Natural 20/1 adjust the numeric degree one step after computing it.

## Basic saving throws (Player Core pg. 404)

> "**Critical Success** You take no damage from the effect. **Success** You take half the listed damage from the effect. **Failure** You take the full damage listed from the effect. **Critical Failure** You take double the listed damage from the effect."

M9 rounding: half damage is halved and rounded down (standard PF2e halving).

## M9 scope

- Heroes derive save modifiers from class proficiency + ability modifier; enemies carry flat save modifiers in content data.
- Only **basic** saves are implemented (damage scaling). Non-damage save effects arrive with conditions in M10.
