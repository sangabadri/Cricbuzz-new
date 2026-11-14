# Bug Fixing Guide

This guide establishes the protocol for investigating, diagnosing, reproducing, and fixing defects in Cricbuzz Tracker.

---

## 1. The 5-Step Bug Fixing Protocol

```
+---------------+     +---------------+     +---------------+
| 1. REPRODUCE  | --> | 2. DIAGNOSE   | --> | 3. REGRESSION |
|    THE DEFECT |     |    ROOT CAUSE |     |    TEST FIRST |
+---------------+     +---------------+     +---------------+
                                                    |
                      +---------------+     +-------v-------+
                      | 5. VERIFY     | <-- | 4. MINIMAL    |
                      |    FULL SUITE |     |    CORRECTION |
                      +---------------+     +---------------+
```

### Step 1: Reproduce the Defect
- Never begin editing code based on assumptions.
- Construct the exact minimal scenario that triggers the failure (e.g. specific sequence of deliveries, illegal strike swap, or concurrent token refresh).
- Verify whether the issue occurs in the backend domain, service layer, persistence layer, or frontend rendering.

### Step 2: Diagnose the Root Cause
- Differentiate between:
  1. **Domain logic bugs**: Incorrect cricket rule interpretation in `domain/`.
  2. **Layer boundary violations**: Ad-hoc queries or rule checks placed in routers or dependency injection.
  3. **Concurrency/State bugs**: Incorrect lock ordering, race conditions, or cache invalidation misses.
  4. **Schema mismatch**: Discrepancies between backend Pydantic models and frontend TypeScript types.
- Avoid "symptom masking" (e.g. adding `try/except Exception: pass`, adding `?.` without knowing why a value is undefined, or hacking CSS class names).

### Step 3: Write a Failing Regression Test
- Before applying any fix, write an automated test that asserts the correct behavior:
  - Backend: `tests/unit/` or `tests/e2e/`.
  - Frontend: `__tests__/` next to the affected component, hook, or API client.
- **Run the test to confirm it fails** for the expected reason.

### Step 4: Apply the Smallest Reasonable Correction
- Implement the fix in the single layer responsible for the invariant.
- Preserve existing contracts and interfaces unless the bug was explicitly an erroneous contract.
- Do not introduce opportunistic cleanups, file renames, or refactoring in the bugfix change.

### Step 5: Verify Full Test Suites & Edge Cases
- Verify that the regression test now passes.
- Run the full test suites:
  - Backend: `pytest`
  - Frontend: `npm test`, `npm run lint`, `npm run build`
- Verify adjacent edge cases (e.g., if fixing wide ball extras, also check no-balls, leg-byes, and wicket-on-wide).

---

## 2. Common Defect Patterns in Cricket Tracking

| Defect Category | Root Cause Pattern | Proper Solution |
|---|---|---|
| **Crease Corruption** | Dismissed batter re-selected after wicket. | Check `CreaseState.is_dismissed` invariant; raise `CreaseViolationError`. |
| **Deadlock on Live Scoring** | Lock order inversion (e.g. locking innings before match). | Enforce strict ADR-0003 order: match first, then innings (`for_update=True`). |
| **Split-Brain Server State** | Frontend mutation modified local state instead of invalidating cache. | Remove local mirror; invoke `queryClient.invalidateQueries(...)` in hook mutation `onSuccess`. |
| **Token Refresh Loop** | Multiple parallel 401s triggering concurrent `/auth/refresh` calls. | Coalesce in-flight refresh calls into single shared Promise in `src/lib/api-client.ts`. |
