# Initiative (M10)

**Source:** Pathfinder Player Core (ORC), via [Archives of Nethys — Step 1: Roll Initiative](https://2e.aonprd.com/Rules.aspx?ID=2423) and class pages ([Fighter](https://2e.aonprd.com/Classes.aspx?ID=35), [Rogue](https://2e.aonprd.com/Classes.aspx?ID=37), [Wizard](https://2e.aonprd.com/Classes.aspx?ID=12), [Cleric](https://2e.aonprd.com/Classes.aspx?ID=33)). Vendored 2026-06-11.

## Rolling initiative

> "Rolling initiative marks the start of an encounter and determines each participant's place in the initiative order, which is the sequence in which the encounter's participants will take their turns."

> "Typically, you'll roll a Perception check to determine your initiative—the more aware you are of your surroundings, the more quickly you can respond. Sometimes, though, the GM might call on you to roll some other type of check—a social encounter could call for a Deception or Diplomacy check, and in most cases, you can still use Perception if you prefer."

## Initiative order

> "Unlike a check where the result is compared to a DC, the results of initiative rolls are ranked. This ranking sets the order in which the encounter's participants act—the initiative order. The character with the highest result goes first, and the second highest follows, and so on until whoever had the lowest result takes their turn last."

## Tie-breaking

> "If your result is tied with an enemy's result, the enemy goes first. If your result is tied with another PC's, you can decide between yourselves who goes first when you reach that place in the initiative order."

## Perception (initiative check) formula

Perception check = d20 + Wisdom modifier + proficiency bonus.
Proficiency bonus = rank bonus + level (see `m2-subset.json` `proficiencyBonus`).

### Class Perception proficiencies at level 1 (Player Core)

| Class | Perception |
|-------|------------|
| Fighter | expert |
| Rogue | expert |
| Wizard | trained |
| Cleric | trained |

## M10 scope

- Everyone rolls Perception for initiative (no alternate-skill initiative).
- Heroes derive Perception from class proficiency + Wisdom modifier; enemies carry flat Perception modifiers in content data (same pattern as M9 save modifiers).
- PC-vs-PC ties: the SRD lets players choose; headless core cannot ask, so ties between party members break by party-slot order (deterministic). Enemy-vs-enemy ties break by entity id (deterministic). PC-vs-enemy ties: **enemy goes first**, per the quoted rule.
- Initiative rolls come from the seeded combat RNG and are recorded so replay reconstructs the identical order.
