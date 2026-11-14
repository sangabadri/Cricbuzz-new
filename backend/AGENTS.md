# Backend Agent Rules & Architecture Instructions

- **Runtime & Frameworks**: Python 3.11, FastAPI, async SQLAlchemy 2.0, PostgreSQL, Pydantic v2, pytest.
- **Entry Point**: Read the root [`/AGENTS.md`](../AGENTS.md) first. This document extends global rules with backend-specific constraints.

---

## 1. Clean Architecture Layers & Flow Direction

Calls must strictly flow downward. Reverse dependencies are prohibited:

```text
routers  -->  services  -->  repositories  -->  models
                  |
                  v
                domain   (pure cricket laws, zero framework dependencies)

schemas = request / response contracts        api/deps.py = dependency injection wiring
```

| Layer | Responsibility | Strict Prohibitions |
|---|---|---|
| `routers/` | Read request, call **one** service method, return response. | No business rules, no direct DB/SQL queries, no loops over models. |
| `services/` | Business flow, validation checks, transaction orchestration. | No FastAPI/HTTP imports, no raw SQL, no status codes. |
| `repositories/` | Database queries (`select`, `add`, `flush`). | No business rules, no `session.commit()`, no HTTP exceptions. |
| `domain/` | Pure cricket rules, crease state, innings progression. | **Zero imports** of `fastapi`, `sqlalchemy`, or `pydantic` (enforced by test). |
| `models/` | Declarative SQLAlchemy table definitions & constraints. | No business logic, no JSON serialization logic. |
| `schemas/` | Pydantic v2 validation and serialization schemas. | No database access, no business rules. |
| `api/deps.py` | FastAPI `Depends()` wiring of repositories into services. | No authorization logic, no SQL queries, no domain decisions. |

Detailed guide: [`backend/docs/architecture/components-and-responsibilities.md`](docs/architecture/components-and-responsibilities.md).

---

## 2. Strict Invariants for Backend Coding Agents

1. **Scoring Row-Locking Order (ADR-0003)**:
   Any method that mutates match or innings state must acquire row-level locks (`for_update=True`) in this exact sequence:
   ```python
   match = await self.match_repo.get_by_id(match_id, for_update=True)       # 1st
   innings = await self.innings_repo.get_by_id(innings_id, for_update=True) # 2nd
   ```
   Inverting this order causes deadlocks under concurrent requests and is prohibited.

2. **One Transaction per Request (ADR-0002)**:
   - Database operations use async SQLAlchemy (`AsyncSession`).
   - Repositories call `await session.flush()`.
   - Only `get_db()` in `app/database.py` commits or rolls back the transaction.

3. **Domain Exception Handling (ADR-0004)**:
   - Services raise pure exceptions from `app/domain/exceptions.py`.
   - Never raise `HTTPException` inside services or repositories.
   - Status codes are mapped centrally in `DOMAIN_EXCEPTION_STATUS_MAP` in `app/main.py`.

4. **Match Authorization (ADR-0008)**:
   - Canonical match ownership lives directly in `matches.owner_id`.
   - Verify permissions via `require_match_owner` in `app/api/deps.py`. A match belongs to exactly one user; there are no shared match roles or delegation. Unassigned matches (`owner_id is None`) permit open demo access.

---

## 3. Size Limits & Refactoring Guardrails

- **Functions**: Target 40 lines. Exceeding 80 lines is a defect.
- **Files**: Target 300 lines.
- **Do not lengthen existing long functions**: If modifying a method listed in [`backend/docs/known-problems.md`](docs/known-problems.md), propose extracting private helper methods as a dedicated refactoring step with tests passing before and after.

---

## 4. Backend Naming Conventions

| Entity | Pattern | Example |
|---|---|---|
| Modules (one per thing) | `singular.py` | `team.py`, `delivery.py`, `squad.py` |
| Classes | PascalCase | `TeamService`, `DeliveryRepository`, `Innings` |
| Schemas | `XCreate`, `XUpdate`, `XResponse` | `MatchCreate`, `DeliveryUpdate`, `ScorecardResponse` |
| Functions | Verb phrase in snake_case | `create_squad`, `undo_last_delivery`, `get_by_id` |
| Exceptions | Ends with `Error` | `CreaseViolationError`, `EntityNotFoundError` |
| Tests | `test_<what_should_happen>` | `test_striker_advances_on_odd_runs` |

---

## 5. Backend Documentation Index

| Documentation Area | File Link |
|---|---|
| **Backend Architecture Overview** | [`backend/docs/architecture/overview.md`](docs/architecture/overview.md) |
| **Components & Responsibilities** | [`backend/docs/architecture/components-and-responsibilities.md`](docs/architecture/components-and-responsibilities.md) |
| **Request Lifecycle** | [`backend/docs/architecture/request-lifecycle.md`](docs/architecture/request-lifecycle.md) |
| **Domain Implementation** | [`backend/docs/domain/domain-implementation.md`](docs/domain/domain-implementation.md) |
| **Database Schema & Models** | [`backend/docs/database/schema-and-relationships.md`](docs/database/schema-and-relationships.md) |
| **Transactions & Concurrency** | [`backend/docs/database/transactions-and-consistency.md`](docs/database/transactions-and-consistency.md) |
| **API Design & Errors** | [`backend/docs/api/api-design-and-error-handling.md`](docs/api/api-design-and-error-handling.md) |
| **Coding Conventions** | [`backend/docs/development/coding-conventions.md`](docs/development/coding-conventions.md) |
| **Implementation Guidelines** | [`backend/docs/development/implementation-guidelines.md`](docs/development/implementation-guidelines.md) |
| **Backend Testing Strategy** | [`backend/docs/testing/testing-strategy.md`](docs/testing/testing-strategy.md) |
| **Functional & Edge Testing** | [`backend/docs/testing/functional-and-edge-cases.md`](docs/testing/functional-and-edge-cases.md) |
| **Failure & Integration Testing**| [`backend/docs/testing/failure-and-integration-testing.md`](docs/testing/failure-and-integration-testing.md) |
| **Technical Debt & Known Debt** | [`backend/docs/known-problems.md`](docs/known-problems.md) |

---

## 6. Verification Command
Always run tests from the `backend/` directory:
```powershell
cd backend
..\.venv\Scripts\pytest.exe
```
Result must be 100% green (185 tests passing).
