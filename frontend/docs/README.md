# Frontend Documentation (`frontend/docs/`)

This directory documents the client-side architecture, feature-sliced directory structure, TanStack Query state flow, UI components, styling tokens, and testing practices of the Cricbuzz Tracker React 19 application.

---

## 📚 Frontend Documentation Map

```
frontend/docs/
├── README.md                                # This index
│
├── architecture/
│   ├── overview.md                          # Modern React 19 SPA architecture & ADR-0006
│   ├── application-structure.md             # Feature-sliced folders, layout, and component boundaries
│   └── state-and-data-flow.md               # TanStack Query server state, cache keys, mutations
│
├── integration/
│   └── api-integration.md                  # Canonical API client, Axios, 401 refresh coalescing
│
├── development/
│   ├── coding-conventions.md                # Component design, props, Tailwind tokens, a11y
│   └── implementation-guidelines.md         # Step-by-step feature & screen development workflow
│
├── testing/
│   ├── testing-strategy.md                  # Vitest + RTL setup, testing what user sees and does
│   ├── functional-and-edge-cases.md         # Testing empty states, forms, keyboard actions
│   └── failure-and-integration-testing.md   # Testing API errors, refresh flows, ErrorBoundary
│
└── known-problems.md                        # Catalog of large components and frontend debt
```

---

## 🎯 Quick Navigation by Responsibility

- **Need to understand folder layout and feature boundaries?** Read [`architecture/application-structure.md`](architecture/application-structure.md).
- **Need to see how data is queried and mutated?** Read [`architecture/state-and-data-flow.md`](architecture/state-and-data-flow.md).
- **Need to call a new backend endpoint?** Read [`integration/api-integration.md`](integration/api-integration.md).
- **Need to build a new screen or component?** Read [`development/implementation-guidelines.md`](development/implementation-guidelines.md).
- **Need to write component or hook tests?** Read [`testing/testing-strategy.md`](testing/testing-strategy.md).
