# Design Plan: Refresh Token Revocation & Secure httpOnly Cookie Storage

**Date**: 2026-11-13  
**Target Slices**: Slice F (Large Feature / Remodelling)  
**Catalog Reference**: `backend/docs/known-problems.md` #1.F & `frontend/docs/known-problems.md` #1.E  
**Brief Reference**: `docs/notes/2026-11-13-refresh-token-revocation-brief.md`

---

## 1. What I Understood
Refresh tokens are currently completely stateless and unrevocable on the backend, and stored insecurely in `localStorage` on the frontend.
The user approved **Option 1**:
1. Add an active session tracking table `refresh_tokens` in the database storing token `jti`, expiration, and revocation status.
2. Enforce automatic rotation on refresh, and if an already-revoked token is replayed, trigger reuse detection by immediately revoking all active sessions for that user.
3. Add a `POST /auth/logout` route that marks the token revoked and clears the cookie.
4. Transport the refresh token via an `httpOnly`, `SameSite=Lax`, `Path=/api/v1/auth` cookie (with fallback support for body tokens for automated API/curl clients).
5. Frontend removes `cricbuzz_refresh_token` from `localStorage`, stores short-lived access tokens only in-memory, and sends cookies automatically using `withCredentials: true`.

---

## 2. What Could Be Affected
- [x] Database tables / columns (`refresh_tokens` table)
- [x] Domain rules / exceptions (`backend/app/domain/exceptions.py`)
- [x] Schemas (`backend/app/schemas/auth.py`)
- [x] Repositories (`backend/app/repositories/refresh_token.py`)
- [x] Services (`backend/app/services/auth.py`, `backend/app/services/security.py`)
- [x] Routers / Global exception handler (`backend/app/routers/auth.py`, `backend/app/api/deps.py`)
- [x] Frontend types (`frontend/src/types/auth.ts`)
- [x] Frontend API client / hooks (`frontend/src/lib/api-client.ts`)
- [x] Pages / components (`frontend/src/features/authentication/context/AuthContext.tsx`)
- [x] Tests (`backend/tests/`, `frontend/src/lib/__tests__/`, `frontend/src/features/authentication/__tests__/`)
- [x] Docs (`backend/docs/known-problems.md`, `frontend/docs/known-problems.md`)

---

## 3. Architecture Pattern to Follow

### Layer Decoupling:
```text
HTTP / FastApi Router (backend/app/routers/auth.py)
   │  - Reads refresh token from Cookie: cricbuzz_refresh_token OR body
   │  - Sets Set-Cookie: cricbuzz_refresh_token=...; HttpOnly; SameSite=Lax; Path=/api/v1/auth
   │  - On /auth/logout: calls auth_service.logout(), clears cookie via max_age=0
   ▼
Service Layer (backend/app/services/auth.py) [Pure Python / Domain Logic]
   │  - login / register: creates JWT with jti, records in refresh_repo
   │  - refresh_tokens:
   │      * decodes jti & user_id
   │      * checks refresh_repo
   │      * if already revoked: REUSE ATTACK DETECTED -> revoke_all_for_user(user_id)
   │      * if expired: raise TokenExpiredOrInvalidError
   │      * marks old jti revoked -> issues new jti -> persists new jti
   │  - logout: marks jti revoked
   ▼
Repository Layer (backend/app/repositories/refresh_token.py) [SQLAlchemy Async Queries]
   │  - create(user_id, jti, expires_at)
   │  - get_by_jti(jti)
   │  - revoke(jti)
   │  - revoke_all_for_user(user_id)
   ▼
Database Model (backend/app/models/refresh_token.py)
      Table: refresh_tokens
      Columns: id, user_id, jti, expires_at, revoked_at, created_at
```

### Cookie Transport Specifications:
- Cookie Name: `cricbuzz_refresh_token`
- `HttpOnly`: `True` (JavaScript cannot access, mitigating XSS extraction)
- `SameSite`: `"lax"` (prevents cross-site submission while allowing standard navigation)
- `Path`: `"/api/v1/auth"` (cookie is only sent on auth-related requests, reducing request header bloat on cricket scoring/commentary queries)
- `Secure`: Controlled by settings (`settings.COOKIE_SECURE`, `False` for localhost dev/test, `True` in production)
- In addition, `/auth/login`, `/auth/register`, and `/auth/refresh` will still return `refresh_token` in response body if requested or for compatibility with non-browser API clients, while browser clients ignore it in favor of the cookie.

---

## 4. Options and Trade-Offs

| Option | Pros | Cons | Decision |
|---|---|---|---|
| **Option 1 (Active Session Tracking in `refresh_tokens` Table + `httpOnly` Cookie - Approved)** | Full session visibility; immediate revocation on logout; cryptographic token reuse detection; eliminates XSS token theft via `localStorage`. | Requires a database table and repository; slightly more state than purely stateless JWTs. | **Selected & Approved** |
| **Option 2 (Blacklist Table Only)** | Smaller initial table. | Cannot enumerate active sessions for a user; cannot easily detect token reuse before revocation. | Rejected |

---

## 5. Build Slices & Execution Order

### Slice F.1: Backend Database Model & Repository
1. Create `backend/app/models/refresh_token.py`:
   - `class RefreshToken(Base)` with table `refresh_tokens`.
   - Foreign key to `users.id`, indexes on `jti` and `user_id`.
2. Register `RefreshToken` in `backend/app/models/__init__.py` and `backend/app/main.py`.
3. Create `backend/app/repositories/refresh_token.py`:
   - `create(user_id, jti, expires_at) -> RefreshToken`
   - `get_by_jti(jti) -> RefreshToken | None`
   - `revoke(jti) -> None`
   - `revoke_all_for_user(user_id) -> int`
4. Add repository factory `get_refresh_token_repo` in `backend/app/api/deps.py`.

### Slice F.2: Backend Service Token Rotation & Reuse Revocation
1. Update `backend/app/services/security.py`:
   - Ensure `create_refresh_token` returns both the token string and the `(jti, expires_at)` metadata for clean caller persistence without redundant decoding.
2. Update `backend/app/services/auth.py`:
   - Accept `RefreshTokenRepository` in `AuthService.__init__`.
   - Update `register()` and `login()` to persist the refresh token record.
   - Update `refresh_tokens(token_str)`:
     - Decode JWT, extract `jti`, `sub`.
     - Fetch `RefreshToken` record from repo.
     - If not found -> raise `TokenExpiredOrInvalidError("Invalid refresh token")`.
     - If `revoked_at is not None` -> **Reuse detection**: call `refresh_repo.revoke_all_for_user(user_id)` and raise `TokenExpiredOrInvalidError("Refresh token was revoked - reuse detected")`.
     - If `expires_at < now` -> raise `TokenExpiredOrInvalidError("Refresh token expired")`.
     - Revoke old token record: `await self.refresh_repo.revoke(jti)`.
     - Create new token pair and persist new `jti`.
     - Return `(user, new_access_token, new_refresh_token)`.
   - Add `logout(token_str)`:
     - Decode JWT, extract `jti`.
     - Call `await self.refresh_repo.revoke(jti)`.

### Slice F.3: Backend Auth Router Cookie Management & Logout Endpoint
1. Update `backend/app/routers/auth.py`:
   - Add helper `set_refresh_cookie(response: Response, refresh_token: str)` and `clear_refresh_cookie(response: Response)`.
   - Update `/auth/login`, `/auth/register`:
     - Accept `response: Response`.
     - Call `set_refresh_cookie(response, refresh_token)`.
   - Update `/auth/refresh`:
     - Extract token from `request.cookies.get("cricbuzz_refresh_token")` OR `refresh_in.refresh_token` (make `refresh_in` optional or body field optional).
     - Rotate token, set new cookie on `response`.
   - Add `POST /auth/logout`:
     - Extract token from cookie or body.
     - Call `auth_service.logout(token)`.
     - Call `clear_refresh_cookie(response)`.
     - Return `{"message": "Successfully logged out"}`.
2. Update backend tests in `tests/unit/test_auth_service.py` and `tests/e2e/test_auth_and_access_e2e.py`.

### Slice F.4: Frontend Client & Context Transition to httpOnly Cookies
1. Update `frontend/src/lib/api-client.ts`:
   - Set `api.defaults.withCredentials = true` so cookies are sent across origin/proxy.
   - Update `requestTokenRefresh()`:
     - Remove mandatory `localStorage` check.
     - Issue `POST /auth/refresh` without body (or with body if token provided).
     - On successful response, update in-memory access token.
   - Add `cricketApi.logout()`:
     - Calls `POST /auth/logout`.
     - Clears in-memory access token.
2. Update `frontend/src/features/authentication/context/AuthContext.tsx`:
   - Remove `localStorage.setItem('cricbuzz_refresh_token')` and `localStorage.getItem('cricbuzz_refresh_token')`.
   - On initial mount (`hydrate`): call `/auth/refresh` directly. If cookie is present and valid, the backend rotates and returns user session; if 401, mark unauthenticated.
   - On `logout()`: call `cricketApi.logout()`, clear access token, set `user` to `null`.
3. Update frontend tests in `src/lib/__tests__/api-client.test.ts` and `src/features/authentication/__tests__/AuthContext.test.tsx`.

### Slice F.5: Automated Quality Gate & Reviewer Convergence Loop
1. Run `python .agents/skills/agentic-engineering/scripts/audit_gate.py --full`.
2. Update `backend/docs/known-problems.md` #1.F and `frontend/docs/known-problems.md` #1.E as `[RESOLVED - 2026-11-13]`.
3. Commit Slice F changes.
4. Spawn independent adversarial reviewer subagent (`research`) to audit all code against requirements, security, and edge cases.
5. Loop until unconditional **Accept**.
