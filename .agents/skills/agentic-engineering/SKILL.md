---
name: agentic-engineering
description: >-
  Disciplined multi-step engineering workflow for task sizing (Small, Medium, Large),
  bounded autonomy, pre-flight baseline checks, sliced execution, automated quality gates,
  and adversarial verification loops. Use for all feature development, refactoring, and bug fixes.
---

# Agentic Engineering Workflow Router

## Phase 1: Task Sizing & Runbook Dispatch
Before touching code, determine the task size. You can run the automated inspector:
```bash
python .agents/skills/agentic-engineering/scripts/diff_inspector.py
```
- **Small (1–3 files touched, isolated bugfix, label, focused validation)**:
  Read [references/processes/01-small-task.md](./references/processes/01-small-task.md).
  *Rule*: Single-agent self-review. Do NOT draft design plans or ADRs.
- **Medium (4–12 files, new endpoint or screen on existing architecture)**:
  Read [references/processes/02-medium-feature.md](./references/processes/02-medium-feature.md).
  *Checkpoints*: Prepare brief & plan using [resources/templates/task-brief.md](./resources/templates/task-brief.md) and get human sign-off before coding.
- **Large (cross-cutting, DB schema/table, permissions, auth, architectural shift)**:
  Read [references/processes/03-large-feature.md](./references/processes/03-large-feature.md).
  *Requirements*: Task brief, design plan, work split, ADR, and independent reviewer loop.

## Phase 2: Pre-Flight Baseline
Before modifying files, verify working tree and test baseline:
```bash
python .agents/skills/agentic-engineering/scripts/audit_gate.py --baseline
```

## Phase 3: Sliced Execution & Layering Invariants
Work in vertical slices observing the 3-tier autonomy limits:
- **Go Ahead**: Small helpers, local validation, focused unit tests.
- **Propose First**: New service methods, state hooks, queries, file moves.
- **Stop and Ask**: DB columns/tables, API schema changes, auth/permissions, cricket rules.

Check project architecture rules in `docs/decisions/`:
- Backend: `app/domain/` has zero framework/ORM dependencies ([ADR-0001](../../../docs/decisions/0001-backend-layers.md)).
- Frontend: `components/ui/` never imports `features/` or `pages/` ([ADR-0006](../../../docs/decisions/0006-frontend-structure.md)).

### Deprecation & Deletion Protocol (Tombstone Hygiene)
Whenever a database table, ORM model, router, role, or feature component is deleted or superseded:
1. Identify the deleted entity's identifier/stem (e.g. `match_access`, `MatchUserRole`).
2. Run global grep across the repository before committing:
   ```bash
   git grep -i "<deleted_identifier>"
   ```
3. Update or purge all lingering references in:
   - Architecture diagrams & overviews (`docs/architecture/system-overview.md`)
   - Schema ERDs (`backend/docs/database/schema-and-relationships.md`)
   - Product requirements & personas (`docs/product/overview.md`, `docs/product/requirements.md`)
   - Test traceability matrices (`docs/testing/requirements-to-tests.md`, `backend/docs/testing/testing-strategy.md`)
4. Verify `diff_inspector.py --check` passes the automated Entity Tombstone Guard.

## Phase 4: Quality Gate Audit
Run the automated gate before diff review:
```bash
python .agents/skills/agentic-engineering/scripts/audit_gate.py --full
```
All tests, typechecks, and architectural import checks must be GREEN.

## Phase 5: Verification & Review Loop
1. Review your diff using [references/checklists/diff-review.md](./references/checklists/diff-review.md).
2. Routing:
   - **Small / Medium (Standard)**: Self-review against checklist + report in chat.
   - **Medium (Risky: Auth/Scoring/Concurrency) or Large**:
     Invoke an independent read-only reviewer subagent (Max 2 cycles) following [references/processes/reviewing-and-accepting.md](./references/processes/reviewing-and-accepting.md).
     Remediate BLOCKING findings only. If not green after Round 2, halt and ask the human.
3. Complete sign-off using [references/checklists/finish-checklist.md](./references/checklists/finish-checklist.md).
