# Task Brief: Semantic HTTP Status Codes for Authentication & Error Mapping

**Date**: 2026-11-13  
**Size**: Medium Feature  
**Target Areas**: `backend/app/domain/exceptions.py`, `backend/app/services/auth.py`, `backend/app/main.py`, `backend/tests/`  
**Catalog Reference**: `backend/docs/known-problems.md` #1.E & #1.I

---

## Goal
Replace the generic `RuleViolationError` (HTTP 400) raised by `AuthService` with semantic, domain-specific authentication exceptions (`InvalidCredentialsError`, `InactiveUserError`, `EntityConflictError`, `TokenExpiredOrInvalidError`), map them to RFC-compliant HTTP status codes (401 with `WWW-Authenticate: Bearer`, 403, and 409 Conflict), and update the unit and E2E test suites to assert standard HTTP status codes instead of the defective 400 assertions.

---

## In Scope / Out of Scope

### In Scope
1. **Domain Exceptions**:
   - Introduce `EntityConflictError` in `backend/app/domain/exceptions.py` for unique constraint conflicts (e.g. duplicate username or email).
   - Introduce `InvalidCredentialsError` (subclass of `AuthenticationRequiredError`) for bad username or password.
   - Introduce `InactiveUserError` (subclass of `AccessDeniedError`) for deactivated/suspended accounts.
   - Introduce `TokenExpiredOrInvalidError` (subclass of `AuthenticationRequiredError`) for malformed or expired refresh/access tokens.
2. **Service Layer Updates**:
   - Update `AuthService.register()` to raise `EntityConflictError` on duplicate username or email.
   - Update `AuthService.login()` to raise `InvalidCredentialsError` on bad username/password, and `InactiveUserError` on inactive user.
   - Update `AuthService.refresh_tokens()` to raise `TokenExpiredOrInvalidError` on invalid/expired tokens or inactive user.
3. **API & Global Exception Handler**:
   - Update `DOMAIN_EXCEPTION_STATUS_MAP` and `domain_exception_handler` in `backend/app/main.py` to map:
     - `AuthenticationRequiredError` (and its subclasses `InvalidCredentialsError`, `TokenExpiredOrInvalidError`) -> `401 Unauthorized` with `WWW-Authenticate: Bearer` header.
     - `AccessDeniedError` (and its subclass `InactiveUserError`) -> `403 Forbidden`.
     - `EntityConflictError` -> `409 Conflict`.
     - `EntityNotFoundError` -> `404 Not Found`.
     - `RuleViolationError` / other domain errors -> `400 Bad Request`.
4. **Test Suite Alignment**:
   - Update `backend/tests/unit/test_auth_service.py` to assert the specific domain exceptions (`InvalidCredentialsError`, `EntityConflictError`, `TokenExpiredOrInvalidError`).
   - Update `backend/tests/e2e/test_auth_and_access_e2e.py` to assert:
     - Wrong password login returns `401 Unauthorized`.
     - Duplicate username/email registration returns `409 Conflict`.
     - Invalid/expired refresh token returns `401 Unauthorized`.
5. **Documentation**:
   - Mark #1.E and #1.I as `[RESOLVED]` in `backend/docs/known-problems.md`.

### Out of Scope
- Implementing database persistence of refresh tokens (Blacklist/Redis) - tracked separately in #1.F.
- Changing frontend Axios client or authentication hooks (already hardened in Slice A to handle 401s cleanly).

---

## Must Do (Requirements)
1. An authentication failure (incorrect password or unknown username) MUST respond with `401 Unauthorized` and `WWW-Authenticate: Bearer` header.
2. A registration conflict (duplicate username or email) MUST respond with `409 Conflict`.
3. An inactive account login attempt MUST respond with `403 Forbidden`.
4. An expired or invalid refresh token MUST respond with `401 Unauthorized`.
5. Services MUST remain 100% decoupled from FastAPI/starlette; exceptions raised in services must be pure Python domain exceptions.
6. All backend pytest tests (178+) and frontend vitest tests (233) must pass.

---

## How We Know It Works
- [ ] `POST /api/v1/auth/login` with bad password returns HTTP 401 with `WWW-Authenticate: Bearer` header.
- [ ] `POST /api/v1/auth/register` with duplicate username/email returns HTTP 409.
- [ ] `POST /api/v1/auth/refresh` with invalid token returns HTTP 401.
- [ ] `pytest backend` passes 100%.
- [ ] `vitest run` passes 100%.
- [ ] Independent reviewer subagent audits and approves with **Accept**.
