# 0002: Async database, one transaction per request

- Status: Accepted
- Date: 2026-11-12

## Situation
The API serves live scoring. Requests should not block each other while waiting for the database.

## Decision
Use async SQLAlchemy (`AsyncSession`) with PostgreSQL. `get_db()` in `backend/app/database.py`
gives each request one session, **commits at the end if all went well, rolls back if an error
was raised**. Repositories use `flush`, not `commit`.

## Results
Good: a failed request leaves no half-saved data.
Costs: all database code must be `async` / `await`. Objects are not expired after commit
(`expire_on_commit=False`), so loading related data must be planned (`selectin` etc.).
Watch: `Base.metadata.create_all` creates missing tables but never changes existing ones.
Changing a column on an existing database needs a manual change or a reset of the dev database.
