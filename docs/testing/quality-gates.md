# Quality Gates & Verification Standards

This document defines the automated quality gates, mandatory checks, and completion criteria that must be satisfied before any change is accepted into Cricbuzz Tracker.

---

## 1. Automated Quality Gate Architecture

Quality assurance in Cricbuzz Tracker is enforced mechanically through the repository's audit gate script:
`.agents/skills/agentic-engineering/scripts/audit_gate.py`.

The script runs automated checks across both workspaces:

```
+--------------------------------------------------------------------------------+
|                        AUTOMATED QUALITY GATE AUDIT                            |
|                                                                                |
|   1. Domain Layer Isolation Check (ADR-0001)                                   |
|      AST inspection ensuring app/domain/ has ZERO imports from                 |
|      fastapi, starlette, sqlalchemy, or pydantic.                              |
|                                                                                |
|   2. Frontend UI Layer Isolation Check (ADR-0006)                              |
|      AST inspection ensuring components/ui/ has ZERO imports from              |
|      features/ or pages/.                                                      |
|                                                                                |
|   3. Backend Test Suite Execution                                              |
|      Runs pytest across unit, domain, architecture, and E2E suites.            |
|                                                                                |
|   4. Frontend Lint Audit                                                       |
|      Runs oxlint / eslint across all TypeScript/React source files.            |
|                                                                                |
|   5. Frontend Typecheck & Build Pipeline                                       |
|      Runs tsc -b and vite build to verify zero compile or type errors.         |
|                                                                                |
|   6. Git Diff Scope & Safety Check                                             |
|      Verifies no secrets, banned reset commands, or forbidden file mutations.   |
+--------------------------------------------------------------------------------+
```

---

## 2. Gate Execution Commands

### Pre-Flight Baseline Check (Before Changing Code)
```bash
python .agents/skills/agentic-engineering/scripts/audit_gate.py --baseline
```
Verifies working tree clean and all existing tests pass before touching code.

### Full Quality Gate Audit (Before Declaring Complete)
```bash
python .agents/skills/agentic-engineering/scripts/audit_gate.py --full
```
Must output:
```text
=== CRICBUZZ QUALITY GATE [FULL AUDIT] ===
[PASS] Backend Domain Isolation (ADR-0001): 0 framework imports in app/domain/
[PASS] Frontend UI Layer Isolation (ADR-0006): 0 feature imports in components/ui/
[PASS] Backend Test Suite: 185 passed
[PASS] Frontend Lint (oxlint): Lint passed
[PASS] Frontend Typecheck & Build: Typecheck & Vite build passed
---------------------------------------
OVERALL STATUS: GREEN (Ready for review/commit)
```

---

## 3. Mandatory Acceptance Criteria for Changes

Before presenting work as finished, verify:

### A. Automated Checks
- [ ] Backend Domain Isolation: 0 framework imports in `app/domain/`.
- [ ] Frontend UI Isolation: 0 feature imports in `components/ui/`.
- [ ] Backend test suite: 100% passing (`pytest`).
- [ ] Frontend lint: 0 errors (`npm run lint`).
- [ ] Frontend test suite: 100% passing (`npm test`).
- [ ] Frontend production build: 0 errors (`npm run build`).

### B. Requirement & Acceptance Criteria Coverage
- [ ] Every functional requirement line in the task brief has at least one positive test.
- [ ] Every rejection condition has a negative test proving the operation is rejected.
- [ ] Edge cases (empty values, boundary counts, zero scores) are covered.
- [ ] Reverted or undone operations leave the system in the exact previous state.

### C. Change Hygiene
- [ ] No application code modified outside the task scope.
- [ ] No new libraries added without explicit authorization.
- [ ] No database schema changes without approval.
- [ ] No temporary files, debug logs, or commented-out code in diff.

---

## 4. Handling Failed, Skipped, or Unavailable Checks

- **Never Weaken or Delete Tests**: If an existing test fails, investigate whether the test is asserting an established requirement or if your change introduced a regression. Never delete or weaken a test simply to make the suite pass.
- **Reporting Inconsistencies**: If a test appears genuinely obsolete or contradicts an approved ADR, stop and report the contradiction to the human with two options.
- **Unavailable Tools**: If an environment limitation prevents running a specific tool (e.g. Docker unavailable), document the command that could not be executed and report it in the final report.
