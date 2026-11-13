# Design Plan: Frontend Split-Brain Elimination & Feature Boundary Realignment

**Date**: 2026-11-13  
**Target Slices**: Slice C (Large Task)  
**Catalog Reference**: `frontend/docs/known-problems.md` #1.B & #1.C  
**Brief Reference**: `docs/notes/2026-11-13-frontend-split-brain-elimination-brief.md`

---

## 1. What I Understood
The frontend repository has a split-brain architecture:
1. `src/features/` hosts the active page components mounted by `src/app/router/index.tsx` (`HomePage`, `MatchDetailPage`, `ScorerConsolePage`, `MatchSetupPage`).
2. `src/pages/` contains unmounted duplicates (`Home.tsx`, `MatchCenter.tsx`, `ScorerConsole.tsx`, `SetupWizard.tsx`).
3. `src/components/match/` holds tab components that are directly imported by `features/matches/pages/MatchDetailPage.tsx` and `features/scoring/pages/ScorerConsolePage.tsx`, violating feature boundary modularity.
4. The test suites in `src/test/__tests__/` test the dead legacy copies in `src/pages/` and `src/components/match/`, creating false security while live production code goes untested.

Our objective is to move all match tab components into `src/features/matches/components/`, move `SetupWizard` and `FixtureCard` into their appropriate feature folders, repoint all test files to live components, and delete `src/pages/` and `src/components/match/`.

---

## 2. What Could Be Affected
- [ ] Database tables / columns
- [ ] Domain rules (`backend/app/domain`)
- [ ] Schemas
- [ ] Repositories
- [ ] Services
- [ ] Routers / API shape
- [ ] Frontend types
- [x] Frontend API client / hooks (imports in moved components)
- [x] Pages / components (`src/features/matches/`, `src/features/scoring/`, `src/features/match-management/`, `src/pages/`, `src/components/match/`)
- [x] Tests (`src/test/__tests__/*`, `src/components/match/__tests__/*`)
- [ ] Config / Docker / k8s
- [x] Docs (`frontend/docs/known-problems.md`, `frontend/docs/folder-map.md`)

---

## 3. Architecture Pattern to Follow
Follow the target layout in `frontend/docs/folder-map.md`:
```text
frontend/src/
├── app/
├── features/
│   ├── home/
│   ├── matches/
│   │   ├── pages/ (MatchDetailPage.tsx, MatchesListPage.tsx)
│   │   ├── components/ (MatchCenterHero, CreaseTab, ScorecardTab, SquadsTab, CommentaryTab, CommentaryFeed, BattingTable, BowlingTable, FixtureCard)
│   │   └── __tests__/ (BattingTable.test.tsx, BowlingTable.test.tsx, MatchCenterDecomposed.test.tsx)
│   ├── scoring/
│   │   └── pages/ (ScorerConsolePage.tsx)
│   └── match-management/
│       ├── pages/ (MatchSetupPage.tsx, ScheduleMatchPage.tsx)
│       └── components/ (SetupWizard.tsx)
```

---

## 4. Options and Trade-Offs

| Option | Pros | Cons | Decision |
|---|---|---|---|
| **Option A (Direct Migration & Clean Deletion - Recommended)**: Move match tabs into `features/matches/components/`, move `SetupWizard` to `features/match-management/components/`, move `FixtureCard` to `features/matches/components/`, repoint all 10 test suites to live components, and remove `src/pages/` and `src/components/match/`. | Zero dead code; single source of truth; tests immediately verify live production components; eliminates boundary leaks. | Requires updating import paths across 10 test files simultaneously. | **Selected** |
| **Option B (Re-export Shim Layer)**: Move components but keep re-export shims in `src/pages/` and `src/components/match/` exporting feature components. | Less diff in tests initially. | Violates "no dead code / clean boundaries"; leaves confusing duplicate paths in IDE autocomplete; delays inevitable cleanup. | Rejected |

---

## 5. Build Slices & Execution Order

### Slice C.1: Move Match Tab Components to `features/matches/components/`
- Move from `src/components/match/` to `src/features/matches/components/`:
  - `MatchCenterHero.tsx`
  - `CreaseTab.tsx`
  - `ScorecardTab.tsx`
  - `SquadsTab.tsx`
  - `CommentaryTab.tsx`
  - `CommentaryFeed.tsx`
  - `BattingTable.tsx`
  - `BowlingTable.tsx`
- Move tests from `src/components/match/__tests__/` to `src/features/matches/components/__tests__/`:
  - `BattingTable.test.tsx`
  - `BowlingTable.test.tsx`
  - `MatchCenterDecomposed.test.tsx`
- Fix relative imports inside the moved files (e.g. from `../../types/cricket` to `../../../types/cricket`, etc.).
- Update imports in:
  - `src/features/matches/pages/MatchDetailPage.tsx`
  - `src/features/scoring/pages/ScorerConsolePage.tsx`
- Remove empty `src/components/match/`.
- Commit: `refactor(frontend): move match center tab components into features/matches/components`

### Slice C.2: Relocate `SetupWizard` and `FixtureCard`
- Move `SetupWizard.tsx` to `src/features/match-management/components/SetupWizard.tsx` and adjust imports.
- Update `src/features/match-management/pages/MatchSetupPage.tsx` to import `SetupWizard` from `../components/SetupWizard`.
- Extract `FixtureCard` to `src/features/matches/components/FixtureCard.tsx` and adjust imports.
- Commit: `refactor(frontend): relocate SetupWizard and FixtureCard into feature modules`

### Slice C.3: Repoint Test Suites & Retire `src/pages/`
- Update `src/test/__tests__/`:
  - `matchCenterDecomposition.challenger.test.tsx`: import `MatchDetailPage as MatchCenter` and components from `../../features/matches/components/*`.
  - `milestone4Health.challenger.test.tsx`: import `MatchDetailPage as MatchCenter` and `ScorerConsolePage as ScorerConsole`.
  - `milestone4Health.test.tsx`: import `MatchDetailPage as MatchCenter`, `ScorerConsolePage as ScorerConsole`, and `SetupWizard` from `features/match-management`.
  - `milestone4Challenger.test.tsx`: import `SetupWizard` from `features/match-management`.
  - `stage2Architecture.test.tsx`: import `ScorerConsolePage as ScorerConsole`.
  - `stage3VisualUxDecomposition.test.tsx`: import `FixtureCard` from `features/matches/components/FixtureCard`.
  - `matchCenter.challenger.test.tsx` & `boundaries.challenger.test.tsx`: import from `features/matches/components/*`.
- Verify any minor interface differences between legacy tests and live components (e.g. `ScorerConsolePage` path `/matches/:id/score` vs legacy `/matches/:id/scorer`, ensuring both or the active route are supported).
- Remove `src/pages/` completely (`Home.tsx`, `MatchCenter.tsx`, `ScorerConsole.tsx`, `SetupWizard.tsx`).
- Commit: `test(frontend): repoint test suites to live feature components and remove legacy pages`

### Slice C.4: Quality Gates & Adversarial Review
- Run `npm run lint` (0 errors/warnings).
- Run `npm run build` (clean Vite production build).
- Run `vitest run` (all 233 tests green).
- Run backend pytest (178 tests green).
- Invoke Independent Adversarial Reviewer Subagent.
- Address any findings until unconditional **Accept** is awarded.

---

## 6. How I Will Check It
1. `npm run lint`: 0 errors, 0 warnings across all files.
2. `npm run build`: `tsc -b && vite build` succeeds in < 1 second.
3. `vitest run`: All 18 test files, 233 tests pass.
4. `py -3.11 -m pytest -c backend/pytest.ini backend`: All 178 backend tests pass.
5. Directory check: `frontend/src/pages/` does not exist; `frontend/src/components/match/` does not exist.
6. Git diff check: Clean diff showing only relocations, import path adjustments, and deletion of redundant files.
