# Task Brief: Test Suite Pruning & Redundancy Elimination

**Date**: 2026-11-14  
**Size**: Medium Refactoring  
**Target Areas**:
- Frontend: `frontend/src/test/__tests__/`, `frontend/src/components/common/__tests__/`, `frontend/src/features/matches/components/__tests__/`, `frontend/src/utils/__tests__/`
- Backend: `backend/tests/unit/test_scorecard_calculation.py`, `backend/tests/unit/test_scorecard_service.py`, `backend/tests/unit/test_services.py`
**Catalog Reference**: `frontend/docs/known-problems.md` #3 & `backend/docs/known-problems.md` #3

---

## Goal
Prune duplicate, redundant, and obsolete milestone-era test suites across frontend and backend while strictly preserving all positive, negative, and edge-case domain behavior tests. Consolidate scattered assertions into canonical, component-adjacent and service-adjacent test files.

---

## In Scope / Out of Scope

### In Scope
1. **Frontend Test Consolidation**:
   - Prune redundant challenger and milestone test suites in `frontend/src/test/__tests__/`:
     - `errorBoundary.challenger.test.tsx` (redundant with `components/common/__tests__/ErrorBoundary.test.tsx`).
     - `matchCenterDecomposition.challenger.test.tsx` & `matchCenter.challenger.test.tsx` (redundant with `features/matches/components/__tests__/MatchCenterDecomposed.test.tsx`).
     - `milestone4Health.test.tsx`, `milestone4Health.challenger.test.tsx`, and `milestone4Challenger.test.tsx` (triplicate tests for conductToss toast, getLiveTicker 500 retry, getApiErrorMessage).
     - `boundaries.challenger.test.tsx` (redundant with `utils/__tests__/teamColors.test.ts`, `BattingTable.test.tsx`, and `BowlingTable.test.tsx`).
   - Rename remaining stage-named files to clear user-facing behavior suites:
     - `stage1DomainCorrectness.test.tsx` -> `ScorerCreaseAndModals.test.tsx`
     - `stage2Architecture.test.tsx` -> `ScorerFormEncapsulation.test.tsx`
     - `stage3VisualUxDecomposition.test.tsx` -> `FixtureCardsAndSetupForms.test.tsx`
   - Preserve unique positive and negative tests (such as single toast on failure, error boundaries, retry recovery, boundary team names) in canonical test files.

2. **Backend Test Consolidation**:
   - Merge `test_scorecard_calculation.py` (2 tests for `to_overs_record`) into `test_scorecard_service.py` and delete `test_scorecard_calculation.py`.
   - Remove redundant mock tests in `test_services.py` that duplicate real SQLite execution in `test_match_lifecycle_e2e.py` and dedicated service test files.

3. **Verification & Quality Gate**:
   - All tests in frontend (`vitest run`) and backend (`pytest`) must pass cleanly.
   - Run full quality gate (`audit_gate.py --full`).
   - Run autonomous reviewer convergence loop.

### Out of Scope
- Modifying production application logic or cricket rules.
- Removing any unique negative or positive test assertions.

---

## Must Do (Requirements)
1. Every domain rule and user-facing behavior must remain covered by positive and negative tests.
2. All remaining test files must have descriptive names aligned with the behavior they verify.
3. Both backend and frontend test suites must pass 100% with zero regressions.
4. Independent reviewer subagent must audit and grant unconditional **Accept**.

---

## How We Know It Works
- [ ] `vitest run` executes cleanly with zero failures and significantly faster run time.
- [ ] `pytest backend/tests` executes cleanly with zero failures.
- [ ] `audit_gate.py --full` reports 100% GREEN.
- [ ] Independent reviewer subagent awards **Accept**.
