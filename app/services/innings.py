from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.domain.exceptions import EntityNotFoundError, RuleViolationError
from app.models.innings import Innings
from app.repositories.delivery import DeliveryRepository
from app.repositories.innings import InningsRepository
from app.repositories.match import MatchRepository
from app.schemas.enums import InningsStatus, MatchStatus, TossDecision
from app.schemas.innings import InningsCreate


class InningsService:
    """
    Business logic layer for Innings lifecycle management.
    Connects toss decisions to batting order and auto-calculates Innings 2 chase targets.
    Decoupled from HTTP frameworks; raises domain exceptions.
    """

    def __init__(
        self,
        innings_repo: InningsRepository,
        match_repo: MatchRepository,
        delivery_repo: DeliveryRepository | None = None,
    ):
        self.innings_repo = innings_repo
        self.match_repo = match_repo
        self.delivery_repo = delivery_repo

    async def create_innings(self, match_id: int, innings_in: InningsCreate) -> Innings:
        """Validates cricket match rules and creates an innings."""
        # 1. Match must exist
        match = await self.match_repo.get_by_id(match_id)
        if not match:
            raise EntityNotFoundError(f"Match with ID {match_id} not found")

        # 2. Match toss must be conducted first
        if match.status == MatchStatus.SCHEDULED:
            raise RuleViolationError("Cannot start an innings before the toss is conducted")

        # 3. Teams must participate in this match and be distinct
        match_teams = {match.team_a, match.team_b}
        if innings_in.batting_team_id not in match_teams or innings_in.bowling_team_id not in match_teams:
            raise RuleViolationError("Batting and bowling teams must both participate in this match")
        if innings_in.batting_team_id == innings_in.bowling_team_id:
            raise RuleViolationError("Batting and bowling teams cannot be the same")

        # 4. Check if this innings already exists
        existing = await self.innings_repo.get_by_match_and_number(match_id, innings_in.innings_number)
        if existing:
            raise RuleViolationError(f"Innings {innings_in.innings_number} for Match {match_id} already exists")

        # 5. Connect toss decision to batting team in Innings 1
        if innings_in.innings_number == 1 and match.toss_winner and match.toss_decision:
            if match.toss_decision == TossDecision.BAT:
                expected_batting = match.toss_winner
                expected_bowling = match.team_b if match.toss_winner == match.team_a else match.team_a
            else:
                expected_bowling = match.toss_winner
                expected_batting = match.team_b if match.toss_winner == match.team_a else match.team_a

            if (
                innings_in.batting_team_id != expected_batting
                or innings_in.bowling_team_id != expected_bowling
            ):
                raise RuleViolationError(
                    f"Toss outcome dictates that Team {expected_batting} bats and Team {expected_bowling} bowls first"
                )

        # 6. Innings 2 validation and target auto-calculation
        if innings_in.innings_number == 2:
            innings_1 = await self.innings_repo.get_by_match_and_number(match_id, 1)
            if not innings_1:
                raise RuleViolationError("Cannot create Innings 2 before Innings 1 is created")
            if innings_1.status != InningsStatus.COMPLETED:
                raise RuleViolationError("Cannot create Innings 2 before Innings 1 is completed")

            # Roles must reverse
            if (
                innings_in.batting_team_id != innings_1.bowling_team_id
                or innings_in.bowling_team_id != innings_1.batting_team_id
            ):
                raise RuleViolationError(
                    f"Innings 2 batting team must be Team {innings_1.bowling_team_id} "
                    f"and bowling team must be Team {innings_1.batting_team_id}"
                )

            # Auto-calculate target if deliveries repo is available
            if self.delivery_repo:
                inn1_deliveries = await self.delivery_repo.list_by_innings(innings_1.id)
                inn1_runs = sum(d.runs + d.extras for d in inn1_deliveries)
                innings_in.target = inn1_runs + 1
            elif innings_in.target is None:
                raise RuleViolationError("Target runs must be set for Innings 2")

        # Create innings
        created_innings = await self.innings_repo.create(match_id, innings_in)

        # Update match status to LIVE if it wasn't already
        if match.status in (MatchStatus.TOSS_DONE, MatchStatus.INNINGS_BREAK):
            match.status = MatchStatus.LIVE
            await self.match_repo.save(match)

        return created_innings

    async def get_innings(self, match_id: int, innings_number: int) -> Innings:
        """Retrieves a specific innings by match ID and innings number."""
        innings = await self.innings_repo.get_by_match_and_number(match_id, innings_number)
        if not innings:
            raise EntityNotFoundError(f"Innings {innings_number} for Match {match_id} not found")
        return innings

    async def list_match_innings(self, match_id: int) -> list[Innings]:
        """Lists all innings for a match."""
        return await self.innings_repo.list_by_match(match_id)


async def get_innings_service(session: AsyncSession = Depends(get_db)) -> InningsService:
    """FastAPI dependency injecting InningsService."""
    innings_repo = InningsRepository(session)
    match_repo = MatchRepository(session)
    delivery_repo = DeliveryRepository(session)
    return InningsService(innings_repo, match_repo, delivery_repo)
