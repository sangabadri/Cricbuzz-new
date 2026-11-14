# Commit Guidelines & Git Hygiene

This document defines the commit discipline, message formatting, and change management expectations for Cricbuzz Tracker.

---

## 1. Commit Philosophy: One Purpose per Commit

A git commit is a permanent, reviewable historical record of an engineering decision.

### Key Commit Rules:
1. **Single Coherent Change**: Each commit must represent exactly one logical change.
2. **Never Mix Concerns**: Never combine a feature addition, a bug fix, code refactoring, and file formatting in the same commit.
3. **Small and Focused**: Prefer small, independently understandable commits over large monolithic dumps.
4. **Clean Tree**: Commits must never contain temporary files, editor configs (`.vscode`, `.idea`), local caches (`__pycache__`, `.pytest_cache`), print statements, or debug logs.
5. **Atomic Buildability**: Every commit should leave the test suite passing and the build green (`git bisect` safe).
6. **Agent Authorization Rule**: **AI coding agents must NEVER create git commits, push branches, or alter git history unless the user explicitly instructs them to do so.**

---

## 2. Commit Message Structure

Follow the Conventional Commits specification:

```text
<type>(<scope>): <short descriptive summary in imperative mood>

[optional body explaining motivation, context, and architectural rationale]

[optional issue reference or ADR reference]
```

### Commit Types:
- `feat`: A new user-facing feature or API endpoint.
- `fix`: A bug fix or defect correction.
- `refactor`: Code restructuring with zero changes to external behavior.
- `test`: Adding missing tests, updating test suites, or fixing brittle assertions.
- `docs`: Documentation creation, updates, or organization.
- `perf`: Performance improvement (e.g. eliminating an N+1 database query).
- `chore`: Tooling, build pipeline, dependency lockfiles, or maintenance scripts.

### Scopes:
- `backend`: Backend API, services, routers, models, schemas.
- `frontend`: Frontend UI, components, hooks, pages, routing.
- `domain`: Pure cricket rules, crease state, innings aggregate.
- `auth`: Authentication, JWT, tokens, session cookies, permissions.
- `db`: Database migrations, SQLAlchemy models, queries.
- `scoring`: Delivery recording, crease HUD, keypad, scorecards.
- `docs`: Repository documentation.

---

## 3. Good vs. Bad Commit Examples

| Bad Commit (Prohibited) | Good Commit (Encouraged) |
|---|---|
| `git commit -m "update code and fix bugs"` | `fix(scoring): prevent duplicate striker assignment on wicket` |
| `git commit -m "wip"` | `refactor(backend): decompose _build_innings_scorecard into pure helpers` |
| `git commit -m "feat: auth + frontend refactor + tests + fix bug"` | Split into 4 commits: `feat(auth): ...`, `refactor(frontend): ...`, `test(auth): ...`, `fix(ui): ...` |
| `git commit -m "changes"` | `docs(contracts): document REST API status codes and auth matrix` |

---

## 4. Pre-Commit Checklist for Humans and Agents

Before committing:
- [ ] `git status` inspected: only files intended for this change are staged.
- [ ] `git diff --cached` reviewed: no stray whitespace, debugging prints, or unrelated changes.
- [ ] Backend tests pass: `pytest` in `backend/`.
- [ ] Frontend checks pass: `npm run lint`, `npm test`, `npm run build` in `frontend/`.
- [ ] Automated quality gate is green: `python .agents/skills/agentic-engineering/scripts/audit_gate.py --full`.
- [ ] Commit message accurately describes the *why* and *what* in plain English.
