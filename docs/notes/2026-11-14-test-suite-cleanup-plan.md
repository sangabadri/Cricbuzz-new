# Design Plan: Test Suite Pruning & Redundancy Elimination

**Date**: 2026-11-14  
**Target Areas**: Frontend and Backend Test Suites  
**Brief Reference**: `docs/notes/2026-11-14-test-suite-cleanup-brief.md`

---

## 1. What I Understood
The user requested removing redundant, useless, and duplicated tests across the frontend and backend, while retaining all necessary positive, negative, and edge-case tests.
- On the frontend: 7 test files in `src/test/__tests__/` repeat the exact same tests that exist in component-adjacent test files (ErrorBoundary, MatchCenterDecomposed, teamColors, etc.) or replicate milestone health checks up to three times.
- On the backend: `test_scorecard_calculation.py` is an isolated 46-line duplicate of `ScorecardService` overs tests, and `test_services.py` contains redundant mock-based tests duplicating real SQLite E2E coverage.

---

## 2. What Could Be Affected
- [x] Backend tests (`backend/tests/unit/test_scorecard_calculation.py`, `backend/tests/unit/test_scorecard_service.py`, `backend/tests/unit/test_services.py`)
- [x] Frontend tests (`frontend/src/test/__tests__/`, `frontend/src/components/`, `frontend/src/features/`, `frontend/src/utils/`)
- [x] Documentation (`frontend/docs/known-problems.md`, `backend/docs/known-problems.md`)

---

## 3. Execution Slices

### Slice 1: Backend Test Suite Consolidation & `deps.py` Harmonization
1. Merge the two tests from `backend/tests/unit/test_scorecard_calculation.py` (`test_overs_record_conversion` and `test_overs_record_with_configured_balls_per_over`) into `backend/tests/unit/test_scorecard_service.py`.
2. Delete `backend/tests/unit/test_scorecard_calculation.py`.
3. In `backend/tests/unit/test_services.py`:
   - Import `sync` from `tests.conftest` to eliminate the duplicate `def sync(...)` helper.
   - Retain the core unit tests for match toss rules and target calculation.
4. In `backend/app/api/deps.py`:
   - Add dedicated repository dependency providers (`get_team_repo`, `get_player_repo`, `get_squad_repo`, `get_innings_repo`, `get_delivery_repo`).
   - Harmonize all service factory functions to receive repositories via `Depends(...)` instead of directly instantiating them from `session`.
   - Update `backend/tests/conftest.py` with repository dependency overrides for the test client.
5. Run `pytest backend/tests` to verify 100% pass rate.

### Slice 2: Frontend Test Pruning & Descriptive Renaming
1. Ensure unique edge cases from `boundaries.challenger.test.tsx` (e.g. whitespace handling, multi-word team abbreviations) are merged into `src/utils/__tests__/teamColors.test.ts`.
2. Delete the 7 redundant test files from `src/test/__tests__/`:
   - `errorBoundary.challenger.test.tsx`
   - `matchCenterDecomposition.challenger.test.tsx`
   - `matchCenter.challenger.test.tsx`
   - `milestone4Health.test.tsx`
   - `milestone4Health.challenger.test.tsx`
   - `milestone4Challenger.test.tsx`
   - `boundaries.challenger.test.tsx`
3. Rename the 3 remaining stage test files to descriptive behavior names:
   - `stage1DomainCorrectness.test.tsx` -> `ScorerCreaseAndModals.test.tsx`
   - `stage2Architecture.test.tsx` -> `ScorerFormEncapsulation.test.tsx`
   - `stage3VisualUxDecomposition.test.tsx` -> `FixtureCardsAndSetupForms.test.tsx`
4. Run `vitest run` to verify all test suites pass with zero regressions.

### Slice 3: Quality Gates, Documentation & Adversarial Review
1. Run `python .agents/skills/agentic-engineering/scripts/audit_gate.py --full`.
2. Update `frontend/docs/known-problems.md` noting resolution of milestone-named test files debt.
3. Commit changes.
4. Launch independent adversarial reviewer subagent to audit the test consolidation.
5. Loop until unconditional **Accept**.
