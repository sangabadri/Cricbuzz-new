# Testing Strategy & Philosophy

This document outlines the testing strategy, test levels, environments, fixtures, and execution practices for Cricbuzz Tracker.

---

## 1. Core Testing Philosophy

In Cricbuzz Tracker, testing is **requirement-driven, not code-driven**:
1. **Tests come from requirements**: We write tests to prove that system requirements and cricket laws are satisfied, not to merely mirror internal implementation details.
2. **Rejection paths are as critical as happy paths**: For every valid operation, write tests that assert invalid inputs, illegal cricket states, and unauthorized requests are rejected with exact error messages and status codes.
3. **No tests for coverage vanity**: Avoid tests written solely to inflate coverage numbers. A passing unit test suite with 100% line coverage does not prove the application works if integration, boundaries, and failure modes are omitted.
4. **Behavioral assertion over implementation mocking**: Mock external boundaries (e.g. database sessions in unit tests, API client methods in UI tests), but avoid deep mocking of internal business objects.

---

## 2. Testing Levels & Pyramid

```
                       / \
                      /   \
                     / E2E \       Backend: FastAPI AsgiTestClient (SQLite)
                    / Request- \   Frontend: Vitest Page Flow Tests
                   /--- Path ---\
                  /              \
                 /  Service & UI  \  Backend: Service Unit (Mocked Repos)
                /   Integration    \ Frontend: Component & Hook Tests
               /--------------------\
              /                      \
             /   Domain & Unit Tests  \  Pure Python Cricket Rules (No DB/HTTP)
            /--------------------------\ Helper Functions, Reducers, Pure Utils
```

### A. Domain Unit Tests (`backend/tests/unit/domain/`)
- **Scope**: Crease rules (`CreaseState`), innings math (`InningsAggregate`), format limits (`T20FormatRules`, `ODIFormatRules`).
- **Dependencies**: Zero. Uses plain Python objects without database or web framework imports.
- **Execution Speed**: Milliseconds.

### B. Service Unit Tests (`backend/tests/unit/test_*_service.py`)
- **Scope**: Business orchestration, entity existence validation, permission evaluations, domain error triggers.
- **Dependencies**: Repositories mocked via `unittest.mock.AsyncMock`.
- **Focus**: Every validation branch and rejection path.

### C. Architecture Invariant Tests (`backend/tests/unit/test_architecture.py`)
- **Scope**: Structural integrity and Clean Architecture guardrails (ADR-0001).
- **Checks**: Scans `backend/app/domain/` to mechanically enforce that no web (`fastapi`, `starlette`), ORM (`sqlalchemy`), or serialization (`pydantic`) packages are imported.

### D. Full Request-Path E2E Tests (`backend/tests/e2e/`)
- **Scope**: Complete HTTP request-response lifecycle through FastAPI routers, dependency injection, service orchestration, database transaction rollback/commit, and JSON serialization.
- **Environment**: In-process FastAPI app using an in-memory SQLite database via `AsgiTestClient`.
- **Focus**: Real status codes (201, 400, 401, 403, 404, 409), headers (`WWW-Authenticate`), and database side-effects.

### E. Frontend Component Tests (`src/**/__tests__/*.test.tsx`)
- **Scope**: UI rendering, empty/loading/error states, user interactions (clicks, keyboard input), accessibility roles.
- **Tools**: Vitest, React Testing Library, `@testing-library/jest-dom`, jsdom.
- **Focus**: Testing what the user sees and does. Assertions target visible text and roles (`getByRole`, `getByText`), avoiding brittle CSS class assertions.

### F. Frontend Hook & API Integration Tests (`src/lib/__tests__/`, `src/features/**/hooks/`)
- **Scope**: TanStack Query hooks, query cache invalidations, API error formatting, concurrent 401 refresh token promise coalescing.
- **Tools**: Vitest with mock API handlers.

---

## 3. Test Environments & Fixtures

### Backend Fixtures (`backend/tests/conftest.py`)
- `db_session`: Async SQLite session in-memory (`sqlite+aiosqlite:///:memory:`).
- `client`: `AsgiTestClient` wrapped around the FastAPI app with lifespan initialized.
- `auth_headers`: Helper generating valid JWT bearer tokens for authorized testing.
- `sync()`: Helper enabling synchronous pytest test functions to run async coroutines reliably.

### Frontend Setup (`frontend/src/test/setup.ts`)
- `@testing-library/jest-dom` extensions for DOM assertions.
- Automatic mock cleanup after each test suite.
- Clean `QueryClient` initialized per test with retry disabled to prevent test timeouts.

---

## 4. Test Execution Commands

```powershell
# 1. Run all backend tests:
cd backend
..\.venv\Scripts\pytest.exe

# 2. Run specific backend test file:
..\.venv\Scripts\pytest.exe tests/unit/domain/test_crease.py

# 3. Run all frontend tests:
cd frontend
npm test -- --run

# 4. Run frontend tests in watch mode:
npm run test:watch

# 5. Run full automated pre-flight quality gate:
python .agents/skills/agentic-engineering/scripts/audit_gate.py --full
```
