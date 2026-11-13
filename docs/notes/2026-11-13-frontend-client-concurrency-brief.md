# Task brief: Frontend Client 401 Refresh Concurrency Guard

- Date: 2026-11-13
- Size: Medium (`docs/process/02-medium-feature.md`)

## Goal
Prevent concurrent 401 requests from causing a refresh token stampede that logs out authenticated users on multi-query pages.

## In scope / Out of scope
- **In**:
  - Introduce request queueing / single in-flight refresh promise in `frontend/src/api/client.ts`.
  - Prevent `/auth/refresh` errors from self-triggering refresh retries.
  - Unit tests in `frontend/src/api/__tests__/client.test.ts` verifying concurrent 401 handling, success propagation, and failure handling.
- **Out of scope**:
  - Moving `client.ts` to `lib/api-client.ts` (this is a separate move-only task per `folder-map.md`).
  - Switching storage from `localStorage` to `httpOnly` cookies (Large Feature task, requires backend cookie endpoints).
  - Modifying backend auth endpoints.

## Must do (requirements)
1. When multiple HTTP requests fail with status 401 concurrently, only ONE `POST /auth/refresh` request must be sent to the backend.
2. All pending and incoming 401 requests must wait for that single refresh request to resolve.
3. Once the refresh succeeds with a new `access_token`, each waiting request must update its `Authorization` header and be retried.
4. If the refresh fails, `localStorage` must be cleared, access token reset, and all waiting requests rejected.
5. A 401 response from `/auth/refresh` itself must never trigger another refresh attempt.

## Rules to respect (constraints)
- No new external libraries (no `axios-auth-refresh` or other npm packages). Implement cleanly using standard JavaScript Promises and Axios interceptors.
- Keep `src/api/client.ts` size reasonable (currently ~329 lines; keep the queue helper concise, < 30 lines).
- All existing tests in `src/api/__tests__/client.test.ts` and the wider frontend suite must remain green.

## How we know it works
- [ ] Given an expired access token and a valid refresh token, when 3 concurrent API requests return 401, then `axios.post('/auth/refresh')` is called exactly once.
- [ ] Given 3 concurrent requests waiting on refresh, when the refresh succeeds, all 3 original requests are retried with the new `Bearer <new_token>` and resolve with their responses.
- [ ] Given 3 concurrent requests waiting on refresh, when the refresh fails, all 3 requests reject with errors and refresh token is removed from `localStorage`.
- [ ] Given a request to `/auth/refresh` returns 401, no second refresh request is attempted.

## Open questions
None. The behavior is standard Axios interceptor queueing with token rotation.
