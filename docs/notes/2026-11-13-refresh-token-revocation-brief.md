# Task Brief: Refresh Token Revocation & Secure httpOnly Cookie Storage

**Date**: 2026-11-13  
**Size**: Large Feature / Remodelling  
**Target Areas**:
- Backend: `backend/app/models/refresh_token.py`, `backend/app/repositories/refresh_token.py`, `backend/app/services/auth.py`, `backend/app/routers/auth.py`, `backend/app/config.py`, `backend/tests/`
- Frontend: `frontend/src/lib/api-client.ts`, `frontend/src/features/authentication/context/AuthContext.tsx`, `frontend/src/lib/__tests__/api-client.test.ts`, `frontend/src/features/authentication/__tests__/AuthContext.test.tsx`
**Catalog Reference**: `backend/docs/known-problems.md` #1.F & `frontend/docs/known-problems.md` #1.E

---

## Goal
Eliminate XSS exposure of long-lived credentials and implement genuine session revocation by:
1. Creating a database-backed active refresh token session store (`refresh_tokens` table) tracking unique JWT IDs (`jti`), expiration, and revocation timestamps.
2. Enforcing automatic token rotation upon each refresh, with cryptographic token reuse detection that invalidates all active sessions for a user if a compromised/revoked token is replayed.
3. Providing a secure `/auth/logout` endpoint that revokes the active token session in the database and clears browser cookies.
4. Transporting refresh tokens via `httpOnly`, `SameSite=Lax`, `Path=/api/v1/auth` cookies, while retaining backward compatibility for API/test clients that provide tokens via JSON payload.
5. Removing `cricbuzz_refresh_token` from browser `localStorage` on the frontend, storing short-lived access tokens strictly in-memory, and configuring `withCredentials: true` for auth exchanges.

---

## In Scope / Out of Scope

### In Scope
1. **Backend Database Model & Schema**:
   - Create `backend/app/models/refresh_token.py` declaring `RefreshToken` model (`id`, `user_id`, `jti`, `expires_at`, `revoked_at`, `created_at`).
   - Register `RefreshToken` in `backend/app/models/__init__.py` and `backend/app/main.py`.
2. **Backend Repository Layer**:
   - Create `backend/app/repositories/refresh_token.py` (`RefreshTokenRepository`) with methods:
     - `create_token(user_id, jti, expires_at) -> RefreshToken`
     - `get_by_jti(jti) -> RefreshToken | None`
     - `revoke_token(jti) -> None`
     - `revoke_all_for_user(user_id) -> int`
3. **Backend Service Layer (`AuthService`)**:
   - Inject `RefreshTokenRepository` into `AuthService`.
   - On `login()` & `register()`: Persist new refresh token `jti` and its expiration.
   - On `refresh_tokens(token_str)`:
     - Decode token and extract `jti` and `sub`.
     - Query repository for `jti`.
     - If record not found: raise `TokenExpiredOrInvalidError`.
     - If record is already revoked (`revoked_at is not None`): Detect reuse attack! Immediately call `revoke_all_for_user(user_id)` and raise `TokenExpiredOrInvalidError("Refresh token was revoked - potential token reuse")`.
     - If record is expired: raise `TokenExpiredOrInvalidError("Refresh token expired")`.
     - Atomically mark old token revoked, generate new pair, persist new `jti`, and return `(user, new_access, new_refresh)`.
   - Add `logout(refresh_token_str)`: Revoke the token session in the repository.
4. **Backend Router & Cookie Handling (`backend/app/routers/auth.py`)**:
   - Utility helper to set and clear `httpOnly`, `SameSite=Lax`, `Path=/api/v1/auth` cookies on responses.
   - `/auth/login`, `/auth/register`: Set refresh token cookie on `Response`.
   - `/auth/refresh`: Extract refresh token from request cookie or fallback to `RefreshTokenRequest` body. Issue new cookie on rotation.
   - `/auth/logout`: Extract token from cookie or body, revoke via `auth_service.logout()`, and clear cookie (`status_code=204 No Content` or `200 OK`).
5. **Frontend Client & Session Management**:
   - Update `frontend/src/lib/api-client.ts`:
     - Configure `withCredentials: true` on Axios instances or auth requests.
     - Deprecate/remove `localStorage.getItem/setItem('cricbuzz_refresh_token')`.
     - In `requestTokenRefresh()`, call `/auth/refresh` without needing a `localStorage` token; cookies are transmitted automatically by the browser.
     - Add `cricketApi.logout()` method.
   - Update `frontend/src/features/authentication/context/AuthContext.tsx`:
     - Hydrate session on page load by invoking `/auth/refresh` directly (or `/auth/me`).
     - Remove `localStorage.removeItem('cricbuzz_refresh_token')`.
     - `logout()` invokes `cricketApi.logout()` and clears in-memory access token.
6. **Testing & Verification**:
   - Unit tests for `RefreshTokenRepository` and `AuthService` rotation / reuse detection.
   - E2E tests for cookie issuance, token rotation, reuse revocation, and logout.
   - Frontend unit tests for `api-client` and `AuthContext`.
   - Autonomous reviewer convergence loop.

### Out of Scope
- Migrating access tokens to cookies (access tokens remain short-lived in-memory JWTs passed via `Authorization: Bearer <token>` to protect against CSRF on state-changing scoring requests).
- Adding Redis (SQL database table is sufficient, robust, and zero new infrastructure dependencies).
- Any alteration to spectator viewing (must remain 100% public and unauthenticated).

---

## Must Do (Requirements)
1. Spectator viewing and scorecards MUST remain completely unauthenticated.
2. Refresh tokens MUST NOT be stored in `localStorage` in production frontend code.
3. Every issued refresh token `jti` MUST be recorded in the `refresh_tokens` table.
4. Using an already-revoked refresh token MUST trigger automatic reuse detection, immediately revoking all active sessions for that user.
5. All backend tests (181+) and frontend tests (233) must pass.
6. Follow the autonomous reviewer convergence loop until unconditional **Accept**.

---

## How We Know It Works
- [ ] Backend test verifies database persistence of `jti` on login.
- [ ] Backend test verifies token rotation marks the old `jti` revoked.
- [ ] Backend test verifies token reuse triggers revocation of all active sessions for that user.
- [ ] Backend test verifies `/auth/logout` revokes token and clears the cookie.
- [ ] Frontend tests pass without accessing `localStorage` for refresh tokens.
- [ ] `audit_gate.py --full` passes with zero violations.
- [ ] Independent reviewer subagent awards **Accept**.
