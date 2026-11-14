# Backend Request Lifecycle

This document traces the complete execution lifecycle of an HTTP request through the Cricbuzz Tracker FastAPI backend.

---

## 1. Request Flow Diagram

```text
[ Client (Browser / Axios) ]
            |
            | 1. HTTP Request (e.g. POST /api/v1/deliveries/1/1)
            v
[ FastAPI Application & CORS Middleware ]
            |
            | 2. Route matching & Pydantic body validation (DeliveryCreate)
            v
[ FastAPI Dependency Injection (api/deps.py) ]
            |
            | 3. get_db() opens AsyncSession (begins transaction)
            | 4. require_match_owner verifies ownership against match.owner_id
            | 5. get_delivery_service instantiates repos & service
            v
[ Router Handler (routers/deliveries.py) ]
            |
            | 6. Calls DeliveryService.record_delivery(...)
            v
[ Service Layer (services/delivery.py) ]
            |
            | 7. Acquires locks in order: Match first, then Innings (for_update=True)
            | 8. Invokes InningsAggregate.record_ball(...)
            v
[ Domain Engine (app/domain/) ]
            |
            | 9. Pure cricket rules evaluated (Crease, overs, wickets)
            |    (Raises typed DomainException on violation)
            v
[ Repositories (app/repositories/) ]
            |
            | 10. session.add(delivery), await session.flush()
            v
[ Response Serialization ]
            |
            | 11. DeliveryService returns ScorerStateResponse
            v
[ Transaction Commit (database.py) ]
            |
            | 12. get_db() commits transaction (or rolls back on exception)
            v
[ HTTP Response ]
            |
            | 13. Returns 200 OK with JSON body
            v
[ Client (Browser / Axios) ]
```

---

## 2. Step-by-Step Lifecycle Phases

### Phase 1: Ingestion & Middleware
1. The client sends an HTTP request with optional `Authorization: Bearer <token>` and cookies.
2. `CORSMiddleware` in `main.py` validates origins against `settings.CORS_ORIGINS` and enables credentials.

### Phase 2: Route Matching & Schema Parsing
1. FastAPI matches URL to registered router endpoint in `app/routers/api.py`.
2. Pydantic schema parses request body (e.g. `DeliveryCreate`). Malformed shapes immediately return `422 Unprocessable Entity`.

### Phase 3: Dependency Resolution & Transaction Setup
1. `get_db()` yields an `AsyncSession`. A single database transaction is initiated.
2. For protected routes, `require_match_owner` parses the match parameter and verifies ownership against `matches.owner_id` (ADR-0008).
3. `get_*_service` instantiates repositories using the active `AsyncSession` and injects them into the service constructor.

### Phase 4: Business Flow & Row Locking
1. Router invokes the target service method with parsed inputs.
2. If mutating state, the service acquires row-level locks via `for_update=True` in fixed order: **match first, then innings** (ADR-0003).

### Phase 5: Domain Evaluation & Persistence
1. Service invokes pure domain logic (`InningsAggregate`, `CreaseState`, `MatchFormatRules`).
2. If cricket laws are violated, a typed domain exception is raised (e.g. `CreaseViolationError`).
3. If valid, the repository adds the new records and calls `await session.flush()` to populate generated IDs.

### Phase 6: Completion, Commit & Exception Handling
- **Success Path**:
  1. Service constructs and returns a Pydantic response model.
  2. The endpoint handler finishes.
  3. `get_db()` executes `await session.commit()`.
  4. Client receives `200 OK` or `201 Created` with JSON payload.
- **Error / Rejection Path**:
  1. A `CricketDomainError` or child exception is raised.
  2. `get_db()` catches the error and executes `await session.rollback()`, ensuring no partial changes persist.
  3. `domain_exception_handler` in `app/main.py` looks up the status code in `DOMAIN_EXCEPTION_STATUS_MAP` (e.g. 400 for `RuleViolationError`, 404 for `EntityNotFoundError`).
  4. Client receives JSON error response: `{"detail": "<error message>"}`.
