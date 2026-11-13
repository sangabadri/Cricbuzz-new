# Design Plan: Backend Match Access & DI Authorization Consolidation

- Date: 2026-11-13
- Size: Large (`docs/process/03-large-feature.md`)
- Task: Backend Match Access & DI Authorization Consolidation

## 1. What I Understood
`backend/app/api/deps.py` currently breaches architectural boundaries by acting as an ad-hoc query engine and business rules engine: it issues 3 database queries per delivery mutation, accesses private repository attributes (`match_service.match_repo`), fails open on missing/malformed path parameters, and allows match ownership drift between `matches.created_by` and `match_access.role = OWNER`. We will consolidate the 3 database queries into a single index-backed query, extract authorization decisions into `MatchAccessService`, fail closed on route parameter errors, and cleanly decouple `MatchService`.

## 2. What Could Be Affected
- [x] Database tables / columns (query pattern only, no table alters required unless resolving cascade drop)
- [ ] Domain rules (`backend/app/domain`)
- [x] Schemas (`backend/app/schemas/auth.py` or new context dataclass)
- [x] Repositories (`backend/app/repositories/match_access.py`, `backend/app/repositories/match.py`)
- [x] Services (`backend/app/services/match_access.py`, `backend/app/services/match.py`)
- [x] Routers / API shape (`backend/app/api/deps.py`, path parameter parsing)
- [ ] Frontend types
- [ ] Frontend API client / hooks
- [ ] Pages / components
- [x] Tests (`backend/tests/unit/`, `backend/tests/e2e/test_auth_and_access_e2e.py`)
- [ ] Config / Docker / k8s
- [x] Docs (`backend/docs/known-problems.md`)

## 3. Similar Feature Studied
We studied `backend/app/services/match_access.py`, `backend/app/repositories/match_access.py`, and `backend/app/api/deps.py` (lines 136-199).

## 4. Proposed Design

### A. Single Consolidated Query in `MatchAccessRepository`
Add a dedicated method to `MatchAccessRepository`:
```python
from dataclasses import dataclass

@dataclass(frozen=True)
class MatchAuthContext:
    match_exists: bool
    user_role: MatchUserRole | None
    has_access_records: bool

async def get_match_auth_context(
    self, match_id: int, user_id: int | None = None
) -> MatchAuthContext:
    query = (
        select(
            Match.id,
            select(MatchAccess.role)
            .where(MatchAccess.match_id == Match.id, MatchAccess.user_id == user_id)
            .correlate(Match)
            .scalar_subquery()
            .label("user_role"),
            select(func.count(MatchAccess.id) > 0)
            .where(MatchAccess.match_id == Match.id)
            .correlate(Match)
            .scalar_subquery()
            .label("has_access_records"),
        )
        .where(Match.id == match_id)
    )
    result = await self.session.execute(query)
    row = result.first()
    if not row:
        return MatchAuthContext(
            match_exists=False,
            user_role=None,
            has_access_records=False,
        )
    return MatchAuthContext(
        match_exists=True,
        user_role=row[1],
        has_access_records=bool(row[2]),
    )
```

### B. Authorization Business Logic in `MatchAccessService`
Add `authorize_match_access` to `MatchAccessService`:
```python
async def authorize_match_access(
    self,
    match_id: int,
    user: User | None,
    allowed_roles: list[MatchUserRole],
) -> User | None:
    context = await self.match_access_repo.get_match_auth_context(
        match_id=match_id,
        user_id=user.id if user else None,
    )
    if not context.match_exists:
        # Match does not exist; let downstream endpoint return 404
        return user

    # Legacy fixture: no access entries configured
    if not context.has_access_records:
        return user

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required for this match",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Superusers retain full authority
    if user.is_superuser:
        return user

    # Check delegated roles (OWNER inherits all SCORER actions)
    if context.user_role == MatchUserRole.OWNER or context.user_role in allowed_roles:
        return user

    if context.user_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have the required role for this match",
        )

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You do not have permission to modify this match",
    )
```

### C. Clean Dependency Injection in `api/deps.py`
1. Provide a standalone `get_match_repo` in `deps.py`.
2. Update `get_match_access_service` to inject `MatchRepository` cleanly instead of accessing `match_service.match_repo`.
3. Update `require_match_access` to:
   - Extract `match_id` from `request.path_params` (`match_id` or `id`).
   - If missing or unparseable, fail closed with `HTTPException(400, "Invalid match ID")`.
   - Call `await match_access_service.authorize_match_access(...)`.

## 5. Options and Trade-Offs
| Option | Good | Bad |
|---|---|---|
| **A (Correlated Subquery Single Round-Trip)** *(Recommended)* | Exactly 1 DB round-trip; purely index-seek backed; returns cleanly in ~0.5ms; zero layer inversion. | Requires subquery syntax in SQLAlchemy (straightforward). |
| **B (Service-level Sequential Queries)** | Simpler separate queries in service. | Retains the N+1 latency penalty on every scored ball. |

## 6. Is It Too Much or Too Little?
Solves the exact cataloged issues in `backend/docs/known-problems.md` (Items 1.A, 1.B, 1.C, 1.H) cleanly with zero extraneous dependencies.

## 7. Decisions That Need a Human ("Stop and Ask")
- **Ownership source of truth**: Confirm Option A (the `match_access` table with `role = OWNER` is canonical, with `matches.created_by` synced on creation).
- **Fail closed behavior**: Confirm returning HTTP 400 when match path parameter is malformed or missing.

## 8. Build Order
1. Implement `MatchAuthContext` and `get_match_auth_context` in `MatchAccessRepository`. Add repository unit test verifying single-query output.
2. Implement `authorize_match_access` in `MatchAccessService`. Add service unit tests for all permissions/legacy cases.
3. Decouple `deps.py`: add `get_match_repo`, clean up `get_match_access_service`, and rewrite `require_match_access`.
4. Run full backend suite (`pytest -c backend/pytest.ini backend`) and frontend suite.
5. Invoke independent reviewer subagent for adversarial review until `Accept`.
