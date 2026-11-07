from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.domain.exceptions import EntityNotFoundError
from app.domain.innings_aggregate import InningsAggregate
from app.models.delivery import Delivery
from app.models.innings import Innings
from app.models.match import Match
from app.repositories.delivery import DeliveryRepository
from app.repositories.innings import InningsRepository
from app.repositories.match import MatchRepository
from app.repositories.player import PlayerRepository
from app.repositories.team import TeamRepository
from app.schemas.enums import ExtraType, InningsStatus, WicketType
from app.schemas.scorecard import (
    BatterScorecard,
    BowlerScorecard,
    DismissalInfo,
    ExtrasBreakdown,
    FallOfWicket,
    InningsScorecard,
    LiveBatter,
    LiveBowler,
    LiveCurrentOverBall,
    LiveMatchResponse,
    MatchScorecardResponse,
    OversRecord,
    Partnership,
    PartnershipBatter,
)


def to_overs_record(legal_balls: int) -> OversRecord:
    """Converts total legal balls to an OversRecord."""
    return OversRecord(
        completed_overs=legal_balls // 6,
        balls=legal_balls % 6,
        total_legal_balls=legal_balls,
    )


class ScorecardService:
    """
    Service responsible for projecting ball-by-ball deliveries into full scorecards
    and live match state.
    Eliminates N+1 database queries through batch player and team lookups.
    """

    def __init__(
        self,
        match_repo: MatchRepository,
        innings_repo: InningsRepository,
        delivery_repo: DeliveryRepository,
        player_repo: PlayerRepository,
        team_repo: TeamRepository,
    ):
        self.match_repo = match_repo
        self.innings_repo = innings_repo
        self.delivery_repo = delivery_repo
        self.player_repo = player_repo
        self.team_repo = team_repo

    async def get_innings_scorecard(self, match_id: int, innings_number: int) -> InningsScorecard:
        """Computes and returns the complete scorecard for a single innings."""
        innings = await self.innings_repo.get_by_match_and_number(match_id, innings_number)
        if not innings:
            raise EntityNotFoundError(f"Innings {innings_number} for Match {match_id} not found")

        match = await self.match_repo.get_by_id(match_id)
        if not match:
            raise EntityNotFoundError(f"Match with ID {match_id} not found")

        teams_map = await self.team_repo.get_by_ids([innings.batting_team_id, innings.bowling_team_id])
        batting_team = teams_map.get(innings.batting_team_id)
        bowling_team = teams_map.get(innings.bowling_team_id)
        deliveries = await self.delivery_repo.list_by_innings(innings.id)

        return await self._build_innings_scorecard(
            innings=innings,
            match=match,
            batting_team_name=batting_team.name if batting_team else "Unknown",
            bowling_team_name=bowling_team.name if bowling_team else "Unknown",
            deliveries=deliveries,
        )

    async def get_match_scorecard(self, match_id: int) -> MatchScorecardResponse:
        """Computes and returns the complete scorecard for the entire match."""
        match = await self.match_repo.get_by_id(match_id)
        if not match:
            raise EntityNotFoundError(f"Match with ID {match_id} not found")

        all_innings = await self.innings_repo.list_by_match(match_id)

        # Collect all team IDs for batch fetching
        team_ids: set[int] = {match.team_a, match.team_b}
        if match.toss_winner:
            team_ids.add(match.toss_winner)
        if match.winner:
            team_ids.add(match.winner)
        for inn in all_innings:
            team_ids.add(inn.batting_team_id)
            team_ids.add(inn.bowling_team_id)

        teams_map = await self.team_repo.get_by_ids(team_ids)
        team_a = teams_map.get(match.team_a)
        team_b = teams_map.get(match.team_b)
        toss_winner = teams_map.get(match.toss_winner) if match.toss_winner else None
        winner = teams_map.get(match.winner) if match.winner else None
        mom = await self.player_repo.get_by_id(match.mom) if match.mom else None

        innings_scorecards = []
        for inn in all_innings:
            bat_team = teams_map.get(inn.batting_team_id)
            bowl_team = teams_map.get(inn.bowling_team_id)
            deliveries = await self.delivery_repo.list_by_innings(inn.id)
            inn_card = await self._build_innings_scorecard(
                innings=inn,
                match=match,
                batting_team_name=bat_team.name if bat_team else "Unknown",
                bowling_team_name=bowl_team.name if bowl_team else "Unknown",
                deliveries=deliveries,
            )
            innings_scorecards.append(inn_card)

        return MatchScorecardResponse(
            match_id=match.id,
            format=match.format,
            status=match.status,
            venue=match.venue,
            match_date=match.match_date,
            team_a_id=match.team_a,
            team_a_name=team_a.name if team_a else "Unknown",
            team_b_id=match.team_b,
            team_b_name=team_b.name if team_b else "Unknown",
            toss_winner_id=match.toss_winner,
            toss_winner_name=toss_winner.name if toss_winner else None,
            toss_decision=match.toss_decision,
            winner_id=match.winner,
            winner_name=winner.name if winner else None,
            mom_id=match.mom,
            mom_name=mom.name if mom else None,
            innings=innings_scorecards,
        )

    async def get_live_match_state(self, match_id: int) -> LiveMatchResponse:
        """Computes the live match ticker snapshot."""
        match = await self.match_repo.get_by_id(match_id)
        if not match:
            raise EntityNotFoundError(f"Match with ID {match_id} not found")

        teams_map = await self.team_repo.get_by_ids([match.team_a, match.team_b])
        team_a = teams_map.get(match.team_a)
        team_b = teams_map.get(match.team_b)

        # Get active innings
        all_innings = await self.innings_repo.list_by_match(match_id)
        active_innings = None
        for inn in all_innings:
            if inn.status == InningsStatus.IN_PROGRESS:
                active_innings = inn
                break
        if not active_innings and all_innings:
            active_innings = all_innings[-1]

        if not active_innings:
            return LiveMatchResponse(
                match_id=match.id,
                status=match.status,
                format=match.format,
                venue=match.venue,
                team_a_name=team_a.name if team_a else "Unknown",
                team_b_name=team_b.name if team_b else "Unknown",
            )

        inn_teams_map = await self.team_repo.get_by_ids(
            [active_innings.batting_team_id, active_innings.bowling_team_id]
        )
        batting_team = inn_teams_map.get(active_innings.batting_team_id)
        bowling_team = inn_teams_map.get(active_innings.bowling_team_id)
        deliveries = await self.delivery_repo.list_by_innings(active_innings.id)

        # Aggregate summary runs, wickets, legal balls
        total_runs = sum(d.runs + d.extras for d in deliveries)
        total_wickets = sum(1 for d in deliveries if d.wicket_type is not None)
        legal_balls = sum(1 for d in deliveries if d.extra_type not in (ExtraType.WIDE, ExtraType.NOBALL))
        overs = to_overs_record(legal_balls)
        crr = round(total_runs / (legal_balls / 6.0), 2) if legal_balls > 0 else 0.0

        runs_needed = None
        balls_remaining = None
        rrr = None
        if active_innings.target:
            runs_needed = max(0, active_innings.target - total_runs)
            max_balls = match.format.max_overs * 6
            balls_remaining = max(0, max_balls - legal_balls)
            if balls_remaining > 0:
                rrr = round(runs_needed / (balls_remaining / 6.0), 2)

        current_over_balls = []
        last_event_runs = None
        last_event_is_wicket = False
        striker = None
        non_striker = None
        current_bowler = None

        if deliveries:
            last_ball = deliveries[-1]
            last_event_runs = last_ball.runs + last_ball.extras
            last_event_is_wicket = last_ball.wicket_type is not None

            # Balls in current over
            current_over_number = last_ball.over
            balls_in_over = [d for d in deliveries if d.over == current_over_number]
            for b in balls_in_over:
                current_over_balls.append(
                    LiveCurrentOverBall(
                        ball_number=b.ball,
                        runs=b.runs,
                        extra_type=b.extra_type,
                        extras=b.extras,
                        is_wicket=b.wicket_type is not None,
                        wicket_type=b.wicket_type,
                    )
                )

            # Reconstruct aggregate to project current active crease state
            aggregate = InningsAggregate.reconstruct(
                innings_id=active_innings.id,
                match_id=match.id,
                match_format=match.format,
                target=active_innings.target,
                deliveries=deliveries,
                status=active_innings.status,
            )
            current_striker_id = aggregate.crease.striker_id
            current_non_striker_id = aggregate.crease.non_striker_id

            # Batch fetch active players
            active_pids = {pid for pid in (current_striker_id, current_non_striker_id, last_ball.bowler_id) if pid is not None}
            players_map = await self.player_repo.get_by_ids(active_pids)
            s_player = players_map.get(current_striker_id) if current_striker_id else None
            ns_player = players_map.get(current_non_striker_id) if current_non_striker_id else None
            bowler_player = players_map.get(last_ball.bowler_id)

            if s_player:
                s_runs = sum(d.runs for d in deliveries if d.batsman_id == s_player.id)
                s_balls = sum(1 for d in deliveries if d.batsman_id == s_player.id and d.extra_type != ExtraType.WIDE)
                s_fours = sum(1 for d in deliveries if d.batsman_id == s_player.id and d.runs == 4)
                s_sixes = sum(1 for d in deliveries if d.batsman_id == s_player.id and d.runs == 6)
                s_sr = round((s_runs / s_balls) * 100, 2) if s_balls > 0 else None
                striker = LiveBatter(
                    player_id=s_player.id,
                    name=s_player.name,
                    runs=s_runs,
                    balls=s_balls,
                    fours=s_fours,
                    sixes=s_sixes,
                    strike_rate=s_sr,
                )

            if ns_player:
                ns_runs = sum(d.runs for d in deliveries if d.batsman_id == ns_player.id)
                ns_balls = sum(1 for d in deliveries if d.batsman_id == ns_player.id and d.extra_type != ExtraType.WIDE)
                ns_fours = sum(1 for d in deliveries if d.batsman_id == ns_player.id and d.runs == 4)
                ns_sixes = sum(1 for d in deliveries if d.batsman_id == ns_player.id and d.runs == 6)
                ns_sr = round((ns_runs / ns_balls) * 100, 2) if ns_balls > 0 else None
                non_striker = LiveBatter(
                    player_id=ns_player.id,
                    name=ns_player.name,
                    runs=ns_runs,
                    balls=ns_balls,
                    fours=ns_fours,
                    sixes=ns_sixes,
                    strike_rate=ns_sr,
                )

            if bowler_player:
                b_deliveries = [d for d in deliveries if d.bowler_id == bowler_player.id]
                b_legal = sum(1 for d in b_deliveries if d.extra_type not in (ExtraType.WIDE, ExtraType.NOBALL))
                b_runs = sum(d.runs + d.extras for d in b_deliveries if d.extra_type not in (ExtraType.BYE, ExtraType.LEGBYE))
                b_wickets = sum(
                    1 for d in b_deliveries
                    if d.wicket_type in (
                        WicketType.BOWLED,
                        WicketType.CAUGHT,
                        WicketType.LBW,
                        WicketType.STUMPED,
                        WicketType.HIT_WICKET,
                    )
                )
                b_econ = round(b_runs / (b_legal / 6.0), 2) if b_legal > 0 else None
                current_bowler = LiveBowler(
                    player_id=bowler_player.id,
                    name=bowler_player.name,
                    overs=to_overs_record(b_legal),
                    maidens=0,
                    runs=b_runs,
                    wickets=b_wickets,
                    economy=b_econ,
                )

        return LiveMatchResponse(
            match_id=match.id,
            status=match.status,
            format=match.format,
            venue=match.venue,
            team_a_name=team_a.name if team_a else "Unknown",
            team_b_name=team_b.name if team_b else "Unknown",
            current_innings_number=active_innings.innings_number,
            batting_team_name=batting_team.name if batting_team else "Unknown",
            bowling_team_name=bowling_team.name if bowling_team else "Unknown",
            runs=total_runs,
            wickets=total_wickets,
            overs=overs,
            current_run_rate=crr,
            target=active_innings.target,
            runs_needed=runs_needed,
            balls_remaining=balls_remaining,
            required_run_rate=rrr,
            striker=striker,
            non_striker=non_striker,
            current_bowler=current_bowler,
            current_over_balls=current_over_balls,
            last_event_runs=last_event_runs,
            last_event_is_wicket=last_event_is_wicket,
        )

    get_live_match = get_live_match_state

    async def _build_innings_scorecard(
        self,
        innings: Innings,
        match: Match,
        batting_team_name: str,
        bowling_team_name: str,
        deliveries: list[Delivery],
    ) -> InningsScorecard:
        """Internal projection algorithm building an InningsScorecard with zero N+1 queries."""
        # 1. Total runs, wickets, overs, extras
        total_runs = sum(d.runs + d.extras for d in deliveries)
        total_wickets = sum(1 for d in deliveries if d.wicket_type is not None)
        legal_balls = sum(1 for d in deliveries if d.extra_type not in (ExtraType.WIDE, ExtraType.NOBALL))
        overs = to_overs_record(legal_balls)
        crr = round(total_runs / (legal_balls / 6.0), 2) if legal_balls > 0 else 0.0

        byes = sum(d.extras for d in deliveries if d.extra_type == ExtraType.BYE)
        leg_byes = sum(d.extras for d in deliveries if d.extra_type == ExtraType.LEGBYE)
        wides = sum(d.extras for d in deliveries if d.extra_type == ExtraType.WIDE)
        no_balls = sum(d.extras for d in deliveries if d.extra_type == ExtraType.NOBALL)
        extras = ExtrasBreakdown(
            byes=byes,
            leg_byes=leg_byes,
            wides=wides,
            no_balls=no_balls,
            total=byes + leg_byes + wides + no_balls,
        )

        # Collect all unique player IDs across all deliveries for batch retrieval
        player_ids: set[int] = set()
        for d in deliveries:
            player_ids.add(d.batsman_id)
            player_ids.add(d.non_striker_id)
            player_ids.add(d.bowler_id)
            if d.player_out_id:
                player_ids.add(d.player_out_id)
            if d.fielder_id:
                player_ids.add(d.fielder_id)
            if getattr(d, "new_batter_id", None):
                player_ids.add(d.new_batter_id)

        # Single batch query for all players
        players_map = await self.player_repo.get_by_ids(player_ids)

        # 2. Batting scorecard
        batting_cards: list[BatterScorecard] = []
        ordered_batter_ids: list[int] = []
        for d in deliveries:
            if d.batsman_id not in ordered_batter_ids:
                ordered_batter_ids.append(d.batsman_id)
            if d.non_striker_id not in ordered_batter_ids:
                ordered_batter_ids.append(d.non_striker_id)
            if getattr(d, "new_batter_id", None) and d.new_batter_id not in ordered_batter_ids:
                ordered_batter_ids.append(d.new_batter_id)

        # Map dismissals
        dismissal_map: dict[int, DismissalInfo] = {}
        for d in deliveries:
            if d.wicket_type is not None and d.player_out_id is not None:
                bowler_p = players_map.get(d.bowler_id)
                fielder_p = players_map.get(d.fielder_id) if d.fielder_id else None
                dismissal_map[d.player_out_id] = DismissalInfo(
                    wicket_type=d.wicket_type,
                    bowler_id=d.bowler_id,
                    bowler_name=bowler_p.name if bowler_p else None,
                    fielder_id=d.fielder_id,
                    fielder_name=fielder_p.name if fielder_p else None,
                )

        for b_id in ordered_batter_ids:
            player = players_map.get(b_id)
            p_name = player.name if player else f"Player {b_id}"
            b_deliveries = [d for d in deliveries if d.batsman_id == b_id]

            runs = sum(d.runs for d in b_deliveries)
            balls = sum(1 for d in b_deliveries if d.extra_type != ExtraType.WIDE)
            fours = sum(1 for d in b_deliveries if d.runs == 4)
            sixes = sum(1 for d in b_deliveries if d.runs == 6)
            sr = round((runs / balls) * 100, 2) if balls > 0 else None

            is_dismissed = b_id in dismissal_map
            batting_cards.append(
                BatterScorecard(
                    player_id=b_id,
                    player_name=p_name,
                    runs=runs,
                    balls=balls,
                    fours=fours,
                    sixes=sixes,
                    strike_rate=sr,
                    is_out=is_dismissed,
                    dismissal=dismissal_map.get(b_id),
                )
            )

        # 3. Bowling scorecard
        bowling_cards: list[BowlerScorecard] = []
        ordered_bowler_ids: list[int] = []
        for d in deliveries:
            if d.bowler_id not in ordered_bowler_ids:
                ordered_bowler_ids.append(d.bowler_id)

        for b_id in ordered_bowler_ids:
            player = players_map.get(b_id)
            p_name = player.name if player else f"Player {b_id}"
            b_deliveries = [d for d in deliveries if d.bowler_id == b_id]

            b_legal = sum(1 for d in b_deliveries if d.extra_type not in (ExtraType.WIDE, ExtraType.NOBALL))
            b_runs = sum(d.runs + d.extras for d in b_deliveries if d.extra_type not in (ExtraType.BYE, ExtraType.LEGBYE))
            b_wides = sum(d.extras for d in b_deliveries if d.extra_type == ExtraType.WIDE)
            b_noballs = sum(d.extras for d in b_deliveries if d.extra_type == ExtraType.NOBALL)
            b_wickets = sum(
                1 for d in b_deliveries
                if d.wicket_type in (
                    WicketType.BOWLED,
                    WicketType.CAUGHT,
                    WicketType.LBW,
                    WicketType.STUMPED,
                    WicketType.HIT_WICKET,
                )
            )

            # Maiden overs calculation
            unique_overs = set(d.over for d in b_deliveries)
            maidens = 0
            for ov in unique_overs:
                ov_deliveries = [d for d in b_deliveries if d.over == ov]
                ov_legal = sum(1 for d in ov_deliveries if d.extra_type not in (ExtraType.WIDE, ExtraType.NOBALL))
                ov_runs = sum(d.runs + d.extras for d in ov_deliveries if d.extra_type not in (ExtraType.BYE, ExtraType.LEGBYE))
                if ov_legal == 6 and ov_runs == 0:
                    maidens += 1

            b_econ = round(b_runs / (b_legal / 6.0), 2) if b_legal > 0 else None
            bowling_cards.append(
                BowlerScorecard(
                    player_id=b_id,
                    player_name=p_name,
                    overs=to_overs_record(b_legal),
                    maidens=maidens,
                    runs=b_runs,
                    wickets=b_wickets,
                    economy=b_econ,
                    wides=b_wides,
                    no_balls=b_noballs,
                )
            )

        # 4. Fall of Wickets
        fall_of_wickets: list[FallOfWicket] = []
        running_score = 0
        running_legal_balls = 0
        w_number = 0
        for d in deliveries:
            running_score += d.runs + d.extras
            if d.extra_type not in (ExtraType.WIDE, ExtraType.NOBALL):
                running_legal_balls += 1
            if d.wicket_type is not None and d.player_out_id is not None:
                w_number += 1
                out_p = players_map.get(d.player_out_id)
                fall_of_wickets.append(
                    FallOfWicket(
                        wicket_number=w_number,
                        player_id=d.player_out_id,
                        player_name=out_p.name if out_p else f"Player {d.player_out_id}",
                        score=running_score,
                        overs=to_overs_record(running_legal_balls),
                    )
                )

        # 5. Partnerships
        partnerships: list[Partnership] = []
        current_p_runs = 0
        current_p_balls = 0
        b1_id: int | None = None
        b2_id: int | None = None
        b1_runs = 0
        b1_balls = 0
        b2_runs = 0
        b2_balls = 0
        p_wicket_number = 0

        for d in deliveries:
            if b1_id is None and b2_id is None:
                b1_id = d.batsman_id
                b2_id = d.non_striker_id
            elif b1_id is None:
                b1_id = d.batsman_id if d.batsman_id != b2_id else d.non_striker_id
            elif b2_id is None:
                b2_id = d.batsman_id if d.batsman_id != b1_id else d.non_striker_id

            current_p_runs += d.runs + d.extras
            is_legal = d.extra_type not in (ExtraType.WIDE, ExtraType.NOBALL)
            if is_legal:
                current_p_balls += 1

            if d.batsman_id == b1_id:
                b1_runs += d.runs
                if d.extra_type != ExtraType.WIDE:
                    b1_balls += 1
            elif d.batsman_id == b2_id:
                b2_runs += d.runs
                if d.extra_type != ExtraType.WIDE:
                    b2_balls += 1

            if d.wicket_type is not None and d.player_out_id is not None:
                p_wicket_number += 1
                p1_name = players_map[b1_id].name if b1_id in players_map else f"Player {b1_id}"
                p2_name = players_map[b2_id].name if b2_id in players_map else f"Player {b2_id}"
                partnerships.append(
                    Partnership(
                        wicket_number=p_wicket_number,
                        runs=current_p_runs,
                        balls=current_p_balls,
                        overs=to_overs_record(current_p_balls),
                        batters=[
                            PartnershipBatter(player_id=b1_id, player_name=p1_name, runs=b1_runs, balls=b1_balls),
                            PartnershipBatter(player_id=b2_id, player_name=p2_name, runs=b2_runs, balls=b2_balls),
                        ],
                    )
                )
                current_p_runs = 0
                current_p_balls = 0
                if d.player_out_id == b1_id:
                    b1_id = None
                    b1_runs = 0
                    b1_balls = 0
                else:
                    b2_id = None
                    b2_runs = 0
                    b2_balls = 0

        # Unbroken partnership at close
        if b1_id is not None and b2_id is not None and (current_p_runs > 0 or current_p_balls > 0):
            p1_name = players_map[b1_id].name if b1_id in players_map else f"Player {b1_id}"
            p2_name = players_map[b2_id].name if b2_id in players_map else f"Player {b2_id}"
            partnerships.append(
                Partnership(
                    wicket_number=p_wicket_number + 1,
                    runs=current_p_runs,
                    balls=current_p_balls,
                    overs=to_overs_record(current_p_balls),
                    batters=[
                        PartnershipBatter(player_id=b1_id, player_name=p1_name, runs=b1_runs, balls=b1_balls),
                        PartnershipBatter(player_id=b2_id, player_name=p2_name, runs=b2_runs, balls=b2_balls),
                    ],
                )
            )

        return InningsScorecard(
            innings_id=innings.id,
            innings_number=innings.innings_number,
            batting_team_id=innings.batting_team_id,
            batting_team_name=batting_team_name,
            bowling_team_id=innings.bowling_team_id,
            bowling_team_name=bowling_team_name,
            status=innings.status,
            runs=total_runs,
            wickets=total_wickets,
            overs=overs,
            current_run_rate=crr,
            extras=extras,
            target=innings.target,
            batting=batting_cards,
            bowling=bowling_cards,
            fall_of_wickets=fall_of_wickets,
            partnerships=partnerships,
        )


async def get_scorecard_service(session: AsyncSession = Depends(get_db)) -> ScorecardService:
    """FastAPI dependency for injecting ScorecardService."""
    match_repo = MatchRepository(session)
    innings_repo = InningsRepository(session)
    delivery_repo = DeliveryRepository(session)
    player_repo = PlayerRepository(session)
    team_repo = TeamRepository(session)
    return ScorecardService(match_repo, innings_repo, delivery_repo, player_repo, team_repo)
