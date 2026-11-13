# Code patterns to copy

Short skeletons based on code that is already in the repo. For the full version open the real file.

## Router (`routers/teams.py`)
```python
router = APIRouter(prefix="/teams", tags=["Teams"])

@router.post("/", response_model=TeamResponse, status_code=status.HTTP_201_CREATED,
             summary="Create a new team")
async def create_team(
    team_in: TeamCreate,
    service: TeamService = Depends(get_team_service),
) -> Team:
    return await service.create_team(team_in)
```
One service call. No rules. Register it in `routers/api.py`.

## Service (`services/squad.py`)
```python
class SquadService:
    def __init__(self, squad_repo: SquadRepository, match_repo: MatchRepository): ...

    async def create_squad(self, match_id: int, squad_in: SquadCreate) -> Squad:
        match = await self.match_repo.get_by_id(match_id)
        if not match:
            raise EntityNotFoundError(f"Match with ID {match_id} not found")
        if squad_in.team_id not in (match.team_a, match.team_b):
            raise RuleViolationError(f"Team {squad_in.team_id} is not playing in Match {match_id}")
        ...
        return await self.squad_repo.create(match_id, squad_in)
```
Check, check, check, then save. Each check has its own clear message. Repositories come in through
the constructor, so tests can pass mocks.

## Repository (`repositories/squad.py`)
```python
class SquadRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_match_and_team(self, match_id: int, team_id: int) -> Squad | None:
        query = select(Squad).where(Squad.match_id == match_id, Squad.team_id == team_id)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()
```
Query and return. `flush` when new ids are needed. Never `commit`.

## Schema (`schemas/squad.py`)
```python
class SquadCreate(BaseModel):          # input
    team_id: int = Field(..., description="ID of the team")
    ...
class SquadResponse(SquadCreate):      # output
    id: int
    match_id: int
    model_config = ConfigDict(from_attributes=True)
```

## Domain (`domain/crease.py`)
Plain class, plain Python, raises `CreaseViolationError`. No framework imports.

## Locking when changing live state (`services/delivery.py`)
```python
match = await self._get_match(match_id, for_update=True)      # 1st
innings = await self._get_innings(match_id, innings_number, for_update=True)   # 2nd
```
Same order every time (decision 0003).

## What a new service method looks like if the old ones are long
Split by purpose, keep names plain:
```python
async def record_delivery(...):
    match, innings = await self._load_for_scoring(match_id, innings_number)
    self._check_can_score(match, innings, delivery_in)
    delivery = self._apply_delivery(innings, delivery_in)
    await self._save_and_update_match(match, innings, delivery)
    return await self._build_scorer_state(match, innings)
```
Each helper is short, named for what it does, and can be tested alone.
