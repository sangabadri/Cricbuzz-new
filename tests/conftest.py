import functools
import json
from collections.abc import Coroutine
from contextlib import asynccontextmanager
from typing import Any, Callable, Iterable
import pytest

from app.main import app
from app.models.delivery import Delivery
from app.models.innings import Innings
from app.models.match import Match
from app.models.player import Player
from app.models.squad import Squad, SquadPlayer
from app.models.team import Team
from app.domain.enums import MatchStatus, InningsStatus, MatchFormat
from app.domain.exceptions import RuleViolationError, EntityNotFoundError
from app.schemas.delivery import DeliveryCreate
from app.schemas.innings import InningsCreate
from app.schemas.match import MatchCreate
from app.schemas.player import PlayerCreate
from app.schemas.squad import SquadCreate
from app.services.delivery import DeliveryService, get_delivery_service
from app.services.innings import InningsService, get_innings_service
from app.services.match import MatchService, get_match_service
from app.services.player import PlayerService, get_player_service
from app.services.scorecard import ScorecardService, get_scorecard_service
from app.services.squad import SquadService, get_squad_service
from app.services.team import TeamService, get_team_service


def sync(async_fn: Callable[..., Coroutine[Any, Any, Any]]) -> Callable[..., Any]:
    """
    Synchronous coroutine runner that steers async functions using coro.send(None).
    Completely eliminates Windows socket deadlocks, threadpool contention,
    and event loop conflicts in sandboxed test environments.
    """
    @functools.wraps(async_fn)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        coro = async_fn(*args, **kwargs)
        val = None
        try:
            while True:
                val = coro.send(val)
        except StopIteration as exc:
            return exc.value
    return wrapper


class AsgiResponse:
    """Lightweight HTTP response representation with status code, headers, and JSON decoding."""
    def __init__(self, status_code: int, headers: dict[str, str], body: bytes):
        self.status_code = status_code
        self.headers = headers
        self.content = body

    def json(self) -> Any:
        if not self.content:
            return None
        return json.loads(self.content.decode("utf-8"))

    @property
    def text(self) -> str:
        return self.content.decode("utf-8")


class AsgiTestClient:
    """
    Direct in-process ASGI test client that executes HTTP requests synchronously
    on the current thread without anyio blocking portals, threads, or socket pairs.
    """
    def __init__(self, app: Any):
        self.app = app

    async def _request(
        self,
        method: str,
        path: str,
        json_data: Any = None,
        params: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
    ) -> AsgiResponse:
        import urllib.parse
        
        query_string = b""
        if params:
            query_string = urllib.parse.urlencode(params).encode("ascii")
            
        body = json.dumps(json_data).encode("utf-8") if json_data is not None else b""
        
        req_headers: list[tuple[bytes, bytes]] = [
            (b"host", b"testserver"),
            (b"content-type", b"application/json"),
            (b"content-length", str(len(body)).encode("ascii")),
        ]
        if headers:
            for k, v in headers.items():
                req_headers.append((k.lower().encode("latin-1"), v.encode("latin-1")))

        scope = {
            "type": "http",
            "http_version": "1.1",
            "method": method.upper(),
            "path": path,
            "raw_path": path.encode("ascii"),
            "query_string": query_string,
            "headers": req_headers,
            "client": ("127.0.0.1", 12345),
            "server": ("testserver", 80),
            "scheme": "http",
            "app": self.app,
        }

        sent_messages: list[dict[str, Any]] = []

        async def receive() -> dict[str, Any]:
            return {"type": "http.request", "body": body, "more_body": False}

        async def send(message: dict[str, Any]) -> None:
            sent_messages.append(message)

        await self.app(scope, receive, send)

        status_code = next(m["status"] for m in sent_messages if m["type"] == "http.response.start")
        raw_headers = next(m.get("headers", []) for m in sent_messages if m["type"] == "http.response.start")
        resp_headers = {k.decode("latin-1"): v.decode("latin-1") for k, v in raw_headers}
        response_body = b"".join(m.get("body", b"") for m in sent_messages if m["type"] == "http.response.body")

        return AsgiResponse(status_code, resp_headers, response_body)

    async def get(self, path: str, params: dict[str, Any] | None = None, **kwargs: Any) -> AsgiResponse:
        return await self._request("GET", path, params=params, **kwargs)

    async def post(self, path: str, json: Any = None, **kwargs: Any) -> AsgiResponse:
        return await self._request("POST", path, json_data=json, **kwargs)

    async def put(self, path: str, json: Any = None, **kwargs: Any) -> AsgiResponse:
        return await self._request("PUT", path, json_data=json, **kwargs)

    async def patch(self, path: str, json: Any = None, **kwargs: Any) -> AsgiResponse:
        return await self._request("PATCH", path, json_data=json, **kwargs)

    async def delete(self, path: str, **kwargs: Any) -> AsgiResponse:
        return await self._request("DELETE", path, **kwargs)


class InMemoryStore:
    """Genuine in-memory state repository storage for fast, isolated test execution."""
    def __init__(self):
        self.teams: dict[int, Team] = {}
        self.players: dict[int, Player] = {}
        self.matches: dict[int, Match] = {}
        self.squads: dict[int, Squad] = {}
        self.squad_players: list[SquadPlayer] = []
        self.innings: dict[int, Innings] = {}
        self.deliveries: dict[int, Delivery] = []
        self._team_seq = 0
        self._player_seq = 0
        self._match_seq = 0
        self._squad_seq = 0
        self._sp_seq = 0
        self._innings_seq = 0
        self._delivery_seq = 0


class InMemoryTeamRepository:
    def __init__(self, store: InMemoryStore):
        self.store = store

    async def create(self, name: str) -> Team:
        for t in self.store.teams.values():
            if t.name.lower() == name.lower():
                raise RuleViolationError(f"Team with name '{name}' already exists")
        self.store._team_seq += 1
        team = Team(id=self.store._team_seq, name=name)
        self.store.teams[team.id] = team
        return team

    async def get_by_id(self, team_id: int) -> Team | None:
        return self.store.teams.get(team_id)

    async def get_by_ids(self, team_ids: Iterable[int]) -> dict[int, Team]:
        return {tid: self.store.teams[tid] for tid in set(team_ids) if tid in self.store.teams}

    async def get_by_name(self, name: str) -> Team | None:
        for t in self.store.teams.values():
            if t.name.lower() == name.lower():
                return t
        return None

    async def list_all(self, limit: int = 20, offset: int = 0, search: str | None = None) -> list[Team]:
        res = list(self.store.teams.values())
        if search:
            res = [t for t in res if search.lower() in t.name.lower()]
        return res[offset : offset + limit]


class InMemoryPlayerRepository:
    def __init__(self, store: InMemoryStore):
        self.store = store

    async def create(self, player_in: PlayerCreate) -> Player:
        self.store._player_seq += 1
        player = Player(
            id=self.store._player_seq,
            name=player_in.name,
            role=player_in.role,
            batting=player_in.batting,
            bowling=player_in.bowling,
        )
        self.store.players[player.id] = player
        return player

    async def get_by_id(self, player_id: int) -> Player | None:
        return self.store.players.get(player_id)

    async def get_by_ids(self, player_ids: Iterable[int]) -> dict[int, Player]:
        return {pid: self.store.players[pid] for pid in set(player_ids) if pid in self.store.players}

    async def list_all(
        self,
        role: Any = None,
        search: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> list[Player]:
        res = list(self.store.players.values())
        if role:
            res = [p for p in res if p.role == role]
        if search:
            res = [p for p in res if search.lower() in p.name.lower()]
        return res[offset : offset + limit]


class InMemoryMatchRepository:
    def __init__(self, store: InMemoryStore):
        self.store = store

    async def create(self, match_in: MatchCreate) -> Match:
        self.store._match_seq += 1
        match = Match(
            id=self.store._match_seq,
            team_a=match_in.team_a,
            team_b=match_in.team_b,
            venue=match_in.venue,
            format=match_in.format,
            match_date=match_in.match_date,
            status=MatchStatus.SCHEDULED,
        )
        self.store.matches[match.id] = match
        return match

    async def get_by_id(self, match_id: int) -> Match | None:
        return self.store.matches.get(match_id)

    async def list_all(
        self,
        status: Any = None,
        team_id: int | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> list[Match]:
        res = list(self.store.matches.values())
        if status:
            res = [m for m in res if m.status == status]
        if team_id:
            res = [m for m in res if m.team_a == team_id or m.team_b == team_id]
        return res[offset : offset + limit]

    async def save(self, match: Match) -> Match:
        self.store.matches[match.id] = match
        return match


class InMemorySquadRepository:
    def __init__(self, store: InMemoryStore):
        self.store = store

    async def create(self, match_id: int, squad_in: SquadCreate) -> Squad:
        self.store._squad_seq += 1
        squad = Squad(
            id=self.store._squad_seq,
            match_id=match_id,
            team_id=squad_in.team_id,
            captain_id=squad_in.captain_id,
            wicket_keeper_id=squad_in.wicket_keeper_id,
        )
        squad.players = []
        for p in squad_in.players:
            self.store._sp_seq += 1
            sp = SquadPlayer(
                id=self.store._sp_seq,
                squad_id=squad.id,
                player_id=p.player_id,
                is_playing_xi=p.is_playing_xi,
            )
            squad.players.append(sp)
            self.store.squad_players.append(sp)
        self.store.squads[squad.id] = squad
        return squad

    async def get_by_match_and_team(self, match_id: int, team_id: int) -> Squad | None:
        for s in self.store.squads.values():
            if s.match_id == match_id and s.team_id == team_id:
                return s
        return None


class InMemoryInningsRepository:
    def __init__(self, store: InMemoryStore):
        self.store = store

    async def create(self, match_id: int, innings_in: InningsCreate) -> Innings:
        self.store._innings_seq += 1
        innings = Innings(
            id=self.store._innings_seq,
            match_id=match_id,
            innings_number=innings_in.innings_number,
            batting_team_id=innings_in.batting_team_id,
            bowling_team_id=innings_in.bowling_team_id,
            status=InningsStatus.NOT_STARTED,
            target=innings_in.target,
        )
        self.store.innings[innings.id] = innings
        return innings

    async def get_by_id(self, innings_id: int) -> Innings | None:
        return self.store.innings.get(innings_id)

    async def get_by_match_and_number(self, match_id: int, innings_number: int) -> Innings | None:
        for inn in self.store.innings.values():
            if inn.match_id == match_id and inn.innings_number == innings_number:
                return inn
        return None

    async def list_by_match(self, match_id: int) -> list[Innings]:
        return [inn for inn in self.store.innings.values() if inn.match_id == match_id]

    async def save(self, innings: Innings) -> Innings:
        self.store.innings[innings.id] = innings
        return innings


class InMemoryDeliveryRepository:
    def __init__(self, store: InMemoryStore):
        self.store = store

    async def create(self, innings_id: int, delivery_in: Any) -> Delivery:
        self.store._delivery_seq += 1
        get = (
            delivery_in.get
            if isinstance(delivery_in, dict)
            else lambda k, default=None: getattr(delivery_in, k, default)
        )
        delivery = Delivery(
            id=self.store._delivery_seq,
            innings_id=innings_id,
            over=get("over"),
            ball=get("ball"),
            bowler_id=get("bowler_id"),
            batsman_id=get("batsman_id"),
            non_striker_id=get("non_striker_id"),
            runs=get("runs", 0),
            extra_type=get("extra_type"),
            extras=get("extras", 0),
            wicket_type=get("wicket_type"),
            player_out_id=get("player_out_id"),
            fielder_id=get("fielder_id"),
            commentary=get("commentary"),
        )
        self.store.deliveries.append(delivery)
        return delivery

    async def list_by_innings(self, innings_id: int) -> list[Delivery]:
        res = [d for d in self.store.deliveries if d.innings_id == innings_id]
        res.sort(key=lambda d: (d.over, d.ball, d.id))
        return list(res)

    async def get_last_delivery(self, innings_id: int) -> Delivery | None:
        deliveries = await self.list_by_innings(innings_id)
        return deliveries[-1] if deliveries else None

    async def delete(self, delivery: Delivery) -> None:
        self.store.deliveries = [d for d in self.store.deliveries if d.id != delivery.id]

    async def save(self, delivery: Delivery) -> Delivery:
        for idx, d in enumerate(self.store.deliveries):
            if d.id == delivery.id:
                self.store.deliveries[idx] = delivery
                break
        return delivery


@pytest.fixture(autouse=True)
def bypass_startup_lifespan():
    """Bypasses PostgreSQL connection during test startup lifespan."""
    @asynccontextmanager
    async def dummy_lifespan(app):
        yield
    app.router.lifespan_context = dummy_lifespan
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def in_memory_store():
    return InMemoryStore()


@pytest.fixture
def test_client(in_memory_store):
    """Provides zero-deadlock AsgiTestClient wired with in-memory persistence and genuine services."""
    team_repo = InMemoryTeamRepository(in_memory_store)
    player_repo = InMemoryPlayerRepository(in_memory_store)
    match_repo = InMemoryMatchRepository(in_memory_store)
    squad_repo = InMemorySquadRepository(in_memory_store)
    innings_repo = InMemoryInningsRepository(in_memory_store)
    delivery_repo = InMemoryDeliveryRepository(in_memory_store)

    team_service = TeamService(team_repo)
    player_service = PlayerService(player_repo)
    match_service = MatchService(match_repo, team_repo, squad_repo, innings_repo)
    squad_service = SquadService(squad_repo, match_repo)
    innings_service = InningsService(innings_repo, match_repo, delivery_repo, squad_repo)
    delivery_service = DeliveryService(delivery_repo, innings_repo, match_repo, squad_repo)
    scorecard_service = ScorecardService(match_repo, innings_repo, delivery_repo, player_repo, team_repo)

    async def _team():
        return team_service

    async def _player():
        return player_service

    async def _match():
        return match_service

    async def _squad():
        return squad_service

    async def _innings():
        return innings_service

    async def _delivery():
        return delivery_service

    async def _scorecard():
        return scorecard_service

    app.dependency_overrides[get_team_service] = _team
    app.dependency_overrides[get_player_service] = _player
    app.dependency_overrides[get_match_service] = _match
    app.dependency_overrides[get_squad_service] = _squad
    app.dependency_overrides[get_innings_service] = _innings
    app.dependency_overrides[get_delivery_service] = _delivery
    app.dependency_overrides[get_scorecard_service] = _scorecard

    return AsgiTestClient(app)


@pytest.fixture
def sample_teams():
    """Provides Team A ('Mumbai Titans') and Team B ('Chennai Super Kings')."""
    return [
        {"name": "Mumbai Titans"},
        {"name": "Chennai Super Kings"},
    ]


@pytest.fixture
def sample_players():
    """Provides 22 distinct players (11 per squad)."""
    players = []
    # Team A: 101-111 (role: batsman, wicketkeeper, all-rounder, bowler)
    for i in range(1, 12):
        role = "batsman" if i <= 5 else ("wicketkeeper" if i == 6 else ("all-rounder" if i <= 8 else "bowler"))
        players.append({"name": f"TeamA_Player_{i}", "role": role, "batting": "right-handed batsman", "bowling": "right-arm fast"})
    # Team B: 201-211
    for i in range(1, 12):
        role = "batsman" if i <= 5 else ("wicketkeeper" if i == 6 else ("all-rounder" if i <= 8 else "bowler"))
        players.append({"name": f"TeamB_Player_{i}", "role": role, "batting": "right-handed batsman", "bowling": "right-arm medium"})
    return players
