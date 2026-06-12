# Conditions (M10 subset)

**Source:** Pathfinder Player Core (ORC), via [Archives of Nethys — Conditions](https://2e.aonprd.com/Conditions.aspx), [Persistent Damage](https://2e.aonprd.com/Conditions.aspx?ID=86), [Stunned](https://2e.aonprd.com/Conditions.aspx?ID=93), [Step 1: Start Your Turn](https://2e.aonprd.com/Rules.aspx?ID=2428). Vendored 2026-06-11.

M10 implements exactly five conditions: **frightened, prone, stunned, slowed, persistent damage** (decision 2026-06-11). All others deferred (most to M17).

## Frightened (Player Core pg. 444)

> "You're gripped by fear and struggle to control your nerves. The frightened condition always includes a value. You take a status penalty equal to this value to all your checks and DCs. Unless specified otherwise, at the end of each of your turns, the value of your frightened condition decreases by 1."

## Prone (Player Core pg. 445)

> "You're lying on the ground. You are off-guard and take a –2 circumstance penalty to attack rolls. The only move actions you can use while you're prone are Crawl and Stand. Standing up ends the prone condition."

*Note:* "off-guard" is the remaster name for the legacy "flat-footed" — our core's existing `flat_footed` condition (−2 circumstance penalty to AC).

## Stunned (Player Core pg. 446)

> "You've become senseless. You can't act. Stunned usually includes a value, which indicates how many total actions you lose, possibly over multiple turns, from being stunned. Each time you regain actions, reduce the number you regain by your stunned value, then reduce your stunned value by the number of actions you lost. For example, if you were stunned 4, you would lose all 3 of your actions on your turn, reducing you to stunned 1; on your next turn, you would lose 1 more action, and then be able to use your remaining 2 actions normally. Stunned might also have a duration instead, such as 'stunned for 1 minute,' causing you to lose all your actions for the duration."
>
> "Stunned overrides slowed. If the duration of your stunned condition ends while you are slowed, you count the actions lost to the stunned condition toward those lost to being slowed. So, if you were stunned 1 and slowed 2 at the beginning of your turn, you would lose 1 action from stunned, and then lose only 1 additional action by being slowed, so you would still have 1 action remaining to use that turn."

## Slowed (Player Core pg. 446)

> "You have fewer actions. Slowed always includes a value. When you regain your actions, reduce the number of actions regained by your slowed value."

## Persistent Damage (Player Core pg. 445)

> "You are taking damage from an ongoing effect, such as from being lit on fire. This appears as 'X persistent [type] damage,' where 'X' is the amount of damage dealt and '[type]' is the damage type."

Damage is taken at the end of each of your turns, with dice rolled anew each time. After taking persistent damage, you attempt a **DC 15 flat check**; *"If you succeed, the condition ends."*

Additional mechanics from the condition entry:

- Multiple persistent damage conditions of *different* types can apply simultaneously.
- Same type: the higher amount overrides the lower (they do not stack).
- Immunities, resistances, and weaknesses apply to persistent damage.
- Assisted recovery (an ally spending actions to lower the DC / auto-end) exists in RAW.

## Start of turn — regaining actions (Player Core pg. 435)

> "Regain your 3 actions and 1 reaction. If you haven't spent your reaction from your last turn, you lose it—you can't 'save' actions or reactions from one turn to use during the next turn."

Conditions like quickened, slowed, and stunned "can change how many actions you regain and whether you regain your reaction."

## M10 scope

- **Frightened:** status penalty applies to attack rolls, save results, spell/class DCs, and AC-as-DC where checks target it; auto-decrements by 1 at the end of the bearer's turn.
- **Prone:** grants `flat_footed` (off-guard) while prone and −2 circumstance penalty to the prone creature's attack rolls. **Stand** is implemented as a 1-action combat action that ends prone; Crawl is out of scope (Stride while prone is simply unavailable — Step/Stride actions are rejected while prone).
- **Stunned:** value-based only (no duration-based stunned this pass); reduces actions regained at turn start per the quoted accounting, and the stunned-overrides-slowed interaction is implemented per the quoted example.
- **Slowed:** value-based, reduces actions regained at turn start.
- **Persistent damage:** typed; ticks at end of the bearer's turn as a normal `Damage` effect through the pipeline (so M9 resistance/weakness adjustment applies, which is RAW); then a DC 15 flat check (seeded RNG, recorded in the event log) ends it on success. Different types stack; same type keeps the higher amount. Assisted recovery is out of scope this pass.
- Condition penalties flow through the same derivation used by the resolver and the hover inspector — never computed in the renderer.
