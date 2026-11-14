"""
Demo Seed Service: Isolates procedural demo match generation from API routers.
Scaffolds sample teams, players, and an active live match ready for instant scoring.
"""

from datetime import datetime, timezone
from pydantic import BaseModel

from app.domain.enums import BattingStyle, BowlingStyle, MatchFormat, Role, TossDecision
from app.schemas.innings import StartInningsRequest
from app.schemas.match import MatchCreate, MatchToss
from app.schemas.player import PlayerCreate
from app.schemas.squad import SquadCreate, SquadPlayerItem
from app.schemas.team import TeamCreate
from app.services.innings import InningsService
from app.services.match import MatchService
from app.services.player import PlayerService
from app.services.squad import SquadService
from app.services.team import TeamService


class SeedResponse(BaseModel):
    message: str
    match_id: int
    team_a_id: int
    team_a_name: str
    team_b_id: int
    team_b_name: str
    innings_number: int


INDIA_PLAYERS = [
    ("Rohit Sharma", Role.BATSMAN, BattingStyle.RIGHT_HANDED, BowlingStyle.RIGHT_ARM_SPIN),
    ("Shubman Gill", Role.BATSMAN, BattingStyle.RIGHT_HANDED, BowlingStyle.RIGHT_ARM_SPIN),
    ("Virat Kohli", Role.BATSMAN, BattingStyle.RIGHT_HANDED, BowlingStyle.RIGHT_ARM_MEDIUM),
    ("Suryakumar Yadav", Role.BATSMAN, BattingStyle.RIGHT_HANDED, BowlingStyle.RIGHT_ARM_SPIN),
    ("KL Rahul", Role.WICKETKEEPER, BattingStyle.RIGHT_HANDED, None),
    ("Hardik Pandya", Role.ALLROUNDER, BattingStyle.RIGHT_HANDED, BowlingStyle.RIGHT_ARM_FAST),
    ("Ravindra Jadeja", Role.ALLROUNDER, BattingStyle.LEFT_HANDED, BowlingStyle.LEFT_ARM_SPIN),
    ("Axar Patel", Role.ALLROUNDER, BattingStyle.LEFT_HANDED, BowlingStyle.LEFT_ARM_SPIN),
    ("Kuldeep Yadav", Role.BOWLER, BattingStyle.LEFT_HANDED, BowlingStyle.LEFT_ARM_SPIN),
    ("Jasprit Bumrah", Role.BOWLER, BattingStyle.RIGHT_HANDED, BowlingStyle.RIGHT_ARM_FAST),
    ("Mohammed Siraj", Role.BOWLER, BattingStyle.RIGHT_HANDED, BowlingStyle.RIGHT_ARM_FAST),
]

AUS_PLAYERS = [
    ("Travis Head", Role.BATSMAN, BattingStyle.LEFT_HANDED, BowlingStyle.RIGHT_ARM_SPIN),
    ("David Warner", Role.BATSMAN, BattingStyle.LEFT_HANDED, BowlingStyle.RIGHT_ARM_SPIN),
    ("Mitchell Marsh", Role.ALLROUNDER, BattingStyle.RIGHT_HANDED, BowlingStyle.RIGHT_ARM_FAST),
    ("Steven Smith", Role.BATSMAN, BattingStyle.RIGHT_HANDED, BowlingStyle.RIGHT_ARM_SPIN),
    ("Glenn Maxwell", Role.ALLROUNDER, BattingStyle.RIGHT_HANDED, BowlingStyle.RIGHT_ARM_SPIN),
    ("Marcus Stoinis", Role.ALLROUNDER, BattingStyle.RIGHT_HANDED, BowlingStyle.RIGHT_ARM_MEDIUM),
    ("Alex Carey", Role.WICKETKEEPER, BattingStyle.LEFT_HANDED, None),
    ("Pat Cummins", Role.BOWLER, BattingStyle.RIGHT_HANDED, BowlingStyle.RIGHT_ARM_FAST),
    ("Mitchell Starc", Role.BOWLER, BattingStyle.LEFT_HANDED, BowlingStyle.LEFT_ARM_FAST),
    ("Adam Zampa", Role.BOWLER, BattingStyle.RIGHT_HANDED, BowlingStyle.RIGHT_ARM_SPIN),
    ("Josh Hazlewood", Role.BOWLER, BattingStyle.RIGHT_HANDED, BowlingStyle.RIGHT_ARM_FAST),
]


class DemoSeedService:
    """Service encapsulating procedural generation of ready-to-score demo matches."""

    def __init__(
        self,
        team_svc: TeamService,
        player_svc: PlayerService,
        match_svc: MatchService,
        squad_svc: SquadService,
        inn_svc: InningsService,
    ):
        self.team_svc = team_svc
        self.player_svc = player_svc
        self.match_svc = match_svc
        self.squad_svc = squad_svc
        self.inn_svc = inn_svc

    async def seed_demo_match(self) -> SeedResponse:
        """Seeds teams, players, squads, toss outcome, and initiates Innings 1 for a demo match."""
        # 1. Create or fetch Team A (India)
        existing_t1 = await self.team_svc.list_teams(search="India", limit=1)
        if existing_t1:
            t1 = existing_t1[0]
        else:
            t1 = await self.team_svc.create_team(TeamCreate(name="India"))

        # 2. Create or fetch Team B (Australia)
        existing_t2 = await self.team_svc.list_teams(search="Australia", limit=1)
        if existing_t2:
            t2 = existing_t2[0]
        else:
            t2 = await self.team_svc.create_team(TeamCreate(name="Australia"))

        # 3. Create or fetch India players
        t1_pids = []
        for name, role, bat, bowl in INDIA_PLAYERS:
            existing = await self.player_svc.list_players(search=name, limit=1)
            if existing:
                p = existing[0]
            else:
                p = await self.player_svc.create_player(PlayerCreate(name=name, role=role, batting=bat, bowling=bowl))
            t1_pids.append(p.id)

        # 4. Create or fetch Australia players
        t2_pids = []
        for name, role, bat, bowl in AUS_PLAYERS:
            existing = await self.player_svc.list_players(search=name, limit=1)
            if existing:
                p = existing[0]
            else:
                p = await self.player_svc.create_player(PlayerCreate(name=name, role=role, batting=bat, bowling=bowl))
            t2_pids.append(p.id)

        # 5. Schedule Match
        match = await self.match_svc.create_match(
            MatchCreate(
                team_a=t1.id,
                team_b=t2.id,
                venue="Wankhede Stadium, Mumbai",
                format=MatchFormat.T20,
                match_date=datetime.now(timezone.utc),
            )
        )

        # 6. Submit Squads
        # India squad: captain Rohit (index 0), keeper KL Rahul (index 4)
        await self.squad_svc.create_squad(
            match.id,
            SquadCreate(
                team_id=t1.id,
                captain_id=t1_pids[0],
                wicket_keeper_id=t1_pids[4],
                players=[SquadPlayerItem(player_id=pid, is_playing_xi=True) for pid in t1_pids[:11]],
            ),
        )

        # Australia squad: captain Cummins (index 7), keeper Carey (index 6)
        await self.squad_svc.create_squad(
            match.id,
            SquadCreate(
                team_id=t2.id,
                captain_id=t2_pids[7],
                wicket_keeper_id=t2_pids[6],
                players=[SquadPlayerItem(player_id=pid, is_playing_xi=True) for pid in t2_pids[:11]],
            ),
        )

        # 7. Conduct Toss (India won and elected to bat)
        await self.match_svc.conduct_toss(
            match.id,
            MatchToss(toss_winner=t1.id, toss_decision=TossDecision.BAT),
        )

        # 8. Start Innings 1 (Rohit & Gill opening, Starc bowling)
        await self.inn_svc.start_innings(
            match.id,
            1,
            StartInningsRequest(
                striker_id=t1_pids[0],      # Rohit
                non_striker_id=t1_pids[1],  # Gill
                bowler_id=t2_pids[8],       # Starc
            ),
        )

        return SeedResponse(
            message="Demo match created and ready for scoring!",
            match_id=match.id,
            team_a_id=t1.id,
            team_a_name=t1.name,
            team_b_id=t2.id,
            team_b_name=t2.name,
            innings_number=1,
        )
