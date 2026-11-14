# System Architecture Overview

This document describes the high-level architecture, major components, technical stack, communication protocols, and system boundaries of Cricbuzz Tracker.

---

## 1. High-Level Architecture Topology

Cricbuzz Tracker is organized into two standalone workspaces—a Python **FastAPI backend** and a React/TypeScript **frontend SPA**—with shared Docker Compose orchestration and Kubernetes manifests at the repository root.

```
+--------------------------------------------------------------------------------+
|                                CLIENT LAYER                                    |
|                                                                                |
|   +------------------------------------------------------------------------+   |
|   |                       React 19 + Vite SPA                              |   |
|   |                                                                        |   |
|   |   [ Public Spectator Hub ]      [ Scorer Console ]    [ Admin Setup ]  |   |
|   |   - Live Match Center           - Delivery Keypad     - Match Setup    |   |
|   |   - Tabular Scorecard           - Crease HUD          - Team/Squad     |   |
|   |   - Commentary Feed             - Wicket/Undo Modals  - Toss Manager   |   |
|   |                                                                        |   |
|   |   State: TanStack Query v5 (Server Cache) + React useState (UI State)  |   |
|   |   Styling: Tailwind CSS v4 Theme Tokens                                |   |
|   |   API Client: Axios (withCredentials: true, Refresh Coalescing)        |   |
|   +------------------------------------------------------------------------+   |
+---------------------------------------|----------------------------------------+
                                        | HTTP / JSON REST (/api/v1)
                                        | (Bearer Token + httpOnly Cookie)
+---------------------------------------v----------------------------------------+
|                                BACKEND LAYER                                   |
|                                                                                |
|   +------------------------------------------------------------------------+   |
|   |                      FastAPI Application (Port 8000)                   |   |
|   |                                                                        |   |
|   |   [ Routers ]        Matches, Deliveries, Scorecards, Squads, Auth     |   |
|   |       |                                                                |   |
|   |   [ Dependencies ]   api/deps.py (Pure FastAPI Depends wiring)         |   |
|   |       |                                                                |   |
|   |   [ Services ]       Business flows, transaction orchestration         |   |
|   |       |              Raises pure domain exceptions                     |   |
|   |       +----------->  [ Domain Engine ] (Pure Python)                   |   |
|   |       |              - CreaseState & Batting Crease Invariants         |   |
|   |       |              - InningsAggregate & Ball Progression             |   |
|   |       |              - T20/ODI Format Rules Strategies                 |   |
|   |       v                                                                |   |
|   |   [ Repositories ]   Async queries, CRUD, flush-only                   |   |
|   |       |                                                                |   |
|   |   [ ORM Models ]     SQLAlchemy Declarative Base                       |   |
|   +-----------------------------------|------------------------------------+   |
+---------------------------------------|----------------------------------------+
                                        | AsyncPG (AsyncPool)
+---------------------------------------v----------------------------------------+
|                              PERSISTENCE LAYER                                 |
|                                                                                |
|   +------------------------------------------------------------------------+   |
|   |                      PostgreSQL 16 Database                            |   |
|   |                                                                        |   |
|   |   Tables: matches, innings, deliveries, squads, squad_players,         |   |
|   |           players, teams, users, refresh_tokens                        |   |
|   +------------------------------------------------------------------------+   |
+--------------------------------------------------------------------------------+
```

---

## 2. Major Components & Responsibilities

### A. Backend Workspace (`backend/`)
- **Technology**: Python 3.11, FastAPI, async SQLAlchemy 2.0, asyncpg, Pydantic v2.
- **Architectural Style**: Clean Architecture / Domain-Driven Design (ADR-0001).
- **Core Responsibilities**:
  1. Enforce cricket rules, over progression, strike rotation, and dismissal laws via pure domain classes (`app/domain/`).
  2. Maintain relational consistency, transaction atomicity, and deterministic row locking (`app/database.py`, ADR-0002, ADR-0003).
  3. Validate external JSON payloads using Pydantic schemas (`app/schemas/`).
  4. Serve REST API endpoints with standardized JSON responses and domain exception mapping (`app/routers/`, ADR-0004).
  5. Authenticate users, verify match ownership via direct `matches.owner_id` (ADR-0008), and manage cryptographically rotated refresh tokens (`app/services/auth.py`, `app/api/deps.py`).

### B. Frontend Workspace (`frontend/`)
- **Technology**: React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Query v5, Axios, React Router.
- **Architectural Style**: Feature-Sliced Component Architecture (ADR-0006).
- **Core Responsibilities**:
  1. Render mobile-first, high-contrast dark UI for scorers and spectators.
  2. Fetch and synchronize server state via TanStack Query without duplicating server data into local state.
  3. Transmit API requests via single canonical API client (`src/lib/api-client.ts`) with automatic 401 token refresh queue coalescing.
  4. Present loading, empty, and error states gracefully across all screens.
  5. Strictly delegate all cricket calculations to the backend; the UI never computes runs, overs, strike, or winners locally.

### C. Container & Infrastructure Layer (`docker-compose.yaml`, `k8s/`)
- **Local Dev / Testing**: Docker Compose runs PostgreSQL 16 container and FastAPI app with volume hot-reloading.
- **Kubernetes**: Production-ready declarative manifests in `k8s/`:
  - `postgres-statefulset.yaml`: PersistentVolumeClaim-backed stateful PostgreSQL.
  - `postgres-service.yaml` & `postgres-configmap.yaml` & `postgres-secret.yaml`: Secure database connectivity.
  - `api-deployment.yaml`: FastAPI deployment with rolling updates, liveness, and readiness probes.
  - `api-service.yaml`: ClusterIP service routing traffic to backend pods.

---

## 3. Communication Protocols & Boundaries

### A. HTTP REST API
- Base path: `/api/v1` (configured via `settings.API_V1_PREFIX`).
- In development, Vite dev server reverse-proxies `/api` to `http://localhost:8000`.
- Standard responses use application/json.
- Errors follow standard FastAPI schema: `{"detail": "<clear English sentence>"}`.

### B. Authentication & Session Flow
- **Access Token**: Short-lived JWT passed via `Authorization: Bearer <token>` header.
- **Refresh Token**: Long-lived opaque token stored in an `httpOnly`, `SameSite=Lax`, `Path=/api/v1/auth` cookie.
- **Concurrent 401 Handling**: When an access token expires while multiple queries are active, `api-client.ts` uses promise chaining to coalesce concurrent 401s into a single `/auth/refresh` request, re-executing all queued requests upon success.

### C. Database Concurrency & Row Locking
- When scoring a delivery, `DeliveryService` enforces a strict lock acquisition order:
  1. Lock `Match` row (`SELECT ... FOR UPDATE`).
  2. Lock `Innings` row (`SELECT ... FOR UPDATE`).
- This order is invariant across all scoring operations (ADR-0003), preventing deadlocks when multiple requests arrive simultaneously.

---

## 4. Key Architectural Decision References

| Decision | Topic | Key Rule |
|---|---|---|
| [ADR-0001](../../docs/decisions/0001-backend-layers.md) | Backend Layers & Pure Domain | `app/domain` must have 0 framework dependencies. |
| [ADR-0002](../../docs/decisions/0002-async-database.md) | Async DB & Transactions | 1 transaction per request; commit in `get_db()`, repositories flush. |
| [ADR-0003](../../docs/decisions/0003-lock-order.md) | Scoring Lock Order | Always lock `match`, then `innings` with `for_update=True`. |
| [ADR-0004](../../docs/decisions/0004-domain-errors.md) | Centralized Error Mapping | Domain exceptions mapped to HTTP status codes in `main.py`. |
| [ADR-0005](../../docs/decisions/0005-no-auth.md) | Auth Architecture Debt Guard | Public spectator access stays unauthenticated; no ad-hoc auth logic. |
| [ADR-0006](../../docs/decisions/0006-frontend-structure.md) | Frontend Structure | Feature folders; server data in TanStack Query; no rules in UI. |
| [ADR-0007](../../docs/decisions/0007-match-access-single-source-of-truth.md) | Match Ownership (Superseded) | Superseded by ADR-0008. |
| [ADR-0008](../../docs/decisions/0008-single-owner-match-model.md) | Single-Owner Match Model | A match belongs to exactly one user via direct `matches.owner_id`. |
