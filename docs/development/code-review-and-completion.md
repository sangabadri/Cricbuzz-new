# Code Review & Task Completion

This document defines the verification and acceptance protocol required before declaring any task complete in Cricbuzz Tracker.

---

## 1. Diff Inspection & Self-Review

Before presenting work as finished, perform a rigorous diff review using the 6 review dimensions from `toolkit-c`:

| Review Dimension | What to Check in the Diff |
|---|---|
| **1. Correctness** | Does the code meet all requirements from the brief? Are edge cases (empty lists, 0 runs, boundaries) handled? |
| **2. Consistency** | Does the code follow repository naming conventions, error patterns, and existing styles? |
| **3. Responsibility** | Are layer boundaries strictly preserved? (No SQL in services; no framework in domain; no rules in frontend). |
| **4. Complexity** | Is the change as simple as possible? Are functions under 40 lines? Did we avoid premature abstractions? |
| **5. Extensibility** | Can future formats (e.g. Test match) or roles be added without rewrites? Are interfaces stable? |
| **6. Testability** | Is every requirement line verified by a test? Did we avoid excessive mocking and happy-path-only tests? |

---

## 2. Unintended Modification Audit

Scrutinize `git diff` line by line to eliminate:
- Accidental whitespace or newline changes in untouched files.
- Commented-out dead code or exploratory code snippets.
- `console.log()` or Python `print()` statements used during debugging.
- Unnecessary package installations or modifications to `package.json` / `requirements.txt`.
- Stealth reformatting across unrelated functions.

---

## 3. Adversarial & Multi-Agent Review Loop

For Medium tasks involving risk (auth, scoring, concurrency) or Large tasks:
1. **Independent Reviewer**: An independent reviewer agent (or human reviewer) inspects the diff against the task brief.
2. **Review Classification**:
   - **BLOCKING**: Invariant violation, security leak, data loss hazard, test failure, or requirement gap. Must be fixed immediately.
   - **NON-BLOCKING**: Style preference, future optimization suggestion, or minor naming remark. Log to `known-problems.md` or defer.
3. **Maximum 2 Review Rounds**: To prevent review deadlocks, a maximum of 2 review iterations are permitted. If issues remain unresolved after Round 2, escalate to the human with clear trade-offs.

---

## 4. Final Verification Protocol

Before declaring completion, execute the automated quality gate:
```powershell
python .agents/skills/agentic-engineering/scripts/audit_gate.py --full
```

Verify that all checks output `[PASS]`:
1. **Backend Domain Isolation** (ADR-0001): 0 framework imports in `app/domain/`.
2. **Frontend UI Isolation** (ADR-0006): 0 feature imports in `components/ui/`.
3. **Backend Test Suite**: All tests pass.
4. **Frontend Linter**: Oxlint / ESLint zero errors.
5. **Frontend Typecheck & Build**: `tsc -b` and `vite build` zero errors.

---

## 5. Task Completion Report Template

Every completed task must be summarized using this structured template:

```markdown
### Summary of Changes
- [Component]: Summary of change and purpose.
- [Component]: Summary of change and purpose.

### Requirements & Acceptance Criteria Verified
- [x] FR-X.Y: Acceptance criterion description (verified by test `test_name`).
- [x] FR-X.Z: Acceptance criterion description (verified by test `test_name`).

### Test & Build Execution Results
- Backend: X tests passed (0 failures).
- Frontend: Y tests passed, lint clean, build clean.
- Automated Quality Gate: 100% GREEN.

### What Was Intentionally NOT Done
- List any out-of-scope items, deferred refactorings, or noted technical debt.
- Any open questions or decisions requiring human input.
```
