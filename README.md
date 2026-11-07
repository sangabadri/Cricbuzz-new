# 🏏 Cricbuzz Tracker — Full-Stack Cricket Scoring & Live Match Center

A production-grade, real-time cricket match tracking and live scoring application built with **FastAPI** (Python 3.11) on the backend and **React 19 + TypeScript + Vite + Tailwind CSS** on the frontend.

---

## 🏗️ Repository Architecture

The codebase is cleanly divided into standalone **backend** and **frontend** workspaces, with multi-service orchestration and deployment manifests at the root:

```
cricbuzz-tracker/
├── backend/                          # Standalone Python FastAPI Backend
│   ├── app/                          # Clean Architecture / Domain-Driven API
│   │   ├── domain/                   # Pure business logic (Crease state, rules, aggregates, exceptions)
│   │   ├── models/                   # SQLAlchemy ORM models (Match, Innings, Delivery, Squad, Player, Team)
│   │   ├── repositories/             # Database access layer (Async PostgreSQL)
│   │   ├── routers/                  # API endpoints (Matches, Deliveries, Scorecards, Squads, Teams, Seed)
│   │   ├── schemas/                  # Pydantic v2 validation contracts
│   │   ├── services/                 # Application business logic layer
│   │   ├── config.py                 # App settings
│   │   ├── database.py               # Async DB session engine
│   │   └── main.py                   # FastAPI app entry with CORS middleware
│   ├── tests/                        # 100 passing unit and E2E lifecycle tests
│   │   ├── conftest.py               # Test fixtures and SQLite in-memory test DB
│   │   ├── e2e/                      # Match lifecycle and seed test suites
│   │   └── unit/                     # Domain, service, rules, and exception unit tests
│   ├── Dockerfile                    # Container definition for FastAPI API
│   ├── .dockerignore                 # Container build exclusion patterns
│   ├── pytest.ini                    # Pytest configuration & test path definition
│   └── requirements.txt              # Pinned Python package dependencies
│
├── frontend/                         # Standalone Modern React + Vite Frontend
│   ├── src/
│   │   ├── api/client.ts             # Axios client connected via Vite proxy & CORS
│   │   ├── types/cricket.ts          # Strongly typed domain TypeScript definitions
│   │   ├── hooks/useScorer.ts        # Dedicated scoring hook (state, mutations, query invalidations)
│   │   ├── components/
│   │   │   ├── common/               # Atomic reusable UI components (BallBubble, StatusBadge, Toast)
│   │   │   ├── match/                # Spectator Match Center modular views (BattingTable, BowlingTable, CommentaryFeed)
│   │   │   ├── scorer/               # Scorer Console subcomponents (CreaseHud, DeliveryKeypad, Modals)
│   │   │   └── Navbar.tsx            # Brand header with 1-Click Demo Seed button
│   │   ├── pages/
│   │   │   ├── Home.tsx              # Match Hub (Live, Scheduled, Completed filters)
│   │   │   ├── MatchCenter.tsx       # 4-Tab Spectator Center (Live, Scorecard, Commentary, Squads)
│   │   │   ├── ScorerConsole.tsx     # Clean Scorer Pad UI
│   │   │   └── SetupWizard.tsx       # Team, Player, Match creation & Toss manager
│   │   ├── App.tsx                   # Route definitions & ToastProvider wrapper
│   │   └── main.tsx                  # React entry point with TanStack QueryClient
│   ├── package.json                  # Frontend dependencies & scripts
│   ├── vite.config.ts                # Vite config with Tailwind v4 & /api reverse proxy
│   └── tsconfig.json                 # TypeScript compiler configuration
│
├── k8s/                              # Kubernetes Deployment & Service Manifests
│   ├── api-deployment.yaml           # API deployment with health & readiness probes
│   ├── api-service.yaml              # ClusterIP service for API
│   ├── postgres-configmap.yaml       # Database configuration map
│   ├── postgres-secret.yaml          # Database credentials secret
│   ├── postgres-service.yaml         # Database service
│   └── postgres-statefulset.yaml     # PostgreSQL persistent statefulset
│
├── docker-compose.yaml               # Local multi-container stack (PostgreSQL + FastAPI backend)
├── .gitignore                        # Monorepo git exclusion patterns
└── README.md                         # Project documentation
```

---

## ⚡ Quick Start

### 1. Start the FastAPI Backend
```powershell
# Navigate to backend:
cd backend

# Ensure your virtual environment is active and run:
..\.venv\Scripts\uvicorn app.main:app --reload --port 8000
```
- API Base URL: `http://localhost:8000`
- Interactive Swagger Docs: `http://localhost:8000/docs`

### 2. Start the React Frontend
In a new terminal window:
```powershell
# Navigate to frontend:
cd frontend

# Install packages (first time only):
npm install

# Start Vite dev server:
npm run dev
```
- Frontend UI: `http://localhost:5173`

---

## 🧪 Running Tests & Builds

### Backend Test Suite
Run the 100-test suite from either the backend directory or project root:
```powershell
# From backend/:
cd backend
..\.venv\Scripts\pytest.exe

# Or from project root:
.venv\Scripts\pytest.exe -c backend/pytest.ini backend
```
Result: **100 passed in <1s**.

### Frontend Typecheck & Production Build
```powershell
cd frontend
npm run build
```
Result: **0 errors** (`tsc -b && vite build`).

---

## 🐳 Docker & Container Orchestration

To run PostgreSQL and the FastAPI backend using Docker Compose:
```powershell
docker-compose up --build
```
The API container builds directly from `./backend/Dockerfile` and automatically mounts `./backend` for hot reloading.
