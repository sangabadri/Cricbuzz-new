# Frontend Implementation Guidelines

This guide details the step-by-step procedure for creating new pages, features, and UI components in the React frontend.

---

## 1. Screen & Feature Addition Sequence

Follow this order when implementing frontend features:

```
[1. Requirements & Acceptance Criteria]
                  |
                  v
[2. Verify Backend Endpoint & Contracts]
                  |
                  v
[3. TypeScript Interfaces (src/types/)]
                  |
                  v
[4. API Client Method (src/lib/api-client.ts)]
                  |
                  v
[5. TanStack Query Hook (features/<feature>/hooks/)]
                  |
                  v
[6. Feature Presentation Components (features/<feature>/components/)]
                  |
                  v
[7. Page Composition (features/<feature>/pages/)]
                  |
                  v
[8. React Router Route (src/app/router/index.tsx)]
                  |
                  v
[9. Vitest Tests & Quality Checks]
```

### Step 1: Understand Requirements & Personas
- What does the user see? What do they click or type?
- What occurs during loading, when data is empty, or when an error occurs?

### Step 2: Ensure Backend Readiness
- The endpoint must exist and return a known response contract. If not, complete backend work first.

### Step 3: TypeScript Definitions (`src/types/`)
- Define request and response types in `types/cricket.ts` or `types/auth.ts`. Field names must match the backend response keys (snake_case) exactly.

### Step 4: API Client Method (`src/lib/api-client.ts`)
- Add a typed function to `cricketApi`.

### Step 5: Custom Hook (`features/<feature>/hooks/`)
- Encapsulate `useQuery` or `useMutation`.
- On mutations, invalidate related queries (`queryClient.invalidateQueries(...)`).

### Step 6: Presentation Components (`features/<feature>/components/`)
- Build small components taking typed props.
- Reuse atomic pieces from `src/components/ui/` (Button, Modal, Card, Table, Badge).

### Step 7: Page Component (`features/<feature>/pages/`)
- Read route params (`useParams`).
- Call custom hooks.
- Render loading skeletons, error banners, or empty states.
- Compose presentation components.

### Step 8: Route Registration (`src/app/router/index.tsx`)
- Register the new page route under `PublicLayout` or `DashboardLayout` / `ScorerLayout`.

### Step 9: Tests & Quality Checks
- Add component and hook tests.
- Run `npm run lint`, `npm test`, and `npm run build`.

---

## 2. Models to Copy in the Codebase

| Scenario | Reference Implementation |
|---|---|
| Presentation component with empty state | [`BattingTable.tsx`](../../src/features/matches/components/BattingTable.tsx) |
| Feature hook with query invalidation | [`useScorer.ts`](../../src/hooks/useScorer.ts) |
| Modal dialog with focus trap & Esc close | [`Modal.tsx`](../../src/components/ui/Modal.tsx) |
| Error boundary wrapper | [`ErrorBoundary.tsx`](../../src/components/common/ErrorBoundary.tsx) |
| Component unit test | [`BattingTable.test.tsx`](../../src/features/matches/components/__tests__/BattingTable.test.tsx) |
