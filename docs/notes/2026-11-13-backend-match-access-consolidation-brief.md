# Task Brief: Backend Match Access & DI Authorization Consolidation

- Date: 2026-11-13
- Size: Large (`docs/process/03-large-feature.md`)
- Author: Antigravity

## Goal
Eliminate architectural layer inversion, N+1 query latency, fail-open parameter parsing, dual-source ownership drift, and tight repository coupling in the match authorization subsystem.

## In Scope / Out of Scope
- **In Scope**:
  - Extract authorization logic from `backend/app/api/deps.py` into a clean, dedicated service method in `MatchAccessService` or `AuthorizationService`.
  - Replace the 3 separate database queries in `require_match_access` with a single, consolidated indexed query.
  - Fail closed (HTTP 400 Bad Request or 403 Forbidden) on missing, malformed, or unparseable match path parameters.
  - Decouple `MatchService` constructor from `MatchAccessRepository`. Provide clean dependency injection for repositories in `api/deps.py`.
  - Fix the dual source of truth for match ownership between `matches.created_by` and `match_access.role = OWNER`.
  - Update unit and E2E tests in `backend/tests/` to verify access enforcement, single-query performance, fail-closed boundaries, and ownership integrity.
- **Out of Scope**:
  - Changing authentication exception status codes from 400 to 401/403/409 across `AuthService` (reserved for Slice D).
  - Refresh token revocation tables and httpOnly cookie storage (reserved for Slice E).
  - Decomposing long domain functions in `scorecard.py` or `delivery.py` (reserved for Slice F).

## Must Do (Requirements)
1. **Layer Boundary**: `api/deps.py` must only wire dependencies and invoke the service layer; it must not execute raw SQL queries, access private repository attributes, or evaluate domain access fallback rules.
2. **Single-Query Check**: Every ball mutation check must execute at most ONE database query to determine:
   - Does the match exist?
   - Is the match a legacy/unassigned match (accessible without auth)?
   - Does the requesting user have the required role (`OWNER`, `SCORER`, `VIEWER`, or `superuser`)?
3. **Fail Closed**: If an endpoint path does not contain a valid integer match ID, the guard must reject the request immediately with an appropriate HTTP error (400 or 403) instead of silently granting access.
4. **Clean Decoupling**: Repositories must be injected via standard dependency injection; `deps.py` must never access private attributes like `match_service.match_repo`.
5. **Ownership Integrity**: Match creation, ownership lookup, and access delegation must maintain consistent ownership semantics.

## Rules to Respect (Constraints)
- **Public Viewing Invariant**: Unauthenticated spectator match viewing and scorecard retrieval must remain 100% public and unauthenticated.
- **Backward Compatibility**: Legacy fixture seeds and unassigned matches (`created_by IS NULL` and no access entries) must continue to function for development and tests.
- **Zero Regressions**: All 165 backend tests and all 233 frontend tests must continue to pass before and after the change.

## How We Know It Works
- [ ] Given a valid match mutation request (e.g. recording a delivery), when `require_match_access` runs, it executes exactly 1 database query instead of 3.
- [ ] Given a route with a non-integer or missing match ID parameter, the request is rejected with HTTP 400/403 (fails closed).
- [ ] Given an unauthenticated user attempting to score on an assigned match, the request is rejected with HTTP 401.
- [ ] Given an authenticated user with only VIEWER role attempting to record a delivery, the request is rejected with HTTP 403.
- [ ] Given an authenticated user with SCORER or OWNER role (or superuser), the delivery is recorded successfully.
- [ ] Given a legacy fixture with no creator and no access entries, scoring continues to succeed without authentication.
- [ ] `pytest -c backend/pytest.ini backend` passes all tests.

## Open Questions (Requires User / Lead Answers)
| # | Question | Options | Recommended |
|---|---|---|---|
| 1 | **Ownership Authority**: Where should the definitive source of truth for match ownership reside? | **A**: `match_access` table with `role = OWNER` is canonical; `matches.created_by` is kept in sync as audit metadata.<br>**B**: `matches.created_by` is canonical; `match_access` only holds delegated roles (`SCORER`, `VIEWER`). | **Option A** (`match_access` role is canonical and enables multiple owners / clean RBAC). |
| 2 | **User Deletion Cascade**: If a user who owns matches is deleted, how should match ownership be preserved? | **A**: Prevent deleting users who own active matches (RESTRICT).<br>**B**: Reassign orphan matches to a designated system superuser.<br>**C**: Keep match, but if access records are gone, mark as archived rather than reverting to open public match. | **Option C** (Do not revert private matches to legacy public fixtures when owners are removed). |
| 3 | **Route Parameter Standardization**: Should route parameters be standardized to `/matches/{match_id}/...` for match access and toss endpoints in this slice? | **A**: Yes, standardize backend routers to `{match_id}` and update route references.<br>**B**: Keep alias support in backend (`match_id` or `id`) for zero frontend breaking changes. | **Option B** (Support typed `{match_id}` with backward-compatible alias fallback so contracts don't break unexpectedly). |
