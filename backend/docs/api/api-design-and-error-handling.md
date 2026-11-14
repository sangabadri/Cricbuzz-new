# API Design & Centralized Error Handling

This document describes the REST API conventions, route parameters, response formats, and centralized exception handling in the FastAPI backend.

---

## 1. REST API Design & URL Conventions

- **Prefix**: `/api/v1` (configured via `settings.API_V1_PREFIX`).
- **Resource Naming**: Plural nouns for resource collections (`/teams`, `/players`, `/matches`, `/squads`).
- **Standard Identifier**: Integer primary keys (`match_id: int`, `team_id: int`).
- **Hierarchical Nesting**:
  - Match Access: `/api/v1/matches/{match_id}/access`
  - Squads: `/api/v1/squads/{match_id}`
  - Deliveries: `/api/v1/deliveries/{match_id}/{innings_number}`
  - Scorecard: `/api/v1/scorecards/{match_id}`

---

## 2. Centralized Exception Handling (ADR-0004)

Services and domain classes never import `fastapi.HTTPException`. Instead, they raise pure domain exceptions from `app/domain/exceptions.py`.

A single global exception handler in `backend/app/main.py` catches all `CricketDomainError` instances and maps them to HTTP status codes using `DOMAIN_EXCEPTION_STATUS_MAP`:

```python
DOMAIN_EXCEPTION_STATUS_MAP: dict[type[CricketDomainError], int] = {
    EntityNotFoundError: 404,
    RuleViolationError: 400,
    CreaseViolationError: 400,
    OverProgressionError: 400,
    AuthenticationRequiredError: 401,
    AccessDeniedError: 403,
    EntityConflictError: 409,
}

@app.exception_handler(CricketDomainError)
async def domain_exception_handler(request: Request, exc: CricketDomainError):
    status_code = DOMAIN_EXCEPTION_STATUS_MAP.get(type(exc), 400)
    headers = {}
    if status_code == 401:
        headers["WWW-Authenticate"] = "Bearer"
    return JSONResponse(
        status_code=status_code,
        content={"detail": exc.message},
        headers=headers,
    )
```

---

## 3. Status Code Guide

| Status Code | Meaning | Example Scenario |
|---|---|---|
| **200 OK** | Operation completed successfully | Fetching scorecard, successfully recording delivery, undoing delivery |
| **201 Created** | New resource persisted | Created team, scheduled match, submitted squad |
| **400 Bad Request** | Cricket rule or domain invariant violated | Striker and non-striker are same player; bowler bowled 5th over in T20 |
| **401 Unauthorized** | Missing, invalid, or expired authentication token | Accessing protected endpoint without Bearer token |
| **403 Forbidden** | User lacks required role for the match | User with `viewer` role attempting to score a delivery |
| **404 Not Found** | Requested entity does not exist | `Match with ID 999 not found` |
| **409 Conflict** | Resource uniqueness constraint violated | Username already registered; team already submitted squad for match |
| **422 Unprocessable** | Pydantic payload validation failure | Required field missing; invalid enum string |

---

## 4. Response Payload Schema

All error responses strictly follow the standard shape:
```json
{
  "detail": "Clear, human-readable sentence explaining the error."
}
```
The frontend consumes this uniformly via `getApiErrorMessage(error)` in `frontend/src/lib/api-client.ts`.
