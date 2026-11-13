# Large feature process

Examples: scoring history / statistics across matches, anything with a new table plus new endpoints
plus new screens, anything about users or permissions (needs a decision record first).

## Phase 1: Understand (no code)
1. Task brief with ALL open questions listed. Human answers them. Security or data-ownership
   rules need explicit, written answers.
2. Explore: structure, rules, similar features, what could be affected.
3. Design plan with at least two options and trade-offs. Mark every "Stop and ask" decision.
4. Human approves. Save an important choice as a decision record (`templates/decision-record.md`).

## Phase 2: Fix the contracts
5. Write the **contract** before any code:
   - Database: tables, columns, relations.
   - API: paths, request, response, error cases.
   - Frontend types matching the API.
6. Human approves contracts. Parallel work is only safe after this.

## Phase 3: Split work (`templates/work-split.md`)
7. Draw the dependency order. Typical:
   `contract -> database + backend  ->  frontend uses real or fake API  ->  join  ->  review`
8. Give every file/folder ONE owner. If two tasks need the same file, do them one after the other.
9. Each task states: owns, may read, must not touch, inputs, outputs, test to pass.

## Phase 4: Build
10. Run independent tasks in parallel only if contracts are fixed and owners are different.
11. Join early and often: after each finished task, merge and run tests. Do not wait for all.
12. If an agent finds the approved design is wrong (for example a missing relation):
    **it stops, explains, gives options.** Human decides. Update the plan and decision record.
    Then continue.

## Phase 5: Verify
13. Tests derived from the original requirements, written or checked by someone other than the
    builder where possible.
14. Full diff review, per layer.
15. Independent review by a second agent that gets: requirements + approved plan + diff. Not the
    builder's summary.
16. Manual check of the main journeys in the browser.

## Phase 6: Keep what was learned
17. Update docs, decision records, domain rules, known problems. Write session notes if work will
    continue later.

## Stop conditions (stop and report, do not push through)
- A decision in "Stop and ask" is needed.
- The scope is growing beyond the brief.
- A test that matters keeps failing and the cause is unclear.
- A step needs something forbidden by `checklists/safety.md`.
