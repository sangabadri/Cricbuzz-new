# Design Plan: Semantic HTTP Status Codes for Authentication & Error Mapping

**Date**: 2026-11-13  
**Target Slices**: Slice D (Medium Feature)  
**Catalog Reference**: `backend/docs/known-problems.md` #1.E & #1.I  
**Brief Reference**: `docs/notes/2026-11-13-auth-semantic-status-codes-brief.md`

---

## 1. What I Understood
`AuthService` currently raises `RuleViolationError` for all authentication failures (wrong password, unknown username, duplicate registration, expired token). Because `RuleViolationError` is mapped to HTTP 400 Bad Request in `main.py`, the API returns 400 instead of standard RFC status codes (401 for unauthorized, 403 for inactive user, 409 for duplicate conflict). Tests in `test_auth_service.py` and `test_auth_and_access_e2e.py` encode this bug by asserting 400.

We will create semantic domain exceptions in `app/domain/exceptions.py`, map them to proper HTTP status codes in `main.py`, update `AuthService` to raise them, and update unit and E2E test assertions to verify 401 and 409 status codes.

---

## 2. What Could Be Affected
- [ ] Database tables / columns
- [x] Domain rules / exceptions (`backend/app/domain/exceptions.py`)
- [ ] Schemas
- [ ] Repositories
- [x] Services (`backend/app/services/auth.py`)
- [x] Routers / Global exception handler (`backend/app/main.py`)
- [ ] Frontend types
- [ ] Frontend API client / hooks
- [ ] Pages / components
- [x] Tests (`backend/tests/unit/test_auth_service.py`, `backend/tests/e2e/test_auth_and_access_e2e.py`, `backend/tests/unit/test_api_exceptions.py`)
- [x] Docs (`backend/docs/known-problems.md`)

---

## 3. Architecture Pattern to Follow
Follow pure domain exception decoupling established in Slice B (ADR-0001):
```text
Domain Exception Layer (pure Python):
CricketDomainError
  ├── AuthenticationRequiredError (401 + WWW-Authenticate)
  │     ├── InvalidCredentialsError (401)
  │     └── TokenExpiredOrInvalidError (401)
  ├── AccessDeniedError (403)
  │     └── InactiveUserError (403)
  ├── EntityConflictError (409)
  ├── EntityNotFoundError (404)
  └── RuleViolationError (400)
```
The global exception handler in `main.py` checks `isinstance()` against these base classes, translating domain exceptions into typed HTTP responses with proper headers and status codes.

---

## 4. Options and Trade-Offs

| Option | Pros | Cons | Decision |
|---|---|---|---|
| **Option A (Inheritance-Based Semantic Domain Exceptions - Recommended)**: Subclass `AuthenticationRequiredError` and `AccessDeniedError` for auth errors; add `EntityConflictError` (409). `main.py` exception handler uses `isinstance()` matching. | Clean domain purity; zero framework leakage in `AuthService`; automatic header injection for 401; polymorphic status code resolution. | None. Follows established ADR-0001 pattern. | **Selected** |
| **Option B (Direct HTTPException in Routers)**: Catch exceptions in router endpoints and raise FastAPI `HTTPException(401/409)`. | Explicit per-route. | Duplicates error handling across multiple auth routes; clutters router endpoints; inconsistent with global domain exception handler. | Rejected |

---

## 5. Build Slices & Execution Order

### Step D.1: Domain Exceptions & Exception Handler
- In `backend/app/domain/exceptions.py`:
  - Add `EntityConflictError(CricketDomainError)`.
  - Add `InvalidCredentialsError(AuthenticationRequiredError)`.
  - Add `InactiveUserError(AccessDeniedError)`.
  - Add `TokenExpiredOrInvalidError(AuthenticationRequiredError)`.
- In `backend/app/main.py`:
  - Update `domain_exception_handler` to resolve status codes via inheritance hierarchy (`isinstance`) and dictionary fallback:
    - `AuthenticationRequiredError` -> 401 with `WWW-Authenticate: Bearer`
    - `AccessDeniedError` -> 403
    - `EntityNotFoundError` -> 404
    - `EntityConflictError` -> 409
    - fallback -> 400

### Step D.2: Update `AuthService`
- In `backend/app/services/auth.py`:
  - `register()`: raise `EntityConflictError` when username or email is already taken.
  - `login()`: raise `InvalidCredentialsError` when user is missing or password fails verification.
  - `login()`: raise `InactiveUserError` when `not user.is_active`.
  - `refresh_tokens()`: raise `TokenExpiredOrInvalidError` when token is malformed, invalid, expired, or user is inactive.

### Step D.3: Update Tests
- In `backend/tests/unit/test_auth_service.py`:
  - Assert `pytest.raises(EntityConflictError)` on duplicate username/email.
  - Assert `pytest.raises(InvalidCredentialsError)` on wrong password.
  - Assert `pytest.raises(TokenExpiredOrInvalidError)` on invalid token.
- In `backend/tests/e2e/test_auth_and_access_e2e.py`:
  - Assert `bad_login_resp.status_code == 401` and `assert "Bearer" in bad_login_resp.headers["WWW-Authenticate"]`.
  - Add test for duplicate registration returning 409.
  - Add test for invalid refresh token returning 401.
- In `backend/tests/unit/test_api_exceptions.py`:
  - Add unit test verifying `EntityConflictError` maps to HTTP 409.
  - Verify `InvalidCredentialsError` maps to HTTP 401 with `WWW-Authenticate` header.

### Step D.4: Quality Gates & Adversarial Review
- Run backend pytest (178+ tests green).
- Run frontend vitest (233 tests green).
- Run `audit_gate.py --full`.
- Dispatch independent adversarial reviewer subagent until **Accept** is awarded.
- Update `backend/docs/known-problems.md` #1.E and #1.I as `[RESOLVED]`.

---

## 6. How I Will Check It
1. `py -3.11 -m pytest -c backend/pytest.ini backend` passes 100%.
2. `cd frontend; npx vitest run` passes 100%.
3. `python .agents/skills/agentic-engineering/scripts/audit_gate.py --full` returns GREEN.
4. Independent reviewer awards unconditional **Accept**.
