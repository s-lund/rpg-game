# Ability Scores (M2 subset)

**Source:** Pathfinder Player Core, Chapter 2 — Building a Character (ORC).

## Point pool

M2 uses a **point pool** instead of the standard array:

- Every ability starts at **10** (base score).
- You have **18 points** to distribute. Raising a score above 10 costs 1 point per point; lowering below 10 returns 1 point per point.
- Each ability must stay between **8** and **18** at level 1.

Example: STR 18 costs 8 points; CHA 8 returns 2 points to the pool.

## Ability modifier

```
modifier = floor((score - 10) / 2)
```

Examples: 18 → +4, 16 → +3, 14 → +2, 12 → +1, 10 → +0, 8 → −1.
