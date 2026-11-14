# Frontend Architecture Overview

This document describes the high-level architecture of the Cricbuzz Tracker web frontend, its core technology stack, and its structural design principles.

---

## 1. Modern SPA Architecture

The frontend is a single-page application (SPA) built with:
- **React 19**: Modern concurrent React with functional components and custom hooks.
- **TypeScript**: Strict type checking with zero unchecked `any` types.
- **Vite**: Rapid dev server with ES module HMR and optimized Rollup production bundling.
- **TanStack Query v5**: Server state management, intelligent caching, interval polling, and mutation invalidation.
- **Tailwind CSS v4**: Utility-first CSS using CSS variables and theme tokens defined in `src/index.css`.
- **Axios**: HTTP client configured with cookie credentials and token refresh promise chaining.
- **React Router**: Client-side routing with public and protected layouts.

---

## 2. Feature-Sliced Architecture (ADR-0006)

The application follows a **feature-sliced** structure rather than a flat file-type hierarchy:

```text
src/
├── app/                  # Application Shell: Routes, Layouts, Providers
├── features/             # Self-contained business domains:
│   ├── authentication/   # Auth forms, context, session hydration
│   ├── dashboard/        # Administrative dashboards & match management
│   ├── home/             # Public Match Hub (Live, Scheduled, Completed)
│   ├── match-management/ # SetupWizard, squad creation
│   ├── matches/          # Spectator Match Center (Scorecard, Live, Commentary)
│   ├── players/          # Player profiles and listings
│   ├── scoring/          # Scorer Console (Keypad, Crease HUD, Modals)
│   └── teams/            # Team creation and listings
├── components/
│   ├── ui/               # Atomic, feature-agnostic building blocks (Button, Modal, Card)
│   ├── common/           # Cross-cutting UI (ErrorBoundary, Toast, StatusBadge)
│   └── scorer/           # Scorer-specific subcomponents
├── lib/                  # Canonical API client and shared pure utilities
└── types/                # Strongly-typed domain and auth contracts
```

### Core Invariants:
1. **Feature Encapsulation**: A feature module may import from `components/ui`, `lib`, and `types`. A feature must **never** import internal components from another feature.
2. **UI Independence**: Components in `components/ui/` must have **zero dependencies** on `src/features/` or `src/app/` (mechanically verified by `audit_gate.py`).
3. **No Domain Calculations**: The frontend performs zero scoring calculations (runs, wickets, strike, overs). The frontend presents what the API returns.
