# Backend Testing Strategy

This document details the backend testing architecture, testing levels, test runner configuration, and execution practices for the FastAPI application.

---

## 1. Test Suite Structure & Levels

Backend tests are organized under `backend/tests/` and configured via `pytest.ini`:

```text
backend/tests/
├── conftest.py                             # Test fixtures: SQLite DB session, AsgiTestClient, sync helper
├── unit/
│   ├── test_architecture.py                # Enforces domain framework isolation (ADR-0001)
│   ├── test_auth_service.py                # Unit tests for authentication logic
│   ├── test_match_owner_authorization.py   # Unit tests for single-owner match authorization (ADR-0008)
│   ├── test_refresh_token_repository.py    # Unit tests for token rotation & reuse detection
│   ├── test_delivery_rules.py              # Delivery scoring unit tests
│   ├── test_scorecard_service.py           # Unit tests for scorecard calculations
│   ├── test_squad_service.py               # Unit tests for squad validation
│   └── domain/
│       ├── test_crease.py                  # Pure crease state machine unit tests
│       ├── test_format_rules.py            # Format strategy unit tests (T20, ODI)
│       ├── test_innings_aggregate.py       # Ball-by-ball aggregate unit tests
│       └── test_reconstruct.py             # Historical reconstruction unit tests
│
└── e2e/
    ├── test_auth_and_access_e2e.py         # Full HTTP auth, login, refresh, permissions E2E
    ├── test_match_lifecycle_e2e.py         # Full match lifecycle (Schedule -> Toss -> Live -> Finish)
    ├── test_scorecard_endpoint.py          # Scorecard API response E2E
    └── test_seed.py                        # Demo seed endpoint verification
```

---

## 2. Test Execution & Helpers

### A. Execution Commands
```powershell
# Run the complete test suite:
cd backend
..\.venv\Scripts\pytest.exe

# Run with verbose output:
..\.venv\Scripts\pytest.exe -v

# Run a single test file:
..\.venv\Scripts\pytest.exe tests/unit/domain/test_crease.py
```

### B. In-Memory SQLite Environment
- The test harness uses an in-memory SQLite database (`sqlite+aiosqlite:///:memory:`) configured in `tests/conftest.py`.
- Tables are created dynamically before each test run via `Base.metadata.create_all`.
- An in-process ASGI test client (`AsgiTestClient`) issues requests against the FastAPI app without binding real network ports.

### C. The `sync()` Helper
`pytest-asyncio` is configured, and a centralized `sync()` helper in `tests/conftest.py` executes async coroutines synchronously within test bodies, preventing event-loop collisions:
```python
from tests.conftest import sync

def test_squad_validation():
    result = sync(service.create_squad(1, valid_squad_data))
    assert result.id is not None
```

---

## 3. Mandatory Testing Rules

1. **Derive Tests from Requirements**: Do not copy service implementation code into tests. Test what the system *should* do.
2. **Every Rejection Has a Test**: For every rule check in a service, there must be a test proving that violating the rule raises the exact expected exception.
3. **Verify Side Effects**: Do not merely check the HTTP status code. Query the database or read the state back to verify that changes actually persisted (or rolled back).
4. **Never Weaken Tests to Pass**: If a test fails, investigate the cause. Never delete or alter assertions to force a green test suite.
