# Agent Rules & Global Engineering Instructions

Cricbuzz Tracker is a real-time cricket scoring and live match tracking system.
- **Backend**: Python 3.11, FastAPI, async SQLAlchemy 2.0, PostgreSQL, Pydantic v2, pytest.
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Query v5, Axios, React Router, Vitest.

---

## 1. Instruction Hierarchy & Read Order

Always follow this read order based on the scope of your task:
1. **This file (`/AGENTS.md`)**: Global instructions, autonomy limits, and engineering standards.
2. **Subsystem Instructions**:
   - Backend tasks: [`backend/AGENTS.md`](backend/AGENTS.md)
   - Frontend tasks: [`frontend/AGENTS.md`](frontend/AGENTS.md)
3. **Workspace Skill**: [`.agents/skills/agentic-engineering/SKILL.md`](.agents/skills/agentic-engineering/SKILL.md) for task sizing, checklists, and automated gates.
4. **Relevant Topic Documentation**: Read only what the task needs from [`docs/README.md`](docs/README.md).
5. **The Real Code**: **The source code and automated tests are the final truth.** If documentation and implementation disagree, investigate and report the discrepancy.

---

## 2. Fundamental System Invariants (Keep These True)

- **Public Spectator Access**: Public spectator match viewing, live status, and scorecards must ALWAYS remain completely unauthenticated (ADR-0005).
- **Domain Purity**: `backend/app/domain/` contains pure cricket rules and must NEVER import FastAPI, SQLAlchemy, or Pydantic (ADR-0001, enforced by automated tests).
- **Single Source of Auth Truth**: Match ownership and scorer access reside solely in the `match_access` table with `role = MatchUserRole.OWNER` or `SCORER` (ADR-0007).
- **Scoring Lock Order**: All methods that mutate match or innings state lock rows in the exact order: **match first, then innings** (`for_update=True`, ADR-0003).
- **No Client-Side Cricket Rules**: The frontend never calculates scores, overs, strike rotation, or wickets. The backend decides; the frontend displays (ADR-0006).
- **Pre-Flight and Post-Flight Quality Gates**: All backend tests (185) and frontend checks (lint, 131 tests, build) must pass before and after your change.

---

## 3. The Five Core Rules for AI Coding Agents

1. **Do only what the task says**: No opportunistic refactoring, unsolicited renames, new packages, or unsolicited "cleanups".
2. **Do not guess business rules**: If a cricket rule or requirement is unclear, stop and ask.
3. **One purpose per commit**: Never mix a feature addition, a restructure, and a bug fix in one commit.
4. **Tests come from requirements, not code**: Test what should happen, including negative, boundary, and failure cases.
5. **Say what you did not do**: Report skipped scenarios, known limitations, and open questions honestly.

---

## 4. Autonomy Boundaries: What You Can Do

| Level | What it Covers | Action Required |
|---|---|---|
| **Go Ahead** | Names, small internal helpers, simple validation, ordinary unit tests. | Implement directly. |
| **Propose First** | New service methods, queries, components, hooks, moving files. | Write a brief proposal, get sign-off, then build. |
| **Stop and Ask** | Database tables/columns, API shapes, auth/security, cricket rules, deleting code. | **Stop immediately.** Explain. Provide 2 clear options with trade-offs. Wait for decision. |

If an approved plan proves wrong midway through execution, **stop at that point** and alert the human. Never quietly modify the design.

---

## 5. Working Across Components & Shared File Ownership

When a change touches both backend and frontend:
1. **Vertical Sequence**: Complete backend schemas, services, endpoints, and E2E tests before touching the frontend.
2. **Synchronize Contracts**: Update TypeScript definitions (`frontend/src/types/cricket.ts`) to match backend schemas in the same task.
3. **Shared File Edit Sequence**:
   - Edit shared registration files last: `backend/app/api/deps.py`, `backend/app/routers/api.py`, `frontend/src/app/router/index.tsx`, `frontend/src/components/Navbar.tsx`.
   - Never add duplicate API clients: all HTTP traffic flows exclusively through `frontend/src/lib/api-client.ts`.

---

## 6. Safety Limits (Mechanically Enforced by Hook)

The `.agents/hooks.json` configuration mechanically blocks destructive commands via `pre_command_safety.py`. Never attempt to:
- Reset the database or drop tables outside test fixtures.
- Execute `git push --force` or `git reset --hard`.
- Delete files outside the designated task scope.
- Install unapproved third-party packages or edit `requirements.txt` / `package.json`.
- Modify Dockerfiles or Kubernetes manifests without explicit instruction.
- Touch or reveal secrets or credentials.

---

## 7. Quality Gate & Test Verification Commands

Run these commands to verify your changes:

```powershell
# Automated Pre-Flight Quality Gate (Runs all checks across both workspaces):
python .agents/skills/agentic-engineering/scripts/audit_gate.py --full

# Backend Tests (185 tests in in-memory SQLite):
cd backend
..\.venv\Scripts\pytest.exe

# Frontend Checks (Lint, 131 tests, TypeScript build):
cd frontend
npm run lint
npm test -- --run
npm run build
```

---

## 8. Documentation Sitemap

| Category | Topics & Key Documents |
|---|---|
| **Product & Scope** | [`docs/product/overview.md`](docs/product/overview.md) • [`docs/product/requirements.md`](docs/product/requirements.md) |
| **System Architecture** | [`docs/architecture/system-overview.md`](docs/architecture/system-overview.md) • [`docs/decisions/`](docs/decisions) |
| **Domain & Cricket Rules** | [`docs/domain/domain-model.md`](docs/domain/domain-model.md) • [`docs/domain/cricket-rules.md`](docs/domain/cricket-rules.md) |
| **Contracts & APIs** | [`docs/contracts/interface-contracts.md`](docs/contracts/interface-contracts.md) |
| **Development Guides** | [`docs/development/development-workflow.md`](docs/development/development-workflow.md) • [`docs/development/feature-development.md`](docs/development/feature-development.md) • [`docs/development/bug-fixing.md`](docs/development/bug-fixing.md) • [`docs/development/refactoring.md`](docs/development/refactoring.md) • [`docs/development/commit-guidelines.md`](docs/development/commit-guidelines.md) • [`docs/development/code-review-and-completion.md`](docs/development/code-review-and-completion.md) |
| **Testing Strategy** | [`docs/testing/testing-strategy.md`](docs/testing/testing-strategy.md) • [`docs/testing/requirements-to-tests.md`](docs/testing/requirements-to-tests.md) • [`docs/testing/quality-gates.md`](docs/testing/quality-gates.md) |
| **Deployment & Infra** | [`docs/deployment/deployment-guide.md`](docs/deployment/deployment-guide.md) |
| **Known Tech Debt** | [`backend/docs/known-problems.md`](backend/docs/known-problems.md) • [`frontend/docs/known-problems.md`](frontend/docs/known-problems.md) |
| **Worked Examples** | [`docs/examples/worked-examples.md`](docs/examples/worked-examples.md) |
