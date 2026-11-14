# Reviewing and accepting

## The main danger
If the same agent writes the code and the tests, both can share the same wrong idea.
Example: requirement says "anyone can read public matches", the agent thinks every endpoint needs login,
and writes tests that expect login everywhere. All tests pass. The feature is wrong.

## How we reduce it
1. Write test cases from the **requirement** (the task brief), before or independent of the code.
2. Read what the tests check, not only that they pass.
3. Use a second agent (read-only) for risky work.
4. Keep old tests. They protect existing behaviour.
5. Try the main journey by hand.

## Read the real diff
Order:
1. `git status`
2. `git diff --stat` (is anything here that should not be?)
3. Full `git diff`, layer by layer (see `checklists/diff-review.md`)
4. Tests: do they cover each line of "How we know it works"?
5. Run the tests on the **final** code. If code changed after the last run, run again.

## Ask "how could this break?"
Empty input, duplicates, wrong state (for example scoring in a completed match), the same request twice,
two requests at once, half-finished operations, a response shaped differently than expected,
old features accidentally changed.

## Anti-Hallucination & Circular Truth Review (Checking Doc Changes)

> [!CAUTION]
> **The Circular Truth Trap**: If a subagent makes a mistake in code, it might alter the documentation to match its mistake (e.g. changing `cricket-rules.md` to permit runs on bowled dismissals). If a reviewer only reads the modified file on disk, the code and doc will look consistent, hiding the bug.

### Reviewer Anti-Hallucination Protocol:
1. **Never read raw doc files in isolation**: Inspect `git diff HEAD` for both code AND documentation.
2. **Compare against canonical baseline**: Run `git show HEAD:<doc>` (or `origin/main:<doc>`) to see the baseline rule before the author touched it.
3. **Autonomy boundary check (AGENTS.md Section 4)**: Cricket domain rules and security decisions are strictly in the "STOP AND ASK" tier. If an author modified canonical cricket rules in `docs/domain/cricket-rules.md` or security contracts without an explicit user instruction in the task brief, **flag it as an immediate HIGH SEVERITY REJECTION**.

## Second agent prompt (read-only)
> You are a reviewer. Do not edit files. Inputs: the task brief, the approved plan, and `git diff main...HEAD`.
> Check both code and documentation diffs against the canonical baseline (`git show HEAD:<doc>`).
> Report: findings by severity (high, medium, low), each with file and function and a scenario that fails;
> missing tests; places where the design rules were broken; any unauthorized modifications to canonical
> cricket rules or security invariants (Circular Truth detection); and a recommendation: accept,
> accept with changes, or reject. Check the whole request path, not just one layer.

## Choosing how much checking
| Risk | Checking |
|---|---|
| Label or typo | Look at the diff |
| Small rule | Focused tests + diff |
| New endpoint or screen | Requirement tests + full suite + diff + manual check |
| Data or permission work | All of the above + second agent + decision record |

Extra tools (property tests, mutation tests like `mutmut`, contract tests) only when the risk
justifies them. They are not needed for every change.

## Accept only when
`checklists/finish-checklist.md` is fully ticked.
