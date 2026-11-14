# Refactoring Guide

This guide describes how to safely refactor existing code in Cricbuzz Tracker to improve maintainability, reduce complexity, and eliminate technical debt without unintentionally changing system behavior.

---

## 1. Core Refactoring Principles

1. **Behavioral Invariance**: Refactoring must change the internal structure of code without altering its external observable behavior or interface contracts.
2. **Dedicated Tasks Only**: Never mix refactoring with feature development or bug fixes. A refactor must stand in its own task with its own diff.
3. **Pre-Existing Test Harness**: Never refactor unverified code. If test coverage is sparse, write characterization tests *first*, verify they pass, and only then proceed with restructuring.
4. **Step-by-Step Transformations**: Decompose large refactorings into a series of small, reversible steps. Run tests after each transformation.

---

## 2. Refactoring Long Functions (Backend)

Several core backend methods are flagged in `backend/docs/known-problems.md` for exceeding the 40-line recommended target (e.g. `_build_innings_scorecard`, `update_last_delivery`, `record_delivery`).

### The 5-Step Function Decomposition Protocol:
1. **Identify Single Responsibilities**:
   - Split a monolithic function into clear phases (e.g., `_load_for_scoring`, `_validate_state`, `_apply_calculations`, `_save_and_update`).
2. **Extract Pure Calculation Helpers**:
   - Extract logic that has no database side effects into pure functions (e.g. in `domain/` or private service helpers).
3. **Preserve Method Signatures**:
   - Keep the public signature and return type of the primary service method identical.
4. **Verify after each extraction**:
   - Run unit and E2E tests immediately:
     ```powershell
     cd backend
     ..\.venv\Scripts\pytest.exe tests/unit/test_scorecard_service.py
     ```
5. **Diff Review**:
   - Check that no queries were duplicated or moved outside of transactions.

---

## 3. Refactoring Large UI Components (Frontend)

Large components flagged in `frontend/docs/known-problems.md` (e.g. `ScheduleMatchForm`, `ScorerConsolePage`, `DeliveryKeypad`) must be decomposed by *what they show*:

### Rules for UI Decomposition:
1. **Decompose by Visual or Interaction Boundary**:
   - Separate forms from listings.
   - Separate HUD status bars from interactive keypads.
2. **Typed Props In, Callbacks Out**:
   - Child components must accept clean typed props (`XProps`) and emit user actions via callbacks (`onAction`).
   - Do not let child sub-components perform ad-hoc API queries if the parent already manages the query.
3. **Extract Shared UI Elements to `components/ui/`**:
   - If a button, badge, input, or table pattern is reused across 2 or more features, move it to `src/components/ui/`.
   - Ensure components in `components/ui/` have zero dependencies on `src/features/` (verified mechanically by `audit_gate.py`).
4. **Preserve Layout and Responsive Breakpoints**:
   - Ensure desktop (`md:`, `lg:`) and mobile (<44px thumb target) styling remains intact.

---

## 4. Move-Only File Relocations

When migrating legacy code to the feature-sliced architecture (ADR-0006):
1. **Zero Logic Modifications**: Perform file moves and import path updates only. Do not reformat code, rename functions, or modify logic in the same step.
2. **One Feature per Task**: Move one feature slice at a time (e.g. `scoring`, then `match-center`).
3. **Verification**: Run `npm run build` and `npm test` before and after file moves to ensure all imports resolve cleanly.
