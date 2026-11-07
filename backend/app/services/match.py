from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.domain.exceptions import EntityNotFoundError, RuleViolationError
from app.models.match import Match
from app.repositories.innings import InningsRepository
from app.repositories.match import MatchRepository
from app.repositories.squad import SquadRepository
from app.repositories.team import TeamRepository
from app.schemas.enums import MatchStatus, TossDecision
from app.schemas.innings import InningsCreate
from app.schemas.match import MatchCreate, MatchMOM, MatchToss


class MatchService:
    """
    Business logic layer for Match lifecycle operations.
    Decoupled from HTTP frameworks; raises domain exceptions.
    """

    def __init__(
        self,
        match_repo: MatchRepository,
        team_repo: TeamRepository,
        squad_repo: SquadRepository | None = None,
        innings_repo: InningsRepository | None = None,
    ):
        self.match_repo = match_repo
        self.team_repo = team_repo
        self.squad_repo = squad_repo
        self.innings_repo = innings_repo

    async def create_match(self, match_in: MatchCreate) -> Match:
        """Schedules a new match between two distinct, existing teams."""
        # Rule 1: A team cannot play against itself
        if match_in.team_a == match_in.team_b:
            raise RuleViolationError(
                "A match requires two distinct teams (team_a and team_b cannot be the same)"
            )

        # Rule 2: Both teams must exist in the database
        team_a = await self.team_repo.get_by_id(match_in.team_a)
        if not team_a:
            raise EntityNotFoundError(f"Team with ID {match_in.team_a} does not exist")
        team_b = await self.team_repo.get_by_id(match_in.team_b)
        if not team_b:
            raise EntityNotFoundError(f"Team with ID {match_in.team_b} does not exist")

        return await self.match_repo.create(match_in)

    async def get_match(self, match_id: int) -> Match:
        """Retrieves a match by ID, raising EntityNotFoundError if not found."""
        match = await self.match_repo.get_by_id(match_id)
        if not match:
            raise EntityNotFoundError(f"Match with ID {match_id} not found")
        return match

    async def list_matches(
        self,
        status: MatchStatus | None = None,
        team_id: int | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> list[Match]:
        """Lists matches with optional status and team filtering."""
        return await self.match_repo.list_all(
            status=status, team_id=team_id, limit=limit, offset=offset
        )

    async def conduct_toss(self, match_id: int, toss: MatchToss) -> Match:
        """Conducts the coin toss for a scheduled match and auto-creates Innings 1."""
        match = await self.get_match(match_id)

        # Rule 1: Toss can only be conducted if the match is still scheduled
        if match.status != MatchStatus.SCHEDULED:
            raise RuleViolationError(
                f"Cannot conduct toss. Match is currently in '{match.status.value}' state"
            )

        # Rule 2: Squads for both teams must be submitted before toss
        if self.squad_repo:
            squad_a = await self.squad_repo.get_by_match_and_team(match_id, match.team_a)
            squad_b = await self.squad_repo.get_by_match_and_team(match_id, match.team_b)
            if not squad_a or not squad_b:
                raise RuleViolationError(
                    "Cannot conduct toss. Squads for both teams must be submitted before toss"
                )

        # Rule 3: Toss winner must be one of the participating teams
        if toss.toss_winner not in (match.team_a, match.team_b):
            raise RuleViolationError(
                f"Toss winner (Team ID {toss.toss_winner}) is not playing in this match"
            )

        match.toss_winner = toss.toss_winner
        match.toss_decision = toss.toss_decision
        match.status = MatchStatus.TOSS_DONE

        saved_match = await self.match_repo.save(match)

        # Auto-create Innings 1 based on toss outcome
        if self.innings_repo:
            other_team = match.team_b if toss.toss_winner == match.team_a else match.team_a
            if toss.toss_decision == TossDecision.BAT:
                batting_team_id = toss.toss_winner
                bowling_team_id = other_team
            else:
                batting_team_id = other_team
                bowling_team_id = toss.toss_winner

            existing_inn1 = await self.innings_repo.get_by_match_and_number(match_id, 1)
            if not existing_inn1:
                await self.innings_repo.create(
                    match_id=match_id,
                    innings_in=InningsCreate(
                        innings_number=1,
                        batting_team_id=batting_team_id,
                        bowling_team_id=bowling_team_id,
                        target=None,
                    ),
                )

        return saved_match

    async def abandon_match(self, match_id: int) -> Match:
        """Marks a match as abandoned."""
        match = await self.get_match(match_id)
        if match.status == MatchStatus.COMPLETED:
            raise RuleViolationError("Cannot abandon an already completed match")
        match.status = MatchStatus.ABANDONED
        return await self.match_repo.save(match)

    async def set_man_of_the_match(self, match_id: int, mom_in: MatchMOM) -> Match:
        """Awards Man of the Match to a player and locks match permanently."""
        match = await self.get_match(match_id)
        if match.status != MatchStatus.COMPLETED:
            raise RuleViolationError("Man of the Match can only be awarded after the match has completed")
        match.mom = mom_in.player_id
        return await self.match_repo.save(match)


async def get_match_service(session: AsyncSession = Depends(get_db)) -> MatchService:
    """FastAPI dependency for injecting MatchService."""
    match_repo = MatchRepository(session)
    team_repo = TeamRepository(session)
    squad_repo = SquadRepository(session)
    innings_repo = InningsRepository(session)
    return MatchService(match_repo, team_repo, squad_repo, innings_repo)
