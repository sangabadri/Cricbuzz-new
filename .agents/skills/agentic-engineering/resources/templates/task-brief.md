# Task brief

Copy this file to `docs/notes/<date>-<short-name>-brief.md` (medium and large tasks).
For small tasks, fill only Goal, Must do, Must not change, How we know it works.

## Goal
What do we want, in one or two lines? Describe the result, not the code.

## In scope / Out of scope
- In:
- Out:

## Must do (requirements)
What the system must do. Business words only. No table names, no class names here.
1.
2.

## Rules to respect (constraints)
Limits from the project: layers, no new libraries, no changes to X, performance, etc.
-

## How we know it works
Things anyone can check by looking or running. Each line becomes at least one test.
- [ ] Given ..., when ..., then ...
- [ ] Given ..., when ..., then ...

## Open questions (agent must not guess these)
| # | Question | Who answers | Answer |
|---|---|---|---|
| 1 | | | |

## Size
Small / Medium / Large (see [references/processes/00-pick-the-size.md](../../references/processes/00-pick-the-size.md))

## Keep these separate
- Requirement: what must happen. ("Several scorers can open one match.")
- Rule: a limit. ("Access must not live inside the Match table.")
- Design choice: one way to do it. ("Add a MatchAccess table.")
Do not write a design choice as if it were a requirement.
