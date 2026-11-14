# Backend Coding Conventions & Code Patterns

This document establishes the Python 3.11 coding style, naming rules, file size boundaries, and structural code skeletons to copy when developing in the FastAPI backend.

---

## 1. Code Style & Python 3.11 Standards

1. **Modern Type Hints**: Use built-in generics and union operators (`list[str]`, `dict[str, Any]`, `Player | None`). Do not import `Optional` or `Union` from `typing`.
2. **Strict Async**: All repository and service methods interacting with the database must be asynchronous (`async def ... await ...`).
3. **Pydantic v2**: Use `BaseModel` with `model_config = ConfigDict(from_attributes=True)` on output response schemas.
4. **Size Limits**:
   - Target **under 40 lines** per function. Functions over 80 lines are considered code smells.
   - Target **under 300 lines** per module.
   - Do not make existing long functions longer (see `backend/docs/known-problems.md`).

---

## 2. Reference Code Patterns

### A. Router Pattern (`routers/teams.py`)
```python
router = APIRouter(prefix="/teams", tags=["Teams"])

@router.post(
    "/",
    response_model=TeamResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new team",
)
async def create_team(
    team_in: TeamCreate,
    service: TeamService = Depends(get_team_service),
) -> Team:
    """Reads request, calls ONE service method, returns result."""
    return await service.create_team(team_in)
```

### B. Service Pattern (`services/squad.py`)
```python
class SquadService:
    def __init__(self, squad_repo: SquadRepository, match_repo: MatchRepository):
        self.squad_repo = squad_repo
        self.match_repo = match_repo

    async def create_squad(self, match_id: int, squad_in: SquadCreate) -> Squad:
        # Step 1: Validate existence
        match = await self.match_repo.get_by_id(match_id)
        if not match:
            raise EntityNotFoundError(f"Match with ID {match_id} not found")

        # Step 2: Validate business rules
        if squad_in.team_id not in (match.team_a_id, match.team_b_id):
            raise RuleViolationError(f"Team {squad_in.team_id} is not playing in Match {match_id}")

        # Step 3: Persist via repository
        return await self.squad_repo.create(match_id, squad_in)
```

### C. Repository Pattern (`repositories/squad.py`)
```python
class SquadRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_match_and_team(self, match_id: int, team_id: int) -> Squad | None:
        query = select(Squad).where(Squad.match_id == match_id, Squad.team_id == team_id)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def create(self, match_id: int, squad_in: SquadCreate) -> Squad:
        squad = Squad(match_id=match_id, team_id=squad_in.team_id, ...)
        self.session.add(squad)
        await self.session.flush()
        return squad
```

### D. Dependency Wiring Pattern (`api/deps.py`)
```python
def get_squad_repo(session: AsyncSession = Depends(get_db)) -> SquadRepository:
    return SquadRepository(session)

def get_squad_service(
    squad_repo: SquadRepository = Depends(get_squad_repo),
    match_repo: MatchRepository = Depends(get_match_repo),
) -> SquadService:
    return SquadService(squad_repo=squad_repo, match_repo=match_repo)
```

---

## 3. Function Decomposition Pattern

When refactoring or authoring complex service workflows, split logic by responsibility into small, private helpers:

```python
async def record_delivery(self, match_id: int, innings_number: int, delivery_in: DeliveryCreate):
    match, innings = await self._load_and_lock_scoring_state(match_id, innings_number)
    self._validate_scorer_permissions(match, innings)
    delivery = self._apply_domain_delivery(innings, delivery_in)
    await self._save_delivery_and_update_match(match, innings, delivery)
    return await self._build_scorer_state(match, innings)
```
Each helper is focused, self-documenting, and unit-testable.
