# Design plan: Frontend Client 401 Refresh Concurrency Guard

- Date: 2026-11-13
- Task: Frontend Client 401 Refresh Concurrency Guard
- Process: Medium (`docs/process/02-medium-feature.md`)

## 1. What I understood
On multi-query pages, an expired access token causes multiple simultaneous API calls to return 401. Each call independently hits the interceptor and triggers `POST /auth/refresh`. Because refresh tokens rotate, only the first succeeds while subsequent ones fail and clear the user's session from `localStorage`. We will coalesce concurrent refresh operations into a single in-flight promise and retry all stalled requests with the fresh token.

## 2. What could be affected
- [ ] Database tables / columns
- [ ] Domain rules (`backend/app/domain`)
- [ ] Schemas
- [ ] Repositories
- [ ] Services
- [ ] Routers / API shape
- [ ] Frontend types
- [x] Frontend API client / hooks (`frontend/src/api/client.ts`)
- [ ] Pages / components
- [x] Tests (`frontend/src/api/__tests__/client.test.ts`)
- [ ] Config / Docker / k8s
- [ ] Docs

## 3. Similar feature I studied
We studied the existing interceptor pattern in `frontend/src/api/client.ts` (lines 53-80) and standard promise sharing for async queues in JavaScript/TypeScript.

## 4. Proposed design
In `frontend/src/api/client.ts`:
Maintain module-scoped refresh state:
```typescript
let refreshPromise: Promise<string | null> | null = null;
```

In the response error interceptor:
```typescript
const originalRequest = error.config;
if (
  error.response?.status === 401 &&
  originalRequest &&
  !originalRequest._retry &&
  !originalRequest.url?.includes('/auth/refresh')
) {
  originalRequest._retry = true;
  const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('cricbuzz_refresh_token') : null;
  if (!refreshToken) {
    return Promise.reject(error);
  }

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await axios.post<TokenResponse>(
          `${api.defaults.baseURL}/auth/refresh`,
          { refresh_token: refreshToken }
        );
        currentAccessToken = res.data.access_token;
        localStorage.setItem('cricbuzz_refresh_token', res.data.refresh_token);
        return currentAccessToken;
      } catch (refreshErr) {
        currentAccessToken = null;
        localStorage.removeItem('cricbuzz_refresh_token');
        throw refreshErr;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise.then((newAccessToken) => {
    if (originalRequest.headers && newAccessToken) {
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
    }
    return api(originalRequest);
  });
}
```

## 5. Options and trade-offs
| Option | Good | Bad |
|---|---|---|
| A (Single in-flight `refreshPromise` via native Promise chaining) | Zero dependencies; completely transparent to callers; clean cleanup in `finally`; standard idiom. | None for this scale. |
| B (External library `axios-auth-refresh`) | Off-the-shelf code. | Violates constraint "No new libraries without approval" (frontend/AGENTS.md). Adds dependency bloat. |

## 6. Is it too much or too little?
Just right: exactly ~25 lines of idiomatic TypeScript replacing the current non-concurrent retry block.

## 7. Decisions that need a human ("Stop and ask")
None: No database, API contract, or library changes.

## 8. Build order
1. Add tests in `src/api/__tests__/client.test.ts` checking concurrent 401 resolution and refresh deduplication.
2. Update response interceptor in `src/api/client.ts`.
3. Verify tests pass.
4. Run full frontend verification (`npm run lint`, `npm test`, `npm run build`).
5. Review diff and commit.

## 9. How I will check it
- Unit tests:
  - 3 concurrent requests failing with 401 trigger exactly 1 `axios.post('/auth/refresh')` and all 3 resolve with updated headers.
  - Refresh failure propagates to all queued requests and clears `localStorage`.
- Full suite verification: `npm test`, `npm run lint`, `npm run build`.
