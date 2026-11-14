# Database Transactions, Concurrency & Consistency

This document describes transaction boundaries, row-level locking orders, concurrency control, and data consistency models in the FastAPI backend.

---

## 1. Single Transaction Per Request (`get_db()` in `app/database.py`)

Cricbuzz Tracker enforces a strict **one transaction per request** policy formalized in [ADR-0002](../../../docs/decisions/0002-async-database.md):

```python
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
```

### Invariants:
1. **Automatic Atomic Commit**: If the endpoint handler completes without raising an unhandled exception, `session.commit()` executes automatically.
2. **Automatic Clean Rollback**: If any exception is raised (such as a domain rule violation), `session.rollback()` executes, guaranteeing that no partial state or orphan rows are saved to PostgreSQL.
3. **Flush in Repositories**: Repositories use `await session.flush()` when database-generated primary keys (IDs) or database defaults are needed. Repositories must **never** call `await session.commit()`.

---

## 2. Deterministic Row-Locking Order in Live Scoring (ADR-0003)

Live scoring involves high write concurrency: multiple scorers or rapid sequential ball entries can target the same innings simultaneously.

To prevent PostgreSQL deadlocks, all operations modifying match or innings state must acquire row-level locks (`SELECT ... FOR UPDATE`) in this **exact, invariant order**:

```
                       +-----------------------------------+
                       | 1. LOCK MATCH                     |
                       |    SELECT * FROM matches          |
                       |    WHERE id = :match_id           |
                       |    FOR UPDATE;                    |
                       +-----------------+-----------------+
                                         |
                                         v
                       +-----------------------------------+
                       | 2. LOCK INNINGS                   |
                       |    SELECT * FROM innings          |
                       |    WHERE id = :innings_id         |
                       |    FOR UPDATE;                    |
                       +-----------------------------------+
```

### Reference Implementation (`backend/app/services/delivery.py`):
```python
# Step 1: Lock the match first
match = await self.match_repo.get_by_id(match_id, for_update=True)
if not match:
    raise EntityNotFoundError(f"Match with ID {match_id} not found")

# Step 2: Lock the innings second
innings = await self.innings_repo.get_by_id(innings_id, for_update=True)
if not innings:
    raise EntityNotFoundError(f"Innings with ID {innings_id} not found")
```

### Why This Order is Mandatory:
If Transaction A locks Match 1 and waits for Innings 1, while Transaction B locks Innings 1 and waits for Match 1, a cyclic wait (deadlock) occurs. Locking in the deterministic sequence (`Match -> Innings`) guarantees that concurrent requests queue sequentially without deadlocking.

---

## 3. Session Configuration & `expire_on_commit=False`

The async engine in `app/database.py` is configured with:
```python
async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)
```
Setting `expire_on_commit=False` prevents SQLAlchemy from expiring attributes after a commit or flush. This allows services to safely access model properties without triggering lazy-load IO errors outside an active query context.
