# Known problems (not part of any task unless asked)

Measured and cataloged against `toolkit-c` review dimensions (Correctness, Consistency, Responsibility, Complexity, Extensibility, Testability).
Do not fix these while doing other work. Do not make them worse. Fix them only in a task made for it.

## 1. Authentication & Match Access Architecture Issues (High Priority)

The auth and match access implementation introduced architectural boundary violations, concurrency hazards, and semantic mismatches across layers:

### A. [RESOLVED - 2026-11-13] Layer Inversion & Business Logic in `app/api/deps.py` (Responsibility Violation)
- Resolved: Authorization decision extracted into `MatchAccessService.authorize_match_access`. `api/deps.py` no longer executes SQL queries or evaluates domain fallback rules directly.

### B. [RESOLVED - 2026-11-13] N+1 Database Query Overhead on Every Scored Ball (Performance / Complexity)
- Resolved: Consolidated match existence, role lookup, and access record existence checks into a single index-seek query in `MatchAccessRepository.get_match_auth_context()`.

### C. [RESOLVED - 2026-11-13] Fail-Open Security Vulnerability in Parameter Parsing (Correctness / Security)
- Resolved: `require_match_access` now fails closed, raising `HTTPException(400)` if match path parameter is missing or non-integer.

### D. [RESOLVED - 2026-11-13] Dual Source of Truth & Cascade Privilege Drop (Extensibility / Correctness)
- Resolved per ADR 0007: Removed `created_by` column from `Match` model completely, keeping `Match` pure cricket domain data. Canonical ownership resides solely in `match_access` with `role = MatchUserRole.OWNER`.

### E. Semantic Misappropriation of `CricketDomainError` for Auth (Consistency / HTTP Contract)
- `AuthService.login`, `register`, and `refresh_tokens` raise `RuleViolationError` for invalid passwords, duplicate usernames, and expired tokens.
- Global exception handler in `main.py` maps `RuleViolationError` to `HTTP 400 Bad Request`.
- Result: Authentication failures return `400 Bad Request` instead of `401 Unauthorized`; duplicate usernames return `400` instead of `409 Conflict`. This confuses API clients and breaks standard Axios/fetch auth interceptors.
- **Remediation**: Create a distinct `AuthError` hierarchy mapped to proper HTTP status codes (401, 403, 409).

### F. Stateless Refresh Tokens Without Revocation/Blacklist (Security)
- `create_refresh_token` generates a 7-day JWT with a `jti` UUID, but `jti` is never stored.
- `AuthService.refresh_tokens` does not track revoked tokens. Once issued, a refresh token remains valid for 7 days even if the user logs out, rotates tokens, or changes passwords.
- **Remediation**: Persist active refresh token `jti`s in the database or Redis to enforce genuine token revocation upon logout and rotation.

### G. [RESOLVED - 2026-11-13] Inconsistent Route Path Parameters (Consistency)
- Resolved: Standardized route paths to `/matches/{match_id}/access` and route parameter names to `match_id: int`.

### H. [RESOLVED - 2026-11-13] Tight Coupling in `MatchService` (Extensibility / Coupling)
- Resolved: Decoupled `MatchRepository` injection in `deps.py` via `get_match_repo()`; eliminated private attribute extraction `match_service.match_repo`.

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
