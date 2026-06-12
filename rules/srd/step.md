# Step (basic action)

**Source:** Pathfinder Player Core (ORC), via [Archives of Nethys — Step](https://2e.aonprd.com/Actions.aspx?ID=2304). Vendored 2026-06-12.

- **Cost:** 1 action · **Traits:** move
- **Requirements:** Your Speed must be at least 10 feet.

## Rules text

> "You move 5 feet carefully."
>
> "Stepping doesn't trigger reactions, such as Reactive Strike, that can be triggered by move actions or upon leaving or entering a square."

You can't Step into difficult terrain, and you can Step only with your land Speed.

## M12 mapping — EMBERWATCH's move action vs RAW Step/Stride

EMBERWATCH has a single combat movement action (action kind `"Step"`, 1 AP per
tile along a passable route, M9 path-aware). Its reaction interactions, per the
M12 decision (2026-06-12):

- **Leaving a reactor's reach still provokes (HOUSE RULE, M10, frozen):** the
  M10 contract pins that the game move triggers Reactive Strike when it leaves
  reach — that is the XCOM-style disengage zoning the universal-AoO house rule
  was chosen for, and it diverges from RAW Step's blanket exemption on purpose.
- **The within-reach move trigger ("a creature within your reach uses a move
  action") does NOT fire for the game's Step**, per the RAW exemption above.
  With 1-tile melee reach this clause is currently vacuous — on a 4-neighbor
  grid every move that starts within reach leaves it on its first square and is
  already covered by the leaving-reach trigger — but it is recorded now so
  reach-2 weapons (M14+) cannot silently make every adjacent shuffle provoke.
- **Stand is a move action with no such exemption** ([Stand —
  Archives of Nethys](https://2e.aonprd.com/Actions.aspx?ID=2303): 1 action,
  move trait, "You stand up from being prone."), so Standing while within a
  reactor's reach provokes. See `reactive-strike.md` M12 scope.
