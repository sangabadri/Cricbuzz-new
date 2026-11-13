# Agent Rules (read this first)

Cricbuzz Tracker: cricket scoring app. Backend: FastAPI + async SQLAlchemy + PostgreSQL.
Frontend: React + TypeScript + Vite + Tailwind + TanStack Query.

## Read order
1. This file.
2. The AGENTS.md of the part you are changing: `backend/AGENTS.md` or `frontend/AGENTS.md`.
3. The guides that file points to. Do not read everything. Read what the task needs.
4. Then the real code. **The code is the truth for how things work now. Docs can be old.**

## Current state (keep this true)
- Auth, users, and match access exist on `main`, but contain documented architectural debt (`docs/decisions/0005-no-auth.md`, `backend/docs/known-problems.md`). Do not replicate or expand these patterns without a written design plan.
- Public spectator match viewing and scorecards must always remain unauthenticated.
- Backend tests must pass before and after your change.
- Frontend tests, lint and build must pass before and after your change (fix TS build errors before adding code).

## Five rules that matter most
1. **Do only what the task says.** No extra refactors, renames, new libraries or "cleanups".
2. **Do not guess business rules.** If a cricket rule or requirement is unclear, stop and ask.
3. **One purpose per commit.** Never mix a feature, a restructure and a new system in one commit.
4. **Tests come from the requirement, not from your code.** Test what should happen.
5. **Say what you did not do.** Report skipped work and failing tests honestly.

## How much freedom you have
| Level | What it covers | What you do |
|---|---|---|
| Go ahead | Names, small helpers, simple validation, ordinary tests | Just do it |
| Propose first | New service methods, new queries, new components or hooks, moving code | Write a short proposal, then continue inside what was approved |
| Stop and ask | Database tables or columns, API shape changes, new folder layers, new libraries, security, deleting data, cricket rule changes | Stop. Explain. Give 2 options. Wait. |

If the approved plan turns out to be wrong halfway, **stop at that point** and tell the human.
Do not quietly change the design.

## Engineering Workflow Skill
Follow the workspace skill `.agents/skills/agentic-engineering/` (`SKILL.md`) for task sizing, pre-flight checks, 3-tier autonomy, automated quality gates, and review loops.
To classify your task scope automatically:
```bash
python .agents/skills/agentic-engineering/scripts/diff_inspector.py
```

## Commands
- Run Automated Quality Gate: `python .agents/skills/agentic-engineering/scripts/audit_gate.py --full`
- Backend Tests: `pytest` inside `backend/`
- Frontend Checks: `npm run lint`, `npm test`, `npm run build` inside `frontend/`

## Safety Limits (Enforced by Hook)
- Never run: database reset, `git push --force`, `git reset --hard`, deleting files outside the task,
  installing packages, changing Docker/k8s files, touching secrets.
- Enforced mechanically by `.agents/hooks.json` via `pre_command_safety.py`.

## Where things are
| Need | Location |
|---|---|
| Workflow Skill & Router | `.agents/skills/agentic-engineering/SKILL.md` |
| Sized Processes (Small / Med / Large) | `.agents/skills/agentic-engineering/references/processes/` |
| Checklists (Start / Diff / Finish / Safety) | `.agents/skills/agentic-engineering/references/checklists/` |
| Templates (Task brief, plan, review report) | `.agents/skills/agentic-engineering/resources/templates/` |
| Automation Scripts (Audit gate, Diff inspector) | `.agents/skills/agentic-engineering/scripts/` |
| Cricket domain rules | `docs/domain/cricket-rules.md` |
| Architecture decisions (ADRs) | `docs/decisions/` |
| Known problems & tech debt | `backend/docs/known-problems.md`, `frontend/docs/known-problems.md` |
| Session notes & handoffs | `docs/notes/` |
| Worked examples | `docs/examples/` |
