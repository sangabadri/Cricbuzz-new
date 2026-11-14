# General Development Workflow

This document defines the disciplined engineering lifecycle for AI coding agents and human engineers making changes to Cricbuzz Tracker.

---

## 1. The 7-Stage Engineering Lifecycle

Every engineering modification follows seven disciplined stages:

```
+-------------+     +-------------+     +-------------+     +-------------+
|  1. EXPLORE | --> |  2. PLAN    | --> |  3. BASELINE| --> |  4. SLICE   |
|  & INSPECT  |     |  & BRIEF    |     |  CHECK      |     |  & BUILD    |
+-------------+     +-------------+     +-------------+     +-------------+
                                                                   |
+-------------+     +-------------+     +-------------+            |
|  7. REPORT  | <-- |  6. AUDIT   | <-- |  5. VERIFY  | <----------+
|  & COMPLETE |     |  & GATE     |     |  TESTS      |
+-------------+     +-------------+     +-------------+
```

### Stage 1: Explore & Inspect
1. **Understand the exact request**: Identify which requirements and acceptance criteria are impacted.
2. **Inspect the real implementation**: Do not assume docs reflect current reality. Read the code and automated test files.
3. **Trace dependencies**: Locate affected layers (router, service, repo, domain, models, schemas, frontend components, hooks, api-client).

### Stage 2: Task Sizing & Plan Approval
Determine task size using the workspace skill `.agents/skills/agentic-engineering/`:
- **Small (1–3 files)**: Isolated bugfix, label, or small helper. Self-reviewed.
- **Medium (4–12 files)**: New endpoint or screen on existing architecture. Requires Task Brief and Design Plan in `docs/notes/<date>-<feature>-plan.md`.
- **Large (12+ files, DB table/column, auth, architectural shift)**: Requires Task Brief, Design Plan, Work Split, and an independent review loop.

### Stage 3: Pre-Flight Baseline Check
Before modifying any files, verify that git working tree is clean and baseline tests pass:
```bash
python .agents/skills/agentic-engineering/scripts/audit_gate.py --baseline
```

### Stage 4: Sliced Execution & 3-Tier Autonomy
Implement in small, vertical slices. Respect the 3-tier autonomy limits:

| Level | What it Covers | Action Required |
|---|---|---|
| **Go Ahead** | Internal helper names, validation rules, formatting, unit tests. | Implement directly. |
| **Propose First** | New service methods, queries, components, hooks, moving files. | Present proposal; proceed once agreed. |
| **Stop and Ask** | DB tables/columns, API shapes, auth/security, cricket rules, deleting code. | Stop. Explain context. Offer 2 options. Wait for decision. |

### Stage 5: Requirement-Driven Verification
- Write tests derived from requirements, not from implementation code.
- Exercise all 7 dimensions of testing (Functional, Non-Functional, Boundary, Negative, Failure, Integration, Regression).
- Verify both positive and rejection paths.

### Stage 6: Quality Gate Audit
Run the automated audit gate:
```bash
python .agents/skills/agentic-engineering/scripts/audit_gate.py --full
```
All domain isolation checks, UI layer isolation checks, backend tests, frontend lint, and build must be 100% green.

### Stage 7: Reporting & Documentation Synchronization
- Update relevant documentation (domain rules, known debt, or ADR if architectural decision was made).
- Inspect git diff: verify no accidental changes, no commented-out code, no debug logs.
- Deliver a structured completion report stating what was implemented, what was verified, and what was intentionally not done.

---

## 2. Cross-Component Coordination Rules

When a change spans both backend and frontend:
1. **Backend First**: Implement and test backend schemas, services, and endpoints before touching the frontend.
2. **Contract Synchronization**: Keep `frontend/src/types/cricket.ts` or `auth.ts` in exact sync with backend Pydantic schemas in the same task.
3. **Single API Entry**: Frontend calls must go strictly through `frontend/src/lib/api-client.ts`. Never introduce duplicate axios instances or ad-hoc `fetch()` calls.
4. **No Frontend Domain Rules**: Never re-implement runs, overs, strike rotation, or wickets calculations in frontend components. The backend decides; the frontend displays.
