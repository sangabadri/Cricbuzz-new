# 0004: Domain errors become HTTP answers in one place

- Status: Accepted
- Date: 2026-11-12

## Decision
Services and domain code raise errors from `backend/app/domain/exceptions.py`
(`EntityNotFoundError`, `RuleViolationError`, `CreaseViolationError`, `OverProgressionError`).
They never import `HTTPException`. `backend/app/main.py` has one handler that maps each error type to a
status code (not found -> 404, rule broken -> 400) and returns `{"detail": message}`.

## Results
Good: rules do not know about HTTP. One table of codes.
Watch: a new error type must be added to `DOMAIN_EXCEPTION_STATUS_MAP` and get a test.
The frontend reads `detail` (`getApiErrorMessage`), so keep messages clear to a human.
