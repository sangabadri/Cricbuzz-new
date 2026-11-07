from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.domain.enums import InningsStatus, MatchStatus, TossDecision
from app.domain.exceptions import EntityNotFoundError, RuleViolationError
from app.models.innings import Innings
from app.repositories.delivery import DeliveryRepository
from app.repositories.innings import InningsRepository
from app.repositories.match import MatchRepository
from app.repositories.squad import SquadRepository
from app.schemas.innings import InningsCreate, StartInningsRequest


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
        squad_repo: SquadRepository | None = None,
    ):
        self.innings_repo = innings_repo
        self.match_repo = match_repo
        self.delivery_repo = delivery_repo
        self.squad_repo = squad_repo

    async def create_innings(
        self,
        match_id: int,
        innings_in: InningsCreate | None = None,
    ) -> Innings:
        """
        [INTERNAL] Validates cricket match rules and creates or idempotently returns an innings.
        Auto-derives innings number, participants, and target from match and toss state.
        Internal service/lifecycle helper; not exposed via the public API router.
        """
        if innings_in is None:
            innings_in = InningsCreate()

        # 1. Match must exist
        match = await self.match_repo.get_by_id(match_id)
        if not match:
            raise EntityNotFoundError(f"Match with ID {match_id} not found")

        # 2. Match toss must be conducted first
        if match.status == MatchStatus.SCHEDULED or match.toss_winner is None or match.toss_decision is None:
            raise RuleViolationError("Cannot start an innings before the toss is conducted")

        match_teams = {match.team_a, match.team_b}

        # 3. Determine target innings number (auto-derive if not provided)
        existing_inn1 = await self.innings_repo.get_by_match_and_number(match_id, 1)
        if innings_in.innings_number is not None:
            target_innings_number = innings_in.innings_number
        else:
            if existing_inn1 is None or existing_inn1.status != InningsStatus.COMPLETED:
                target_innings_number = 1
            else:
                target_innings_number = 2

        # 4. Handle Innings 1
        if target_innings_number == 1:
            other_team = match.team_b if match.toss_winner == match.team_a else match.team_a
            if match.toss_decision == TossDecision.BAT:
                expected_batting = match.toss_winner
                expected_bowling = other_team
            else:
                expected_batting = other_team
                expected_bowling = match.toss_winner

            # Validate input teams if explicitly supplied
            if innings_in.batting_team_id is not None:
                if innings_in.batting_team_id not in match_teams:
                    raise RuleViolationError("Batting team must participate in this match")
                if innings_in.batting_team_id != expected_batting:
                    raise RuleViolationError(
                        f"Toss outcome dictates that Team {expected_batting} bats and Team {expected_bowling} bowls first"
                    )
            if innings_in.bowling_team_id is not None:
                if innings_in.bowling_team_id not in match_teams:
                    raise RuleViolationError("Bowling team must participate in this match")
                if innings_in.bowling_team_id != expected_bowling:
                    raise RuleViolationError(
                        f"Toss outcome dictates that Team {expected_batting} bats and Team {expected_bowling} bowls first"
                    )

            # Idempotency check: if Innings 1 already exists, return it
            if existing_inn1:
                return existing_inn1

            created_innings = await self.innings_repo.create(
                match_id,
                InningsCreate(
                    innings_number=1,
                    batting_team_id=expected_batting,
                    bowling_team_id=expected_bowling,
                    target=None,
                ),
            )

            if match.status == MatchStatus.TOSS_DONE:
                match.status = MatchStatus.LIVE
                await self.match_repo.save(match)

            return created_innings

        # 5. Handle Innings 2
        elif target_innings_number == 2:
            if not existing_inn1:
                raise RuleViolationError("Cannot create Innings 2 before Innings 1 is created")
            if existing_inn1.status != InningsStatus.COMPLETED:
                raise RuleViolationError("Cannot create Innings 2 before Innings 1 is completed")

            expected_batting = existing_inn1.bowling_team_id
            expected_bowling = existing_inn1.batting_team_id

            # Validate input teams if explicitly supplied
            if innings_in.batting_team_id is not None:
                if innings_in.batting_team_id not in match_teams:
                    raise RuleViolationError("Batting team must participate in this match")
                if innings_in.batting_team_id != expected_batting:
                    raise RuleViolationError(
                        f"Innings 2 batting team must be Team {expected_batting} "
                        f"and bowling team must be Team {expected_bowling}"
                    )
            if innings_in.bowling_team_id is not None:
                if innings_in.bowling_team_id not in match_teams:
                    raise RuleViolationError("Bowling team must participate in this match")
                if innings_in.bowling_team_id != expected_bowling:
                    raise RuleViolationError(
                        f"Innings 2 batting team must be Team {expected_batting} "
                        f"and bowling team must be Team {expected_bowling}"
                    )

            # Target auto-calculation
            if self.delivery_repo:
                inn1_deliveries = await self.delivery_repo.list_by_innings(existing_inn1.id)
                inn1_runs = sum(d.runs + d.extras for d in inn1_deliveries)
                derived_target = inn1_runs + 1
            else:
                derived_target = innings_in.target

            target_runs = innings_in.target if innings_in.target is not None else derived_target
            if target_runs is None:
                raise RuleViolationError("Target runs must be set for Innings 2")

            # Idempotency check: if Innings 2 already exists, return it
            existing_inn2 = await self.innings_repo.get_by_match_and_number(match_id, 2)
            if existing_inn2:
                return existing_inn2

            created_innings = await self.innings_repo.create(
                match_id,
                InningsCreate(
                    innings_number=2,
                    batting_team_id=expected_batting,
                    bowling_team_id=expected_bowling,
                    target=target_runs,
                ),
            )

            if match.status == MatchStatus.INNINGS_BREAK:
                match.status = MatchStatus.LIVE
                await self.match_repo.save(match)

            return created_innings

        else:
            # Multi-innings formats (e.g. Test match innings 3 or 4)
            prev_inn = await self.innings_repo.get_by_match_and_number(match_id, target_innings_number - 1)
            if not prev_inn or prev_inn.status != InningsStatus.COMPLETED:
                raise RuleViolationError(f"Cannot create Innings {target_innings_number} before Innings {target_innings_number - 1} is completed")

            existing_inn = await self.innings_repo.get_by_match_and_number(match_id, target_innings_number)
            if existing_inn:
                return existing_inn

            if innings_in.batting_team_id is None or innings_in.bowling_team_id is None:
                raise RuleViolationError("Batting and bowling teams must be provided for Innings > 2")
            if innings_in.batting_team_id not in match_teams or innings_in.bowling_team_id not in match_teams:
                raise RuleViolationError("Batting and bowling teams must both participate in this match")
            if innings_in.batting_team_id == innings_in.bowling_team_id:
                raise RuleViolationError("Batting and bowling teams cannot be the same")

            return await self.innings_repo.create(
                match_id,
                InningsCreate(
                    innings_number=target_innings_number,
                    batting_team_id=innings_in.batting_team_id,
                    bowling_team_id=innings_in.bowling_team_id,
                    target=innings_in.target,
                ),
            )

    async def start_innings(
        self,
        match_id: int,
        innings_number: int,
        start_req: StartInningsRequest,
    ) -> Innings:
        """
        Scorer console entrypoint to start an innings by assigning opening batters and bowler.
        Transitions innings status to IN_PROGRESS and match status to LIVE.
        """
        match = await self.match_repo.get_by_id(match_id)
        if not match:
            raise EntityNotFoundError(f"Match with ID {match_id} not found")

        innings = await self.innings_repo.get_by_match_and_number(match_id, innings_number)
        if not innings:
            raise EntityNotFoundError(f"Innings {innings_number} for Match {match_id} not found")

        if innings.status != InningsStatus.NOT_STARTED:
            raise RuleViolationError(
                f"Cannot start innings {innings_number}: currently in '{innings.status.value}' state"
            )

        if start_req.striker_id == start_req.non_striker_id:
            raise RuleViolationError("Striker and non-striker cannot be the same player")

        if start_req.bowler_id in (start_req.striker_id, start_req.non_striker_id):
            raise RuleViolationError("Bowler cannot be currently batting")

        # Validate players against squad Playing XIs if squads exist
        if self.squad_repo:
            batting_squad = await self.squad_repo.get_by_match_and_team(match_id, innings.batting_team_id)
            if batting_squad and batting_squad.players:
                playing_xi_batters = {p.player_id for p in batting_squad.players if p.is_playing_xi}
                if playing_xi_batters:
                    if start_req.striker_id not in playing_xi_batters:
                        raise RuleViolationError(
                            f"Striker {start_req.striker_id} is not in the batting team's Playing XI"
                        )
                    if start_req.non_striker_id not in playing_xi_batters:
                        raise RuleViolationError(
                            f"Non-striker {start_req.non_striker_id} is not in the batting team's Playing XI"
                        )

            bowling_squad = await self.squad_repo.get_by_match_and_team(match_id, innings.bowling_team_id)
            if bowling_squad and bowling_squad.players:
                playing_xi_bowlers = {p.player_id for p in bowling_squad.players if p.is_playing_xi}
                if playing_xi_bowlers:
                    if start_req.bowler_id not in playing_xi_bowlers:
                        raise RuleViolationError(
                            f"Bowler {start_req.bowler_id} is not in the bowling team's Playing XI"
                        )

        innings.current_striker_id = start_req.striker_id
        innings.current_non_striker_id = start_req.non_striker_id
        innings.current_bowler_id = start_req.bowler_id
        innings.status = InningsStatus.IN_PROGRESS
        saved_innings = await self.innings_repo.save(innings)

        if match.status != MatchStatus.LIVE:
            match.status = MatchStatus.LIVE
            await self.match_repo.save(match)

        return saved_innings

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
    squad_repo = SquadRepository(session)
    return InningsService(innings_repo, match_repo, delivery_repo, squad_repo)
