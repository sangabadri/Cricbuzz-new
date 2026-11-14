# Frontend Agent Rules & Architecture Instructions

- **Runtime & Frameworks**: React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Query v5, Axios, React Router, Vitest, React Testing Library.
- **Entry Point**: Read the root [`/AGENTS.md`](../AGENTS.md) first. This document extends global rules with frontend-specific constraints.

---

## 1. Frontend Architecture & Flow Direction

The frontend follows a feature-sliced component architecture (formalized in [ADR-0006](../docs/decisions/0006-frontend-structure.md)):

```text
pages (features/<area>/pages)  -->  feature components (features/<area>/components)
             |                                             |
             v                                             v
hooks (features/<area>/hooks)  -->  shared ui components (components/ui/)
             |
             v
canonical api client (src/lib/api-client.ts)  -->  Axios  -->  FastAPI Backend
```

- **A Page**: One screen for one route URL. Reads URL parameters, invokes feature hooks, delegates display to components, and manages loading/empty/error states.
- **A Component**: Pure presentation. Props come in, UI renders, user interactions emit callbacks. Never fetches data directly.
- **A Hook**: Encapsulates data fetching or mutation via TanStack Query.
- **The API Client (`src/lib/api-client.ts`)**: **The sole module permitted to communicate with the backend.**

---

## 2. Hard Invariants for Frontend Coding Agents

1. **No Client-Side Cricket Calculations**:
   Runs, overs, wickets, strike rotation, targets, and match winners are determined exclusively by the backend. The frontend displays what the backend returns. If an extra data point is needed, that is a backend change (Stop and Ask).
2. **Handle All Three States**:
   Every page or component that consumes asynchronous data must explicitly render **loading**, **empty**, and **error** states.
3. **Single API Door**:
   Never invoke `axios` or `fetch()` from components or pages. All requests must go through `src/lib/api-client.ts`.
4. **Error Handling**:
   Always parse errors using `getApiErrorMessage(error)` from `src/lib/api-client.ts`. Never craft custom duplicate error extractors.
5. **No Local Server State Mirrors**:
   Do not copy server response data into `useState`. Use the TanStack Query result directly. Mutating data must invalidate the appropriate `queryKey`.
6. **No Hardcoded Hex Colors**:
   Use Tailwind theme color tokens (`bg-panel`, `border-line`, `text-accent`, etc.) defined in `src/index.css`. Hardcoded hex classes (e.g. `bg-[#161b22]`) are prohibited in new code.
7. **Type Synchronization**:
   Keep `src/types/cricket.ts` and `src/types/auth.ts` in exact 1:1 synchronization with backend Pydantic response schemas.

---

## 3. Size Limits & Naming Conventions

- **Component File**: Target **under 150 lines** (over 250 must be decomposed).
- **Hooks**: Target **under 200 lines**.
- **Do not lengthen large files**: Review [`frontend/docs/known-problems.md`](docs/known-problems.md) before modifying existing components.

| Entity | Pattern | Example |
|---|---|---|
| Component file & function | PascalCase | `BattingTable.tsx`, `DeliveryKeypad.tsx` |
| Component Props | `<Component>Props` | `BattingTableProps` |
| Custom Hook | `use<Thing>.ts` | `useMatchList.ts`, `useScorer.ts` |
| Feature directory | kebab-case | `features/matches/`, `features/scoring/` |
| Test file | `<Thing>.test.tsx` next to code | `BattingTable.test.tsx` in `__tests__/` |
| Event props | `on<Event>` | `onSelectBatter`, `onDeliverySubmit` |
| Boolean flags | `is<State>`, `has<State>` | `isLoading`, `hasWickets` |

---

## 4. Frontend Documentation Index

| Documentation Area | File Link |
|---|---|
| **Frontend Architecture Overview** | [`frontend/docs/architecture/overview.md`](docs/architecture/overview.md) |
| **Application Structure & Folders** | [`frontend/docs/architecture/application-structure.md`](docs/architecture/application-structure.md) |
| **State & Data Flow** | [`frontend/docs/architecture/state-and-data-flow.md`](docs/architecture/state-and-data-flow.md) |
| **API Integration & Client** | [`frontend/docs/integration/api-integration.md`](docs/integration/api-integration.md) |
| **Coding Conventions & Styling** | [`frontend/docs/development/coding-conventions.md`](docs/development/coding-conventions.md) |
| **Implementation Guidelines** | [`frontend/docs/development/implementation-guidelines.md`](docs/development/implementation-guidelines.md) |
| **Frontend Testing Strategy** | [`frontend/docs/testing/testing-strategy.md`](docs/testing/testing-strategy.md) |
| **Functional & Edge Testing** | [`frontend/docs/testing/functional-and-edge-cases.md`](docs/testing/functional-and-edge-cases.md) |
| **Failure & Integration Testing**| [`frontend/docs/testing/failure-and-integration-testing.md`](docs/testing/failure-and-integration-testing.md) |
| **Technical Debt & Known Debt** | [`frontend/docs/known-problems.md`](docs/known-problems.md) |

---

## 5. Verification Commands
Always verify inside `frontend/`:
```powershell
cd frontend
npm run lint          # Oxlint checks
npm test -- --run     # 131 Vitest tests
npm run build         # TypeScript compile & Vite build
```
All three commands must exit with 0 errors.
