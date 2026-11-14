# 🏏 Cricbuzz Tracker — Full-Stack Cricket Scoring & Live Match Center

A production-grade, real-time cricket match tracking and live scoring application built with **FastAPI** (Python 3.11) on the backend and **React 19 + TypeScript + Vite + Tailwind CSS** on the frontend.

---

## 🏗️ Repository Architecture

The codebase is organized into standalone **backend** and **frontend** workspaces, with multi-service orchestration and Kubernetes manifests at the repository root:

```text
cricbuzz-tracker/
├── AGENTS.md                         # Global instructions and autonomy rules for AI coding agents
├── README.md                         # Project overview and quick start guide
├── docker-compose.yaml               # Local multi-container stack (PostgreSQL + FastAPI)
│
├── docs/                             # Project Knowledge Base & Architecture Documentation
│   ├── README.md                     # Documentation index & agent navigation guide
│   ├── product/                      # Product vision, personas, and identifiable requirements
│   │   ├── overview.md
│   │   └── requirements.md
│   ├── architecture/                 # High-level system topology, clean architecture, and boundaries
│   │   └── system-overview.md
│   ├── domain/                       # Cricket domain model, crease invariants, and format rules
│   │   ├── domain-model.md
│   │   └── cricket-rules.md
│   ├── contracts/                    # REST API specifications, auth cookie contracts, error formats
│   │   └── interface-contracts.md
│   ├── development/                  # Workflows for features, bugfixes, refactoring, and commits
│   │   ├── development-workflow.md
│   │   ├── feature-development.md
│   │   ├── bug-fixing.md
│   │   ├── refactoring.md
│   │   ├── commit-guidelines.md
│   │   └── code-review-and-completion.md
│   ├── testing/                      # 7-dimension testing strategy, traceability matrix, quality gates
│   │   ├── testing-strategy.md
│   │   ├── requirements-to-tests.md
│   │   └── quality-gates.md
│   ├── deployment/                   # Docker Compose and Kubernetes deployment guide
│   │   └── deployment-guide.md
│   ├── decisions/                    # Architectural Decision Records (ADRs 0001 through 0007)
│   ├── examples/                     # Worked task walkthroughs (Small, Medium, Large)
│   └── notes/                        # Session handoffs and milestone tracking
│
├── backend/                          # Standalone Python FastAPI Backend
│   ├── AGENTS.md                     # Backend-specific architecture and layer rules
│   ├── docs/                         # Backend internal guides and technical debt registers
│   ├── app/                          # Clean Architecture / Domain-Driven API
│   │   ├── domain/                   # Pure business logic (Crease state, format strategies, exceptions)
│   │   ├── models/                   # SQLAlchemy ORM models (Match, Innings, Delivery, Squad, User)
│   │   ├── repositories/             # Database access layer (Async PostgreSQL)
│   │   ├── routers/                  # API endpoints (Matches, Deliveries, Scorecards, Auth)
│   │   ├── schemas/                  # Pydantic v2 validation contracts
│   │   ├── services/                 # Application business logic & transaction orchestration
│   │   ├── config.py                 # App settings
│   │   ├── database.py               # Async DB session engine
│   │   └── main.py                   # FastAPI app entry with CORS and error handlers
│   └── tests/                        # 185 passing unit, domain, architecture, and E2E lifecycle tests
│       ├── conftest.py               # SQLite in-memory test fixtures and ASGI client
│       ├── e2e/                      # Match lifecycle, auth, and seed test suites
│       └── unit/                     # Domain rules, crease, aggregates, and service unit tests
│
├── frontend/                         # Standalone Modern React + Vite Frontend
│   ├── AGENTS.md                     # Frontend-specific architecture and component rules
│   ├── docs/                         # Frontend internal guides and technical debt registers
│   └── src/
│       ├── app/                      # App shell (Layouts, Query/Auth providers, React Router)
│       ├── features/                 # Feature-sliced modules (matches, scoring, setup, auth)
│       ├── components/
│       │   ├── ui/                   # Reusable atomic UI components (Button, Modal, Card, Table)
│       │   ├── common/               # Global components (ErrorBoundary, Toast, StatusBadge)
│       │   └── scorer/               # Scorer console widgets (CreaseHud, DeliveryKeypad)
│       ├── lib/                      # Canonical API client (Axios, 401 refresh coalescing)
│       ├── types/                    # Strongly typed domain TypeScript definitions
│       └── test/                     # Test setup and shared test helpers (131 Vitest tests)
│
└── k8s/                              # Kubernetes Deployment & Service Manifests
    ├── api-deployment.yaml           # API deployment with health & readiness probes
    ├── api-service.yaml              # ClusterIP service for API
    ├── postgres-statefulset.yaml     # PostgreSQL persistent statefulset
    └── postgres-configmap.yaml       # Database configuration maps and secrets
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

## 🧪 Running Tests & Quality Gates

### Automated Pre-Flight Quality Gate
Run the unified repository quality gate script before and after making changes:
```powershell
python .agents/skills/agentic-engineering/scripts/audit_gate.py --full
```
Verifies backend domain isolation, frontend UI isolation, backend test suite, frontend lint, and frontend typecheck/build.

### Backend Test Suite
```powershell
cd backend
..\.venv\Scripts\pytest.exe
```
Result: **185 passed** across unit, domain, architecture, and E2E test suites in <4s.

### Frontend Lint, Tests & Production Build
```powershell
cd frontend
npm run lint          # Run linter
npm test -- --run     # Run 131 Vitest tests
npm run build         # Production TypeScript compile & Vite bundle
```
Result: **131 passed**, 0 lint errors, 0 type errors.

---

## 🐳 Docker & Container Orchestration

To run PostgreSQL and the FastAPI backend using Docker Compose:
```powershell
docker-compose up --build
```
The API container builds from `./backend/Dockerfile` and connects to the PostgreSQL container.
