# API Integration & Canonical API Client

This document describes how the React frontend connects to the backend REST API via the canonical API client in `frontend/src/lib/api-client.ts`.

---

## 1. Single Door to the Backend

All HTTP network requests flow through **one canonical file**:
[`frontend/src/lib/api-client.ts`](../../src/lib/api-client.ts).

### Invariants:
1. Components, pages, and hooks must **never** call `axios` directly or invoke `window.fetch()`.
2. Do not create second axios instances.
3. Base URL is `/api/v1` (in development, Vite proxies `/api` to `http://localhost:8000`).

---

## 2. Security & Cookie Handling (`withCredentials: true`)

The Axios instance is configured with:
```typescript
export const apiClient = axios.create({
  baseURL: '/api/v1',
  withCredentials: true, // Transmits httpOnly refresh token cookies automatically
  headers: {
    'Content-Type': 'application/json',
  },
});
```
- Short-lived JWT access tokens are injected into outgoing request headers:
  `Authorization: Bearer <access_token>`.
- Rotating refresh tokens are handled exclusively by browser cookies with `httpOnly`, `SameSite=Lax`, `Path=/api/v1/auth`.

---

## 3. Concurrent 401 Token Refresh Coalescing

When an access token expires while multiple parallel queries are executing, multiple 401 responses arrive simultaneously.

To prevent a "refresh stampede", `api-client.ts` implements **in-flight promise chaining**:

```typescript
let refreshPromise: Promise<string> | null = null;

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Coalesce concurrent refresh requests into one in-flight promise
      if (!refreshPromise) {
        refreshPromise = executeTokenRefresh().finally(() => {
          refreshPromise = null;
        });
      }

      const newToken = await refreshPromise;
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(originalRequest);
    }
    return Promise.reject(error);
  }
);
```

---

## 4. Standardized Error Extraction: `getApiErrorMessage`

All API errors must be extracted using `getApiErrorMessage(error)`:
```typescript
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      return detail[0]?.msg || 'Validation failed';
    }
    if (error.response?.status === 401) return 'Authentication required';
    if (error.response?.status === 403) return 'Access denied';
    if (error.response?.status === 404) return 'Resource not found';
    return error.message || 'Network error occurred';
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
}
```

> [!IMPORTANT]
> **Invariant (frontend/AGENTS.md #4)**: Never re-implement error parsing or extraction locally inside components or hooks (e.g. `useScorer.ts`). All custom hooks, mutators, and pages must import and invoke canonical `getApiErrorMessage` directly from `src/lib/api-client` to guarantee consistent toast feedback and domain error visibility across the application.

---

## 5. Adding a New API Endpoint Call: Checklist

1. **Add TypeScript Types**: In `src/types/cricket.ts`, define request and response interfaces matching backend schemas.
2. **Add API Method**: In `src/lib/api-client.ts`, add a typed method to the `cricketApi` object:
   ```typescript
   export const cricketApi = {
     // ...
     getMatchSummary: async (matchId: number): Promise<MatchSummaryResponse> => {
       const { data } = await apiClient.get<MatchSummaryResponse>(`/matches/${matchId}/summary`);
       return data;
     },
   };
   ```
3. **Add Hook**: Create custom hook in `features/<feature>/hooks/`.
4. **Add Unit Test**: Add test in `src/lib/__tests__/api-client.test.ts` verifying path, verb, and parameters.
