# Application Structure & Component Boundaries

This document defines the folder structure, routing layout, provider tree, and component boundaries of the React application.

---

## 1. Directory Blueprint

```text
frontend/src/
├── app/
│   ├── layouts/                  # Layout shells
│   │   ├── PublicLayout.tsx      # Spectator layout with Navbar & Footer
│   │   ├── DashboardLayout.tsx   # Authenticated admin dashboard shell
│   │   └── ScorerLayout.tsx      # Minimalist, distraction-free scoring shell
│   ├── providers/
│   │   └── AppProvider.tsx       # QueryClientProvider, AuthProvider, ToastProvider
│   └── router/
│       ├── index.tsx             # Canonical React Router configuration
│       └── ProtectedRoute.tsx    # Role & auth guard component
│
├── features/                     # Feature slices
│   └── <feature>/
│       ├── pages/                # Screen-level route components
│       ├── components/           # Feature-specific display components
│       ├── hooks/                # Feature-specific data hooks
│       └── __tests__/            # Tests co-located with feature code
│
├── components/
│   ├── ui/                       # Atomic building blocks (Button, Modal, Card, Table, Tabs)
│   ├── common/                   # Cross-cutting widgets (ErrorBoundary, Toast, StatusBadge)
│   ├── scorer/                   # Console widgets (CreaseHud, DeliveryKeypad, keypad/, modals/)
│   └── setup/                    # Match creation forms (ScheduleMatchForm, schedule/, PlayingXISelector)
│
├── lib/                          # Single API client & pure utility functions
│   └── api-client.ts             # Canonical backend gateway
│
├── types/                        # Backend contract mirrors (cricket.ts, auth.ts)
└── index.css                     # Tailwind CSS v4 entry & theme color tokens
```

---

## 2. Where Does This Code Go?

| Code Type | Target Location | Rules & Constraints |
|---|---|---|
| **Route / Screen** | `features/<feature>/pages/` | Reads URL parameters, calls hooks, manages loading/error/empty, composes components. |
| **Feature Component** | `features/<feature>/components/` | Used within one feature only. Props in, callbacks out. No direct API calls. |
| **Reusable UI Element** | `components/ui/` | Shared by 2+ features. Must have **zero imports** from `features/` or `app/`. |
| **Data Fetching / Mutation** | `features/<feature>/hooks/` | Uses TanStack Query (`useQuery`, `useMutation`). Invokes `lib/api-client.ts`. |
| **Pure Helper Function** | `lib/` or feature folder | Pure input -> output. No React or DOM dependencies. |
| **Backend Response Type** | `types/` | Matches Pydantic schemas in `backend/app/schemas/` exactly. |

### Scorer Console & State Hooks (`src/features/scoring/`, `src/hooks/`)
- `ScorerConsolePage`: Orchestrates the console workspace, loads state, and hosts modal dialogs (< 250 lines).
- `ScorerHeader`: Displays breadcrumbs, innings selector, access modal trigger, and Match Center shortcut.
- `MatchCompletedBanner`: Displays winner details and Man of the Match nomination form.
- `InningsTransitionPrompts`: Shows innings break targets or opening batter setup prompts.
- `useScorerKeyboardShortcuts`: Manages non-intrusive physical key bindings for ball recording and wicket triggers.
- `useScorerMutations`: Encapsulates TanStack Query mutation definitions and cache invalidation side effects for scoring operations.
- `useScorerActions`: Pure action orchestration layer handling confirmation states, modal workflows, and validation before delegating to mutations.

### Dashboard Overview Decomposition (`src/features/dashboard/`)
- `DashboardOverviewPage`: Composes overall dashboard metrics, quick workflows, and recent match activity (< 100 lines).
- `DashboardMetricsGrid`: Visualizes system-wide totals including active tournaments, ongoing matches, and match counts.
- `DashboardWorkflowsGrid`: Quick action shortcuts for scheduling matches, creating teams, and managing squads.
- `DashboardRecentMatchesTable`: Tabular view of recent match records with real-time status indicators and deep links.

---

## 3. Provider Hierarchy (`src/app/providers/AppProvider.tsx`)

```tsx
<QueryClientProvider client={queryClient}>
  <AuthProvider>
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  </AuthProvider>
</QueryClientProvider>
```
1. **QueryClientProvider**: Supplies the TanStack Query cache.
2. **AuthProvider**: Manages active user session, token refresh hydration, and logout.
3. **ToastProvider**: Emits toast notifications for user actions and error alerts.

---

## 4. Route Code-Splitting & Suspense Loading (`src/app/router/index.tsx`)

All page components are dynamically loaded on demand via `React.lazy(() => import(...))` to prevent spectator bundles from downloading heavy admin and scorer chunks. Each route wraps its lazy page inside:
1. `<ErrorBoundary>` to isolate render errors to the specific page without crashing the shell.
2. `<React.Suspense fallback={<RouteLoadingFallback />}>` (`src/components/common/RouteLoadingFallback.tsx`) to show an accessible loading indicator during async chunk resolution.
