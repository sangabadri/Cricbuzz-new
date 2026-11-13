# Task Brief: Frontend Split-Brain Elimination & Feature Boundary Realignment

**Date**: 2026-11-13  
**Size**: Large Task / Architectural Refactor  
**Target Areas**: `frontend/src/pages/`, `frontend/src/features/`, `frontend/src/components/match/`, `frontend/src/test/__tests__/`  
**Catalog Reference**: `frontend/docs/known-problems.md` #1.B & #1.C

---

## Goal
Eliminate the parallel duplicate page architecture in `frontend/src/pages/` by consolidating all live spectator and scoring views into their canonical `frontend/src/features/` locations, moving match-center tab components inside `src/features/matches/components/`, repointing the vitest test suite from dead unmounted pages to live mounted feature components, and safely deleting obsolete duplicate files.

---

## In Scope / Out of Scope

### In Scope
1. **Feature Boundary Realignment**:
   - Move match tab components (`BattingTable.tsx`, `BowlingTable.tsx`, `CommentaryFeed.tsx`, `CommentaryTab.tsx`, `CreaseTab.tsx`, `MatchCenterHero.tsx`, `ScorecardTab.tsx`, `SquadsTab.tsx`, and their tests) from `src/components/match/` into `src/features/matches/components/`.
   - Update `MatchDetailPage.tsx` to import its tabs from `./components/`.
   - Update `ScorerConsolePage.tsx` to import `CommentaryFeed` from `../../matches/components/CommentaryFeed`.
2. **Setup Wizard Relocation**:
   - Move `SetupWizard.tsx` (from `src/pages/SetupWizard.tsx`) into `src/features/match-management/components/SetupWizard.tsx`.
   - Update `MatchSetupPage.tsx` to render `SetupWizard` from its own feature folder.
3. **Fixture Card Extraction**:
   - Extract `FixtureCard` from `src/pages/Home.tsx` into `src/features/matches/components/FixtureCard.tsx` (or `src/features/home/components/`).
4. **Test Suite Repointing**:
   - Repoint all tests in `src/test/__tests__/` (`matchCenterDecomposition.challenger.test.tsx`, `milestone4Health.challenger.test.tsx`, `milestone4Health.test.tsx`, `milestone4Challenger.test.tsx`, `stage2Architecture.test.tsx`, `stage3VisualUxDecomposition.test.tsx`, `matchCenter.challenger.test.tsx`, `boundaries.challenger.test.tsx`) to import and mount the live feature components (`MatchDetailPage`, `ScorerConsolePage`, `MatchSetupPage`, `FixtureCard`).
5. **Retirement of Dead Code**:
   - Safely remove `frontend/src/pages/` (`Home.tsx`, `MatchCenter.tsx`, `ScorerConsole.tsx`, `SetupWizard.tsx`).
   - Safely remove `frontend/src/components/match/` once all consumers and tests are repointed.
6. **Verification & Review**:
   - Verify `npm test`, `npm run lint`, and `npm run build` pass at 100% green without regressions.
   - Run the autonomous reviewer convergence loop with an independent read-only reviewer subagent until unconditional `Accept` is achieved.

### Out of Scope
- Rewriting backend API contracts or altering backend services (backend remains unchanged).
- Redesigning visual themes, introducing new styling libraries, or refactoring untouched components.
- Fixing large file size warnings across other features in this single commit (per one-purpose-per-commit rule).

---

## Must Do (Requirements)
1. Public routing in `src/app/router/index.tsx` must remain functional and unmodified in behavior (`/`, `/matches/:id`, `/scorer/:id`, `/setup`).
2. Spectator match center tabs (Crease, Scorecard, Squads, Commentary) must continue to load, poll, and render correctly.
3. Scorer console live ball-by-ball feed must continue to receive and display deliveries via `CommentaryFeed`.
4. Tests in `src/test/__tests__/` must test the actual mounted code paths that run in production, not dead legacy copies.
5. All 233 vitest frontend tests and 178 backend pytest tests must pass before and after the change.

---

## Rules to Respect (Constraints)
- **One purpose per commit**: Keep moves and refactors cleanly separated.
- **Feature Modularity (`frontend/docs/folder-map.md`)**: A feature may only import from `components/ui`, `components/shared`, `lib`, and `types`. Cross-feature sharing of domain-specific components (e.g. `CommentaryFeed` between matches and scoring) must be cleanly declared.
- **Zero test regression**: All test assertions for error states, retry recovery, keydown listeners, and live scorecard rendering must pass against the live components.
- **Autonomous Review Loop**: Independent subagent must review the diff and approve before task completion.

---

## How We Know It Works
- [ ] `MatchDetailPage` renders live hero, crease, scorecard, squads, and commentary tabs from `src/features/matches/components/`.
- [ ] `ScorerConsolePage` renders `CommentaryFeed` without importing from legacy `components/match/`.
- [ ] `MatchSetupPage` renders `SetupWizard` from `features/match-management/components/`.
- [ ] All 10 test suites in `src/test/__tests__/` pass when importing live components.
- [ ] `src/pages/` is completely deleted from the repository.
- [ ] `src/components/match/` is completely deleted from the repository.
- [ ] `npm run lint` reports 0 errors and 0 warnings.
- [ ] `npm run build` (`tsc -b && vite build`) builds clean production bundles with 0 TypeScript errors.
- [ ] `vitest run` reports 233 passed tests.
- [ ] Independent reviewer subagent issues **Accept**.

---

## Sizing
- **Large Task / Architectural Refactor** (cross-cutting structural migration, retiring duplicate subtrees, repointing 10 test suites).
