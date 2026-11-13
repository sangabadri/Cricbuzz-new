# Session Notes — Agent-Kit Integration & Architectural Audit

- Date: 2026-11-13
- Author: Antigravity

## Goal
Integrate `agent-kit` (derived from `toolkit-c`) into `cricbuzz-tracker`, establish governing rules (`AGENTS.md`), catalog all known technical debt across backend and frontend, and prepare for clean incremental engineering.

## Approved Design
- ADR-0001 through ADR-0006 in `docs/decisions/`.
- ADR-0005: Auth & Match Access code on `main` is accepted as existing technical debt governed by `backend/docs/known-problems.md` and `frontend/docs/known-problems.md`.

## Done (What is really in the code)
- Imported `AGENTS.md`, `backend/AGENTS.md`, and `frontend/AGENTS.md` into the repo.
- Imported and updated `docs/` (process, checklists, decisions, domain cricket rules, templates).
- Removed `CLAUDE.md` per user instruction.
- Added comprehensive audit findings to `backend/docs/known-problems.md` (9 items) and `frontend/docs/known-problems.md` (7 items).

## Repository State
- **Branch**: `main`
- **Backend Test Status**: 165 passed (`pytest -c backend/pytest.ini backend`).
- **Frontend Test Status**: 226 passed (`vitest run`).
- **Frontend Build Status**: **FAILING** (`tsc -b && vite build`) with:
  `src/features/authentication/__tests__/AuthContext.test.tsx(14,7): error TS2698: Spread types may only be created from object types.`

## Checks Run and Results
- `pytest -c backend/pytest.ini backend`: 165 passed in 3.57s.
- `npm test -- --run` (in `frontend/`): 226 passed across 18 test files.
- `npm run build` (in `frontend/`): Failed on TS2698 in `AuthContext.test.tsx`.

## Still to Do
1. Fix TS2698 in `frontend/src/features/authentication/__tests__/AuthContext.test.tsx` so `npm run build` is 100% green.
2. Resolve split-brain frontend: retire legacy unmounted `src/pages/` and migrate tests to `src/features/`.
3. Resolve backend auth debt:
   - Extract authorization query logic from `api/deps.py` into a single-query service.
   - Map auth failures to proper HTTP 401/403/409 codes instead of `CricketDomainError` (400).
   - Fix dual source of truth for match ownership and cascade privilege drop.
   - Transition refresh token storage to `httpOnly` secure cookies and add token revocation check.

## Next Action (One Concrete Step for the New Session)
Fix the TypeScript spread error in `frontend/src/features/authentication/__tests__/AuthContext.test.tsx` (line 14) and verify that `npm run build` passes.
