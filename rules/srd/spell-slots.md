# Spell Slots & Prepared Casting (M9)

**Source:** Pathfinder Player Core (ORC), Wizard and Cleric classes, via [Archives of Nethys](https://2e.aonprd.com/Classes.aspx?ID=39) ([Cleric](https://2e.aonprd.com/Classes.aspx?ID=33), [Spell Slots](https://2e.aonprd.com/Rules.aspx?ID=270)). Vendored 2026-06-11.

## Prepared casting

Wizards and clerics are **prepared casters**: at daily preparation they lock a **specific spell into a specific slot**. Casting the spell expends that slot for the day. Cantrips (e.g. *Ray of Frost*) are not leveled spells and never consume slots — they can be cast at will.

## Slots per day at level 1

- **Wizard:** prepares **two 1st-rank spells** (and five cantrips) each morning.
  *Player Core also grants one extra curriculum slot per rank from the arcane school — the school feature is **out of M9 scope**, so the EMBERWATCH wizard has the 2 base rank-1 slots (flagged simplification).*
- **Cleric:** prepares **two 1st-rank spells** (and five cantrips) each morning, **plus 4 divine font slots** restricted to *Heal* (see `cleric-divine-font.md`).

## M9 EMBERWATCH loadout (testability requirement)

- Wizard: both rank-1 slots prepared with **Breathe Fire**; *Ray of Frost* known as an at-will cantrip.
- Cleric: both rank-1 slots prepared with **Heal**, plus 4 font slots (Heal-only) — 6 Heals per day total.
- **Heal is a rank-1 leveled spell from M9 on**: with a slot pool present, casting Heal expends an unexpended Heal slot (font slots are spent first); with no slot remaining the cast is rejected.
- **Opt-in enforcement:** an entity *without* a `spellSlots` pool casts unrestricted (keeps the frozen M7 contract tests intact; enemies have no pools yet).

## Recovery (interim — PROCEDURAL until M19 rest)

Daily preparation normally happens during a rest. Until M19's rest system, arriving at a **safe haven** (shelter site) freely re-prepares all expended slots. This stand-in is flagged PROCEDURAL in the dev overlay.
