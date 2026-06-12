# Next session — M13 DESIGN DISCOVERY (read this whole file before doing anything)

> **This is not an implementation loop.** Previous `NEXT_SESSION.md` files were build prompts with
> STEP 0…N and a gate. This one is different on purpose. The next session is a **design conversation**
> — a long, deliberate **Q&A** — to figure out the *high-level core loop*: the thing that makes this
> game good, or not. **Write no game code and no contract tests this session.** The only files you
> may create/edit are design docs (`DESIGN.md`, `ROADMAP.md`, `PROGRESS.md`, and finally this file).
>
> **Model: premium.** This is the most load-bearing design call on the board — it sets what M13
> builds and may reorder the roadmap. Cost discipline does not apply to thinking here.

---

## Status check before you start

- **M12 is gate-1 done but NOT yet human-accepted.** Phase A is committed (`2fb1a44`); Phase B is
  committed alongside this file. 290 tests green / 51 files, build clean, all `tests/contract/`
  untouched. **The human deferred the M12 playtest** — the gate-2 LOOK checklist and the stop signal
  in `PROGRESS.md` (M12 section) are still owed. If the human wants to do that playtest first, help
  with that before opening the design conversation. Do **not** treat M12 as accepted.
- **Do not start M13 implementation.** M13's nominal scope is "Strategic pressure, campaign AI +
  win/lose" (`ROADMAP.md`). This session decides *whether that's even the right shape* and what it
  should feel like — before a line of it is written.

---

## The mandate (in the human's words, paraphrased)

> "This is about the core game mechanic — the high-level one. From my perspective, the thing that
> makes the game good… or not. Let the next session be about figuring this out. A lot of Q&A to get
> there."

So: step **back** from the milestone checklist. The engine works — party, world map, districts,
tactical PF2e combat with smart AI, reclamation. What it does **not** yet have is a *reason to care*:
no stakes (you can't win or lose), no pressure (nothing pushes back), no rewards, no story. M13–M16
are supposed to supply those. Before building the first of them, settle the question underneath all
of them: **what is the loop that makes a play session compelling, and what would make it hollow?**

---

## How to run this session

**Socratic, not a pitch.** Your job is to *interrogate*, not to propose a design and seek approval.
Use the `AskUserQuestion` tool for focused, multiple-choice-where-it-helps batches; ask **one theme
at a time**; reflect each answer back in your own words before moving on; chase the *why* under every
answer; surface tensions and trade-offs the human may not have noticed. Expect many rounds. Do not
rush to a plan. You are done discovering only when you can state the core loop in a few sentences and
the human says "yes, that's it."

**Anchor on the design DNA and its three genre touchstones** (from `ROADMAP.md` / `AGENTS.md`):
- the pitch — *"reclaim a ruined frontier city, district by district, with a difficulty gradient
  running inward,"* original setting on Pathfinder 2e (ORC) rules;
- **XCOM** — the *tactical fight* is the product; campaign frames a string of tense setpieces;
- **Battle Brothers** — *attrition and a living world*: a clock, escalating pressure, a roster,
  harsh setbacks, permadeath;
- **Baldur's Gate 1/2** — an *authored story arc*: reclamation is the spine of a narrative, and
  "winning" is a climax.

The pivotal question is which of those is the **beating heart** the campaign layer must serve (or
what blend, and in what ratio) — because each implies a *different* M13. Don't let the human answer
"all three" without forcing the priority: what is sacrificed first when they conflict?

---

## The question agenda (a starting map, not a script — follow the human where it goes)

1. **The one-sentence fantasy.** When this game is at its best, what is the player *feeling* and
   *doing*? Finish: "EMBERWATCH is great when the player is ______." Then: what's the smallest unit
   of that feeling — a single fight? a single hard choice on the map? a whole district reclaimed?

2. **Beating heart.** Force the XCOM / Battle Brothers / BG priority above. When the tactical layer,
   the attrition layer, and the story layer pull in different directions, which wins? What gets cut?

3. **The three time-scales of the loop.** Make them concrete:
   - the **10-minute** loop (one fight / one map decision) — what's the tension?
   - the **1-hour** loop (a play session) — what did the player accomplish, risk, and carry forward?
   - the **whole-campaign** arc — what's the shape from first frontier to ending?

4. **What "winning" means.** (M13 + ties M16's story fiction.) Hold every district? A final
   site/boss? A story objective? Is there one ending or several? What does the victory screen
   actually celebrate?

5. **What "losing" means, and why it should sting.** Party wipe? Losing your last foothold? The
   clock running out? Is loss a *fail-state* (game over) or *erosion* (you can be ground down
   slowly)? Is permadeath in the core fantasy or an optional dial (M19)?

6. **Pressure and the clock.** (The M13 mechanism.) What pushes back, and on what does time advance
   — travel steps? per fight? rest? Can held sites be threatened and fall? Can *safe havens* fall,
   or are they sacrosanct? How harsh is recapture — a full re-fight or a weakened garrison? The aim
   is tension that makes reclaiming *this* site matter, without the clock feeling like an arbitrary
   timer or punishing exploration.

7. **Why care about any single site?** Today every site is mechanically interchangeable terrain.
   What makes the player *want* this district over that one — a reward, a story beat, a strategic
   chokehold, a recruit, relief of pressure elsewhere?

8. **The anti-goals — "or not."** Name the failure modes to design against, explicitly: snowballing
   (winning makes you stronger makes winning easier), busywork/grind, fake difficulty (stat-cheating
   enemies), an anticlimactic ending, a clock that just nags, decisions without consequences. The
   human's "…or not" is half the brief — capture it.

9. **Scope and ordering.** Given the answers, is **M13 (strategic pressure + win/lose)** truly the
   right next build, or does the core-loop answer pull something forward (economy/M14, progression
   /M15, story/M16) or reshape M13's contents? Decide the next *build* milestone deliberately.

---

## What you must respect (constraints the design cannot break)

The architecture is load-bearing and non-negotiable (`AGENTS.md`, `ARCHITECTURE.md`) — whatever you
design has to live inside it:
- the deterministic rules/campaign engine is the single source of truth; all state changes flow
  through the action/effect → event pipeline; `campaign-apply.ts` is the campaign-side pipeline.
- strategic AI / campaign clock must be a **pure function over campaign state**, serialized and
  replayable from the event log; old saves migrate via a serialize version bump.
- core stays headless; renderer/narrator are read-only consumers; `tests/contract/` is frozen.

Flag any design idea that would require breaking one of these, and find the in-architecture version.

---

## Deliverables of THIS session (design only)

1. **`DESIGN.md` (new)** — the core-loop vision record: the one-sentence fantasy, the beating-heart
   priority, the three time-scale loops, the win/lose definition, the anti-goals. This is the
   north-star doc later milestones answer to. Keep it tight — vision and decisions, not a spec dump.
2. **Fold the M13-specific resolutions** into `ROADMAP.md` under M13's "Clarify first" as a dated
   *"resolved"* block (the pattern M9–M12 used), and adjust the M13 "Goal/You can try" if the heart
   answer reshaped it. Reorder later milestones if the human chose to.
3. **Rewrite this file (`NEXT_SESSION.md`)** into the actual **M13 implementation brief** — a normal
   build prompt (STEP 0 baseline → contract-test-first build → gate), now that the design is locked.
   Note the model tier M13 wants (premium for the campaign-clock contract + strategic AI; standard
   for UI, per the roadmap).
4. **Update `PROGRESS.md`** "Current milestone" / "Last updated" to reflect that the design pass is
   done and M13 is ready to build (and that M12's gate-2 playtest may still be outstanding).

**Human sign-off gate:** do not write `DESIGN.md` as settled, fold anything into the roadmap as
"resolved," or write the M13 build brief until the human explicitly agrees the core loop is right.
Until then, keep asking. **No contract test gets written this session.**

---

## Orientation (read first)

- `AGENTS.md`, `ARCHITECTURE.md`, `ROADMAP.md` (esp. M13 + the Phase-2 framing), `PROGRESS.md`
  (current state; M12 gate-2 still owed). These ground the conversation in what the game *is* today
  so the design starts from reality, not a blank page.
- The game today, in one breath: create a 4-hero party (Fighter/Rogue/Wizard/Cleric) → BG-style
  overworld → enter world sites or multi-level districts → tactical PF2e combat (smart per-archetype
  AI, saves/cover/conditions/reactions) → victory flips sites hostile→held → reclaim the frontier on
  an inward difficulty gradient. HP carries over; spell slots refill at safe havens (interim). There
  is **no** campaign clock, **no** win/lose, **no** economy, **no** XP/levels, **no** story yet.
- If you want to *feel* the current loop before designing on top of it: `npm run dev`. On this
  machine npm isn't on PATH — it lives at
  `%LOCALAPPDATA%\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_*\node-v24.16.0-win-x64` (prepend to
  PATH). (This session writes no code, but playing it is good design fuel — and you can also run the
  outstanding M12 gate-2 playtest while you're there.)

One session. End when the core loop is articulated, the human agrees, the design docs are written,
and this file has become the M13 build brief — not before.
