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

### D. [RESOLVED - 2026-11-14] Dual Source of Truth & Match Access Roles Removed (ADR-0008)
- Resolved per ADR 0008: Superseded ADR-0007. Retired `match_access` table, match access roles (`MatchUserRole`), and delegation endpoints. Canonical match ownership is represented directly via `matches.owner_id` (foreign key to `users.id`, nullable for unassigned demo/test fixture backward compatibility). A match belongs strictly to one person, with authorization enforced via `require_match_owner`.

### E. [RESOLVED - 2026-11-13] Semantic Misappropriation of `CricketDomainError` for Auth (Consistency / HTTP Contract)
- Resolved in Slice D: Introduced `InvalidCredentialsError`, `InactiveUserError`, `EntityConflictError`, and `TokenExpiredOrInvalidError` in `domain/exceptions.py`. Updated `main.py`'s global handler to map 401 with `WWW-Authenticate: Bearer` header, 403, and 409 Conflict.

### F. [RESOLVED - 2026-11-13] Stateless Refresh Tokens Without Revocation/Blacklist (Security)
- Resolved in Slice F: Implemented active session tracking via `RefreshToken` database model and `RefreshTokenRepository`. Enforced cryptographic token rotation on every `/auth/refresh` request, with automatic reuse attack detection that invalidates all active sessions for a user if a revoked token is replayed. Added `/auth/logout` endpoint that revokes the active database session and clears the browser cookie.

### G. [RESOLVED - 2026-11-13] Inconsistent Route Path Parameters (Consistency)
- Resolved: Standardized route parameter names to `match_id: int` across all match endpoints (and retired legacy `/access` sub-resource per ADR-0008).

### H. [RESOLVED - 2026-11-13] Tight Coupling in `MatchService` (Extensibility / Coupling)
- Resolved: Decoupled `MatchRepository` injection in `deps.py` via `get_match_repo()`; eliminated private attribute extraction `match_service.match_repo`. Harmonized all service providers in `app/api/deps.py` (`get_team_service`, `get_player_service`, `get_match_service`, `get_squad_service`, `get_innings_service`, `get_delivery_service`, `get_scorecard_service`) to accept dedicated repository providers (`get_*_repo`) via pure FastAPI `Depends(...)` dependency injection.

### I. [RESOLVED - 2026-11-13] Correlated Error in Auth Test Suite (Testability)
- Resolved in Slice D: Updated `test_auth_service.py` to assert typed domain exceptions and `test_auth_and_access_e2e.py` to assert standard HTTP status codes (401 with `WWW-Authenticate: Bearer` and 409 Conflict).

---

## 2. Functions that are too long (lines)
Measured on 2026-11-12 at commit `225e432`.

| Function | File | Lines |
|---|---|---|
| `_build_innings_scorecard` | `services/scorecard.py` | [RESOLVED - 2026-11-14] Decomposed 272-line function into 5 focused static projection helpers |
| `get_live_match_state` | `services/scorecard.py` | [RESOLVED - 2026-11-14] Decomposed 185-line method into focused static helpers (_build_current_over_balls, _project_live_batter, _project_live_bowler, _calculate_chase_status) |
| `update_last_delivery` | `services/delivery.py` | [RESOLVED - 2026-11-14] Decomposed into focused helpers (_resolve_patch_fields, _build_simulated_deliveries, _sync_match_completion_status) |
| `create_innings` | `services/innings.py` | [RESOLVED - 2026-11-14] Decomposed into focused lifecycle helpers (_validate_innings_prerequisites, _resolve_target_innings_number, _create_or_get_innings_1, _create_or_get_innings_2, _create_or_get_multi_innings) |
| `record_ball` | `domain/innings_aggregate.py` | [RESOLVED - 2026-11-14] Decomposed into focused pure domain helpers (_apply_crease_and_strike_events, _advance_ball_and_over_counters) |
| `reconstruct` | `domain/innings_aggregate.py` | [RESOLVED - 2026-11-14] Decomposed into replay helpers (_replay_single_delivery, _rehydrate_crease_state) |
| `record_delivery` | `services/delivery.py` | [RESOLVED - 2026-11-14] Decomposed into focused helpers (_resolve_delivery_participants, _sync_match_completion_status) |
| `validate_delivery_state` | `domain/innings_aggregate.py` | 113 |
| `seed_demo_match` | `routers/seed.py` | [RESOLVED - 2026-11-14] Procedural demo seeding extracted to `app/services/demo_seed.py` (`DemoSeedService`); router delegates cleanly |
| `_build_scorer_state` | `services/delivery.py` | 91 |

### How to fix one (as its own task)
1. State the goal: same behaviour, shorter functions.
2. Make sure strong tests already cover it. If not, add tests first and commit.
3. Extract one helper at a time. Run tests after each. Commit each.
4. No behaviour change, no renames of public methods, no new features in the same commit.
5. Review the diff for accidental changes.

---

## 3. General Architecture & Codebase Debt
- [RESOLVED - 2026-11-14] `seed.py` router holds heavy procedural creation logic: Isolated in `app/services/demo_seed.py` (`DemoSeedService`) with single-service router delegation.
- [RESOLVED - 2026-11-14] `SquadService._enrich_player_details` sets attributes on model objects with `setattr`: Replaced with typed `SquadResponse` and `SquadPlayerItem` construction.
- [RESOLVED - 2026-11-14] Comments in `SquadService.create_squad` number two steps "6": Renumbered cleanly to steps 6, 7, 8.
- `JWT_SECRET_KEY` in `config.py` defaults to a hardcoded string. Must require an environment variable in production.
- [RESOLVED - 2026-11-14] `CORS_ORIGINS` in `config.py` uses hardcoded localhost origins: Resolved by adding dynamic Pydantic validator supporting JSON array strings, comma-separated environment variables, and fallback dev origins.
- [RESOLVED - 2026-11-14] `sync` test helper exists in multiple test modules: Centralized exclusively in `tests/conftest.py` with all test modules importing it cleanly.
- `main.py` imports all models by name just so tables get created on startup (`Base.metadata.create_all`). Alembic migrations should replace automatic `create_all`.
