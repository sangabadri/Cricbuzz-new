# Known problems (not part of any task unless asked)

Measured and cataloged against `toolkit-c` review dimensions (Correctness, Consistency, Responsibility, Complexity, Extensibility, Testability).
Do not fix these while doing other work. Do not make them worse. Fix them only in a task made for it.

## 1. Authentication & Match Access Architecture Issues (High Priority)

The auth and match access implementation introduced architectural boundary violations, concurrency hazards, and semantic mismatches across layers:

### A. Layer Inversion & Business Logic in `app/api/deps.py` (Responsibility Violation)
- `api/deps.py` is reserved strictly for wiring dependencies. `require_match_access` violates this by acting as an ad-hoc query engine and business rules layer:
  - Executes raw database queries across `MatchRepository` and `MatchAccessRepository`.
  - Reaches through private service attributes (`match_service.match_repo`).
  - Sniffs and parses unvalidated ASGI request path parameters (`request.path_params`).
  - Enforces domain fallback rules (legacy match detection) and raises `HTTPException(401/403)` directly inside DI wiring.
- **Remediation**: Move authorization logic into a dedicated `AuthorizationService` or clean FastAPI security dependencies; pass typed route parameters instead of inspecting `request.path_params`.

### B. N+1 Database Query Overhead on Every Scored Ball (Performance / Complexity)
- `require_match_access` executes up to 3 separate database queries on every single mutation endpoint before the service method is reached:
  1. `match_repo.get_by_id(match_id)`
  2. `match_access_repo.list_for_match(match_id)` (fetches all access records joined with `users` solely to check `not records`)
  3. `match_access_repo.get_user_match_role(match_id, user_id)`
- Under live scoring, this adds severe database latency to ball-by-ball updates.
- **Remediation**: Consolidate match existence, creator verification, and user role lookup into a single indexed query; eliminate loading all match access records.

### C. Fail-Open Security Vulnerability in Parameter Parsing (Correctness / Security)
- In `require_match_access`:
  ```python
  match_id_str = request.path_params.get("id") or request.path_params.get("match_id")
  if not match_id_str:
      return current_user
  ```
  If an endpoint uses a path parameter other than `"id"` or `"match_id"`, or if parsing raises a `ValueError`, the guard silently catches the error and returns `current_user`, granting unauthorized access (failing open instead of closed).
- **Remediation**: Fail closed with `HTTP 400/403` on missing or unparseable match ID parameters.

### D. Dual Source of Truth & Cascade Privilege Drop (Extensibility / Correctness)
- Match ownership is duplicated across two locations:
  1. `matches.created_by` (Foreign Key on `matches` table)
  2. `match_access` table with `role = MatchUserRole.OWNER`
- Calling `grant_match_access` with `role = OWNER` does not update `matches.created_by`.
- Foreign key mismatch: `matches.created_by` uses `ondelete="SET NULL"`, while `match_access.user_id` uses `ondelete="CASCADE"`. If an owner user is deleted, their `match_access` row is deleted, and `match.created_by` becomes `None`. Because `records` is now empty, `require_match_access` treats the match as a legacy unassigned match, silently converting a private match into an unprotected public match.
- **Remediation**: Establish a single source of truth for match ownership (preferably the access table) and fix cascade behavior.

### E. Semantic Misappropriation of `CricketDomainError` for Auth (Consistency / HTTP Contract)
- `AuthService.login`, `register`, and `refresh_tokens` raise `RuleViolationError` for invalid passwords, duplicate usernames, and expired tokens.
- Global exception handler in `main.py` maps `RuleViolationError` to `HTTP 400 Bad Request`.
- Result: Authentication failures return `400 Bad Request` instead of `401 Unauthorized`; duplicate usernames return `400` instead of `409 Conflict`. This confuses API clients and breaks standard Axios/fetch auth interceptors.
- **Remediation**: Create a distinct `AuthError` hierarchy mapped to proper HTTP status codes (401, 403, 409).

### F. Stateless Refresh Tokens Without Revocation/Blacklist (Security)
- `create_refresh_token` generates a 7-day JWT with a `jti` UUID, but `jti` is never stored.
- `AuthService.refresh_tokens` does not track revoked tokens. Once issued, a refresh token remains valid for 7 days even if the user logs out, rotates tokens, or changes passwords.
- **Remediation**: Persist active refresh token `jti`s in the database or Redis to enforce genuine token revocation upon logout and rotation.

### G. Inconsistent Route Path Parameters (Consistency)
- Mutation routers inconsistently define path parameters: `/matches/{match_id}/deliveries` vs `/matches/{id}/access`.
- **Remediation**: Standardize all routes to `/matches/{match_id}/...`.

### H. Tight Coupling in `MatchService` (Extensibility / Coupling)
- `MatchService` injects `MatchAccessRepository` in its constructor and assigns `OWNER` role inside `create_match`.
- `deps.py` extracts `match_service.match_repo` directly to construct `MatchAccessService`.
- **Remediation**: Decouple match creation from access assignment using an orchestrating service or domain event handler; inject repositories cleanly in DI.

### I. Correlated Error in Auth Test Suite (Testability)
- `tests/e2e/test_auth_and_access_e2e.py` and `tests/unit/test_auth_service.py` assert `status_code == 400` on invalid password login. The tests pass because they encode the implementation defect rather than the true HTTP requirement.
- **Remediation**: Update tests to assert `401 Unauthorized` once proper error mapping is implemented.

---

## 2. Functions that are too long (lines)
Measured on 2026-11-12 at commit `225e432`.

| Function | File | Lines |
|---|---|---|
| `_build_innings_scorecard` | `services/scorecard.py` | 270 |
| `get_live_match_state` | `services/scorecard.py` | 185 |
| `update_last_delivery` | `services/delivery.py` | 177 |
| `create_innings` | `services/innings.py` | 167 |
| `record_ball` | `domain/innings_aggregate.py` | 150 |
| `reconstruct` | `domain/innings_aggregate.py` | 144 |
| `record_delivery` | `services/delivery.py` | 140 |
| `validate_delivery_state` | `domain/innings_aggregate.py` | 113 |
| `seed_demo_match` | `routers/seed.py` | 101 |
| `_build_scorer_state` | `services/delivery.py` | 91 |

### How to fix one (as its own task)
1. State the goal: same behaviour, shorter functions.
2. Make sure strong tests already cover it. If not, add tests first and commit.
3. Extract one helper at a time. Run tests after each. Commit each.
4. No behaviour change, no renames of public methods, no new features in the same commit.
5. Review the diff for accidental changes.

---

## 3. General Architecture & Codebase Debt
- `seed.py` router holds heavy procedural creation logic. Seeding is demo code; keep it isolated from production services.
- `SquadService._enrich_player_details` sets attributes on model objects with `setattr`. Works, but a response schema built for it would be clearer and type-safe.
- Comments in `SquadService.create_squad` number two steps "6". Cosmetic.
- `JWT_SECRET_KEY` in `config.py` defaults to a hardcoded string. Must require an environment variable in production.
- `CORS_ORIGINS` in `config.py` uses hardcoded localhost origins.
- `sync` test helper exists in multiple test modules. Centralize in `conftest.py`.
- `main.py` imports all models by name just so tables get created on startup (`Base.metadata.create_all`). Alembic migrations should replace automatic `create_all`.
