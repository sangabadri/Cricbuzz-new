# Known problems (not part of any task unless asked)

Measured and cataloged against `toolkit-c` review dimensions (Correctness, Consistency, Responsibility, Complexity, Extensibility, Testability).
Do not fix these while doing other work. Do not make them worse. Fix them only in a task made for it.

## 1. High-Priority Architecture & Build Issues

### A. [RESOLVED - 2026-11-13] Broken TypeScript Production Build (Correctness / Build Pipeline)
- Resolved in commit `70f1bf9`: Added explicit `vi.importActual<typeof import(...)>` type parameter in `AuthContext.test.tsx`. `npm run build` is 100% green.

### B. Split-Brain Frontend: Parallel Duplicate Codebases (Complexity / Architectural Drift)
- The codebase currently contains two parallel page implementations:
  1. Legacy pages: `src/pages/` (`Home.tsx`, `MatchCenter.tsx`, `ScorerConsole.tsx`, `SetupWizard.tsx`).
  2. Bulletproof feature pages: `src/features/` (`features/home/pages/HomePage.tsx`, `features/matches/pages/MatchDetailPage.tsx`, `features/scoring/pages/ScorerConsolePage.tsx`, etc.).
- **The Problem**: `AppRouter` in `src/app/router/index.tsx` mounts the new `features/*` pages. However, the existing unit tests in `src/test/__tests__/` still target the legacy unmounted components in `src/pages/` and `src/components/match/*`.
- Changes to live screens will not be tested by existing test suites, and fixes to tested legacy files will have no effect on live users.
- **Remediation**: Execute a phased migration task to retire legacy `src/pages/`, re-point test suites to feature components, and align with `folder-map.md`.

### C. Feature Boundary Leaks in `MatchDetailPage.tsx` (Responsibility / Boundary Violation)
- `src/features/matches/pages/MatchDetailPage.tsx` imports private tab implementations directly from `src/components/match/` (`MatchCenterHero`, `CreaseTab`, `ScorecardTab`, `SquadsTab`, `CommentaryTab`, `CommentaryFeed`).
- This violates the feature modularity rule: features should only import UI primitives from `components/ui/` or shared helpers from `lib/`.
- **Remediation**: Move match-center tab components inside `src/features/matches/components/`.

### D. [RESOLVED - 2026-11-13] Concurrent 401 Refresh Token Stampede (Correctness / Concurrency)
- Resolved in `src/api/client.ts`: Introduced in-flight `refreshPromise` coalescing with Promise chaining and `/auth/refresh` recursion prevention. Added 4 unit tests in `src/api/__tests__/client.test.ts`.

### E. Insecure Refresh Token Storage (Security)
- 7-day refresh tokens are stored in `localStorage` (`cricbuzz_refresh_token`), exposing long-lived credentials to cross-site scripting (XSS) vectors.
- **Remediation**: Transition to `httpOnly`, `SameSite=Strict` secure cookies for refresh tokens.

### F. Duplicate API Client Files (Consistency)
- `src/api/client.ts` (329 lines) implements the Axios client, token helpers, and API methods.
- `src/lib/api/client.ts` is an orphan 1-line re-export stub (`export * from '../../api/client'`).
- **Remediation**: Consolidate API client into `src/lib/api-client.ts` per `folder-map.md` and eliminate duplicate entrypoints.

---

## 2. Files that are too large (lines)

| File | Lines | Recommended Limit |
|---|---|---|
| `components/setup/ScheduleMatchForm.tsx` | 449 | < 150 (max 250) |
| `features/scoring/pages/ScorerConsolePage.tsx` | 433 | < 150 (max 250) |
| `pages/ScorerConsole.tsx` (legacy) | 415 | < 150 (max 250) |
| `pages/Home.tsx` (legacy) | 351 | < 150 (max 250) |
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
