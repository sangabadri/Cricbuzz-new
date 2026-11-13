# Medium feature process

Examples: a new read endpoint plus a frontend page; a new field on an existing screen;
a new validation group. The design already exists. You are adding to it.

## Steps
1. **Task brief** ([task-brief.md](../../resources/templates/task-brief.md)). Objective, scope, requirements, how we know it works,
   open questions. Human answers the open questions.
2. **Explore (no edits).** Trace one similar feature from the top to the bottom
   (see [context-and-exploration.md](./context-and-exploration.md)). Write down the files and patterns you found.
3. **Design plan** ([design-plan.md](../../resources/templates/design-plan.md)). Short. Which files change, what goes where,
   data flow, test plan. **Human approves before step 4.**
4. **Split into small steps.** Each step can be tested alone. Order: lowest layer first.
   One agent doing the steps in order is usually enough.
5. **Build in steps.** After each step: run focused tests, read the diff of that step, commit.
6. **Whole-suite check.** Backend and/or frontend full test run, lint, build.
7. **Review** ([reviewing-and-accepting.md](./reviewing-and-accepting.md)). For risky work use a second agent that only reads.
8. **Update docs** if something now behaves differently or a rule was added.
9. **Report** ([review-report.md](../../resources/templates/review-report.md)).

## Checkpoints (stop and show the human)
- After step 2 (what was found).
- After step 3 (plan approved).
- After step 7 (review result).

## Moving up to LARGE
Do it if you discover a new table or column is needed, the API shape of existing endpoints must
change, or two parts of the system disagree about a rule.
