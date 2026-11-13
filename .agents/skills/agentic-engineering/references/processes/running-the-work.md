# Running the work (execution)

## Before the first edit
1. Approved plan exists (medium and large).
2. `git status` is clean, or you know exactly why not. Work on a branch for this task.
3. Tests pass now. Write down the baseline (for example "backend 100 pass").

## While working
- One small step at a time. After each step: run tests for that step, look at the diff, commit.
- Commit messages say one purpose: `feat(backend): ...`, `fix(frontend): ...`, `test: ...`, `docs: ...`.
- Keep a running list of **discoveries** (things found that were not in the plan) and
  **deviations** (places you did something different from the plan). Report both.

## When something surprising happens
| Situation | Do |
|---|---|
| Small detail unclear, low risk | Choose the simplest option, note it in the report |
| Rule unclear (cricket or product) | Stop and ask |
| Plan is wrong or impossible | Stop at that point, explain, give options |
| Unrelated bug found | Write it down. Do not fix it in this task |
| Test fails for unknown reason | Investigate. Do not weaken or delete the test to pass |

## Checkpoints for big work
Investigation done -> plan approved -> split approved -> each step done and tested ->
joined -> review done -> finished.

## Permissions (least power)
Ask first for: resetting a database, deleting files, force push, deploy, installing packages,
secrets, production config. See `checklists/safety.md`.

## Stop when
- The finish checklist is green, or
- A decision is needed from the human, or
- Something outside your control blocks you, or
- You are about to go beyond the brief.
Do not keep "improving" after the brief is satisfied.
