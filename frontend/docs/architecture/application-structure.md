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
│   └── scorer/                   # Console widgets (CreaseHud, DeliveryKeypad, modals)
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
