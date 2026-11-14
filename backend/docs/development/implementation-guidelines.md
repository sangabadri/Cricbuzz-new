# Backend Implementation Guidelines

This guide details the step-by-step procedure for adding new endpoints, services, and queries to the FastAPI backend.

---

## 1. Feature Addition Sequence

Follow this order when implementing backend changes. Run focused tests after each step:

```
[1. Requirements & Schemas] ---> [2. Pure Domain Rules & Tests]
                                               |
[4. Repositories & Queries] <--- [3. SQLAlchemy Models (if approved)]
        |
        v
[5. Service Logic & Unit Tests] -> [6. Wire Dependencies in deps.py]
                                               |
[8. Whole Suite (pytest)]   <--- [7. Router Endpoint & E2E Tests]
```

### Step 1: Requirements & Schemas
- Review the task brief. Differentiate shape validation from domain rules.
- Author Pydantic schemas in `app/schemas/<entity>.py`: `XCreate`, `XUpdate`, `XResponse`.

### Step 2: Pure Domain Rules (Only if pure cricket logic)
- If introducing or modifying cricket rules (crease, overs, wickets, format rules), implement in `app/domain/`.
- Write isolated unit tests in `tests/unit/domain/`.

### Step 3: Model and DB Constraints (Only if approved!)
- **Stop and Ask** before adding a new table or column.
- If approved, define model in `app/models/<entity>.py`. Ensure `app/main.py` imports it for `Base.metadata`.

### Step 4: Repository Methods
- Implement database queries in `app/repositories/<entity>.py`.
- Repositories only query, add, and flush. Never call `session.commit()`.

### Step 5: Service Logic & Unit Tests
- Implement business checks in `app/services/<entity>.py`.
- Raise domain errors from `app/domain/exceptions.py`.
- Write unit tests in `tests/unit/test_<entity>_service.py` mocking repositories with `AsyncMock`.
- Cover both the happy path and every rejection condition.

### Step 6: Dependency Injection Wiring
- Register repository provider in `app/api/deps.py`: `get_<entity>_repo`.
- Register service provider in `app/api/deps.py`: `get_<entity>_service`.

### Step 7: Router & Request-Path E2E Test
- Implement endpoint in `app/routers/<entity>.py`: read input, call one service method, return response.
- Register router in `app/routers/api.py` if new.
- Write request-path test in `tests/e2e/`: call the endpoint via `client`, verify status code, response body, and database side-effect.

### Step 8: Full Suite Verification
- Run `pytest` inside `backend/` to ensure all 185 tests pass without regressions.

---

## 2. Pre-Completion Quality Checklist

Before completing your task, answer these questions:
- [ ] Did I alter an existing API response contract? (The frontend may depend on it—confirm synchronization).
- [ ] Does my operation mutate state concurrently? (Verify row locking order: match first, then innings).
- [ ] Did I place database queries in the router or service? (Move to repository).
- [ ] Did I raise `HTTPException` inside a service? (Change to domain exception in `app/domain/exceptions.py`).
- [ ] Is every new function under 40 lines?
