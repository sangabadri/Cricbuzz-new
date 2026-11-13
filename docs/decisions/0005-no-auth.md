# 0005: Auth & Match Access Architectural Debt Status

- Status: Accepted (Debt Inventory Established)
- Date: 2026-11-13 (Updated)

## Situation
Login (JWT tokens), a User table, match access permissions, and a large frontend layout rewrite were introduced together across commits `3d7a039` and `0ac82ba`. 

The implementation introduced significant architectural drift, boundary leaks, performance overhead, and a broken frontend TypeScript build. Rather than performing an immediate risky rewrite or roll-back, the existing implementation is preserved on `main` with all defects formally cataloged as **Known Problems** in `backend/docs/known-problems.md` and `frontend/docs/known-problems.md`.

## Decision & Guardrails for Agents
1. **Do not expand broken patterns**: Agents must NOT add new endpoints or screens that copy the broken patterns in `api/deps.py` (e.g. ad-hoc SQL in dependency injection, sniffing `request.path_params`, or raising `RuleViolationError` for auth failures).
2. **Dedicated remediation tasks only**: Any work on authentication, authorization guards, or layout must be treated as a **Large Task** (`docs/process/03-large-feature.md`) or dedicated bugfix/refactoring task.
3. **Preserve public spectator access**: All match viewing and spectator scorecard endpoints must remain completely public and unauthenticated.
4. **Fix build first**: The TypeScript spread error in `AuthContext.test.tsx` must be corrected before making further frontend changes.

## Remediation Roadmap
When tackling auth remediation, follow the tasks outlined in `backend/docs/known-problems.md`:
1. Decouple `Match` entity from `users.id` foreign key.
2. Replace ad-hoc query logic in `api/deps.py` with an isolated, single-query security service.
3. Map auth errors to proper HTTP 401/403/409 codes instead of `CricketDomainError` (400).
4. Resolve the split-brain frontend (retire legacy `src/pages/` and update tests to target `src/features/`).
