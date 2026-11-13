# Known problems (not part of any task unless asked)

Measured and cataloged against `toolkit-c` review dimensions (Correctness, Consistency, Responsibility, Complexity, Extensibility, Testability).
Do not fix these while doing other work. Do not make them worse. Fix them only in a task made for it.

## 1. High-Priority Architecture & Build Issues

### A. [RESOLVED - 2026-11-13] Broken TypeScript Production Build (Correctness / Build Pipeline)
- Resolved in commit `70f1bf9`: Added explicit `vi.importActual<typeof import(...)>` type parameter in `AuthContext.test.tsx`. `npm run build` is 100% green.

### B. [RESOLVED - 2026-11-13] Split-Brain Frontend: Parallel Duplicate Codebases (Complexity / Architectural Drift)
- Resolved in Slice C: Retired legacy `src/pages/` (`Home.tsx`, `MatchCenter.tsx`, `ScorerConsole.tsx`, `SetupWizard.tsx`), extracted `FixtureCard` to `features/matches/components/`, moved `SetupWizard` to `features/match-management/components/`, and repointed all test suites in `src/test/__tests__/` to mount live feature components in `src/features/`.

### C. [RESOLVED - 2026-11-13] Feature Boundary Leaks in `MatchDetailPage.tsx` (Responsibility / Boundary Violation)
- Resolved in Slice C: Moved match-center tab components and tests from `src/components/match/` into `src/features/matches/components/` and deleted obsolete `components/match/` directory. Updated `MatchDetailPage` and `ScorerConsolePage` to import locally.

### D. [RESOLVED - 2026-11-13] Concurrent 401 Refresh Token Stampede (Correctness / Concurrency)
- Resolved in `src/api/client.ts`: Introduced in-flight `refreshPromise` coalescing with Promise chaining and `/auth/refresh` recursion prevention. Added 4 unit tests in `src/api/__tests__/client.test.ts`.

### E. [RESOLVED - 2026-11-13] Insecure Refresh Token Storage (Security)
- Resolved in Slice F: Completely eliminated refresh token storage in browser `localStorage`. Configured `withCredentials: true` across Axios API client to transmit refresh tokens exclusively via `httpOnly`, `SameSite=Lax`, `Path=/api/v1/auth` cookies. Updated `AuthContext` to hydrate session automatically on mount and revoke tokens on logout.

### F. [RESOLVED - 2026-11-13] Duplicate API Client Files (Consistency)
- Resolved in Slice E: Consolidated API client into single canonical `src/lib/api-client.ts` and test into `src/lib/__tests__/api-client.test.ts`. Completely removed orphan stub `src/lib/api/client.ts` and legacy `src/api/` directory. All 38 consumers updated.

---

## 2. Files that are too large (lines)

| File | Lines | Recommended Limit |
|---|---|---|
| `components/setup/ScheduleMatchForm.tsx` | 449 | < 150 (max 250) |
| `features/scoring/pages/ScorerConsolePage.tsx` | 433 | < 150 (max 250) |
| `components/scorer/DeliveryKeypad.tsx` | 351 | < 150 (max 250) |
| `hooks/useScorerActions.ts` | 337 | < 200 |
| `features/dashboard/pages/DashboardOverviewPage.tsx` | 290 | < 150 (max 250) |
| `hooks/useScorer.ts` | 259 | < 200 |
| `features/matches/pages/MatchDetailPage.tsx` | 248 | < 150 (max 250) |
| `components/scorer/CreaseHud.tsx` | 240 | < 150 (max 250) |
| `features/dashboard/pages/AdminMatchesPage.tsx` | 238 | < 150 (max 250) |
| `features/home/components/HeroSection.tsx` | 230 | < 150 (max 250) |

Fix one at a time in refactor-only tasks: write tests first, extract sub-components, and maintain identical visual/functional behavior.

---

## 3. General Frontend Quality & Maintenance Debt
- `hooks/useScorer.ts` has its own copy of `getErrorMessage`. The shared `getApiErrorMessage` in `api/client.ts` should be used instead.
- Many hard-coded hex colors in `className` (e.g. `border-[#38bdf8]`, `bg-[#0f172a]`). Theme tokens in Tailwind should be used instead (see `styling-and-ui.md`).
- Several tests check CSS class names (e.g. `toHaveClass('border-[#38bdf8]')`), making test suites brittle against visual styling changes.
- `src/test/__tests__/` contains files named after development milestones (`stage1DomainCorrectness`, `milestone4Health`, `*.challenger.test.tsx`). Tests should be named after the user-facing behavior they verify and placed adjacent to their components.
