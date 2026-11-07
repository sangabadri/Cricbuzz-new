from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.domain.exceptions import EntityNotFoundError, RuleViolationError
from app.models.squad import Squad
from app.repositories.match import MatchRepository
from app.repositories.squad import SquadRepository
from app.schemas.squad import SquadCreate


class SquadService:
    """
    Business logic layer for Squad submission and Playing XI validation.
    Decoupled from HTTP frameworks; raises domain exceptions.
    """

    def __init__(self, squad_repo: SquadRepository, match_repo: MatchRepository):
        self.squad_repo = squad_repo
        self.match_repo = match_repo

    async def create_squad(self, match_id: int, squad_in: SquadCreate) -> Squad:
        """Validates cricket squad rules and saves the squad."""
        # 1. Match must exist
        match = await self.match_repo.get_by_id(match_id)
        if not match:
            raise EntityNotFoundError(f"Match with ID {match_id} not found")

        # 2. Team must be playing in this match
        if squad_in.team_id not in (match.team_a, match.team_b):
            raise RuleViolationError(f"Team {squad_in.team_id} is not playing in Match {match_id}")

        # 3. Squad must not already exist for this team in this match
        existing = await self.squad_repo.get_by_match_and_team(match_id, squad_in.team_id)
        if existing:
            raise RuleViolationError(
                f"Squad for Team {squad_in.team_id} in Match {match_id} has already been submitted"
            )

        # 4. Check for duplicate player IDs
        player_ids = [p.player_id for p in squad_in.players]
        if len(player_ids) != len(set(player_ids)):
            raise RuleViolationError("Duplicate players found in squad submission")

        # 5. A player cannot be in both teams for the same match
        other_team_id = match.team_b if squad_in.team_id == match.team_a else match.team_a
        other_squad = await self.squad_repo.get_by_match_and_team(match_id, other_team_id)
        if other_squad:
            other_player_ids = {p.player_id for p in other_squad.players}
            overlapping = set(player_ids).intersection(other_player_ids)
            if overlapping:
                raise RuleViolationError(
                    f"Player(s) {sorted(list(overlapping))} are already registered in the opposing team's squad for Match {match_id}"
                )

        # 6. Exactly 11 players must be in the Playing XI
        playing_xi_ids = {p.player_id for p in squad_in.players if p.is_playing_xi}
        if len(playing_xi_ids) != 11:
            raise RuleViolationError(
                f"Playing XI must contain exactly 11 players. Found {len(playing_xi_ids)}"
            )

        # 6. Captain must be in the Playing XI
        if squad_in.captain_id not in playing_xi_ids:
            raise RuleViolationError(
                f"Captain (Player ID {squad_in.captain_id}) must be in the Playing XI"
            )

        # 7. Wicketkeeper must be in the Playing XI
        if squad_in.wicket_keeper_id not in playing_xi_ids:
            raise RuleViolationError(
                f"Wicketkeeper (Player ID {squad_in.wicket_keeper_id}) must be in the Playing XI"
            )

        return await self.squad_repo.create(match_id, squad_in)

    async def get_squad(self, match_id: int, team_id: int) -> Squad:
        """Retrieves a squad for a match and team."""
        squad = await self.squad_repo.get_by_match_and_team(match_id, team_id)
        if not squad:
            raise EntityNotFoundError(f"Squad for Team {team_id} in Match {match_id} not found")
        return squad


async def get_squad_service(session: AsyncSession = Depends(get_db)) -> SquadService:
    """FastAPI dependency for injecting SquadService."""
    squad_repo = SquadRepository(session)
    match_repo = MatchRepository(session)
    return SquadService(squad_repo, match_repo)
