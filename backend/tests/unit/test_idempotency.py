import pytest
from app.domain.enums import MatchFormat, MatchStatus, InningsStatus
from app.models.delivery import Delivery
from app.models.innings import Innings
from app.models.match import Match
from app.schemas.delivery import DeliveryCreate, LiveScorerStateResponse
from app.services.delivery import DeliveryService
from tests.conftest import (
    InMemoryStore,
    InMemoryMatchRepository,
    InMemoryInningsRepository,
    InMemoryDeliveryRepository,
    InMemorySquadRepository,
    InMemoryIdempotencyRepository,
    sync,
    AsgiTestClient,
)


def _setup_service(store: InMemoryStore) -> tuple[DeliveryService, Match, Innings]:
    match_repo = InMemoryMatchRepository(store)
    innings_repo = InMemoryInningsRepository(store)
    delivery_repo = InMemoryDeliveryRepository(store)
    squad_repo = InMemorySquadRepository(store)
    idempotency_repo = InMemoryIdempotencyRepository(store)

    match = Match(
        id=1,
        team_a=1,
        team_b=2,
        venue="Wankhede",
        format=MatchFormat.T20,
        status=MatchStatus.LIVE,
    )
    store.matches[1] = match

    innings = Innings(
        id=1,
        match_id=1,
        innings_number=1,
        batting_team_id=1,
        bowling_team_id=2,
        status=InningsStatus.IN_PROGRESS,
        current_striker_id=10,
        current_non_striker_id=11,
        current_bowler_id=20,
    )
    store.innings[1] = innings

    service = DeliveryService(
        delivery_repo=delivery_repo,
        innings_repo=innings_repo,
        match_repo=match_repo,
        squad_repo=squad_repo,
        idempotency_repo=idempotency_repo,
    )
    return service, match, innings


@sync
async def test_idempotency_repository_create_and_get():
    store = InMemoryStore()
    repo = InMemoryIdempotencyRepository(store)

    record = await repo.create(
        key="idemp-test-1",
        endpoint="/api/v1/matches/1/innings/1/deliveries",
        status_code=201,
        response_body={"total_runs": 6, "legal_balls": 1},
        user_id=42,
    )
    assert record.key == "idemp-test-1"
    assert record.user_id == 42

    fetched = await repo.get("/api/v1/matches/1/innings/1/deliveries", "idemp-test-1")
    assert fetched is not None
    assert fetched.key == "idemp-test-1"
    assert fetched.response_body["total_runs"] == 6

    missing = await repo.get("/api/v1/matches/1/innings/1/deliveries", "non-existent-key")
    assert missing is None


@sync
async def test_record_delivery_with_idempotency_key_prevents_duplicate_deliveries():
    store = InMemoryStore()
    service, match, innings = _setup_service(store)

    # First attempt: score a boundary (4 runs)
    payload = DeliveryCreate(runs=4)
    res1 = await service.record_delivery(
        match_id=1,
        innings_number=1,
        delivery_in=payload,
        return_state=True,
        idempotency_key="ball-uuid-12345",
        user_id=1,
    )

    assert isinstance(res1, LiveScorerStateResponse)
    assert res1.total_runs == 4
    assert res1.legal_balls == 1
    assert len(store.deliveries) == 1

    # Second attempt (e.g. network retry or button double-tap with same key)
    res2 = await service.record_delivery(
        match_id=1,
        innings_number=1,
        delivery_in=payload,
        return_state=True,
        idempotency_key="ball-uuid-12345",
        user_id=1,
    )

    # Verify: exact same response is returned, and NO second delivery was created in DB!
    assert isinstance(res2, LiveScorerStateResponse)
    assert res2.total_runs == 4
    assert res2.legal_balls == 1
    assert len(store.deliveries) == 1
    assert res1.overs_display == res2.overs_display


@sync
async def test_record_delivery_without_idempotency_key_records_consecutive_balls():
    store = InMemoryStore()
    service, match, innings = _setup_service(store)

    # Call 1 without key: 1 run
    res1 = await service.record_delivery(
        match_id=1,
        innings_number=1,
        delivery_in=DeliveryCreate(runs=1),
        return_state=True,
    )
    assert res1.total_runs == 1
    assert len(store.deliveries) == 1

    # Call 2 without key: another 1 run
    res2 = await service.record_delivery(
        match_id=1,
        innings_number=1,
        delivery_in=DeliveryCreate(runs=1),
        return_state=True,
    )
    assert res2.total_runs == 2
    assert len(store.deliveries) == 2


@sync
async def test_e2e_idempotency_via_http_header(test_client: AsgiTestClient):
    from tests.e2e.test_match_lifecycle_e2e import _setup_standard_match

    # 1. Setup standard match with 2 teams, 22 players, and squads
    setup = await _setup_standard_match(test_client)
    m_id = setup["match"]["id"]
    t1_id = setup["t1"]["id"]

    # Toss
    await test_client.post(f"/api/v1/matches/{m_id}/toss", json={"toss_winner": t1_id, "toss_decision": "bat"})

    # Start Innings 1
    await test_client.post(
        f"/api/v1/matches/{m_id}/innings/1/start",
        json={"striker_id": setup["t1_pids"][0], "non_striker_id": setup["t1_pids"][1], "bowler_id": setup["t2_pids"][10]},
    )

    # 2. First delivery with Idempotency-Key
    headers = {"Idempotency-Key": "test-uuid-client-1234"}
    resp_ball_1 = await test_client.post(
        f"/api/v1/matches/{m_id}/innings/1/deliveries",
        json={"runs": 6},
        headers=headers,
    )
    assert resp_ball_1.status_code == 201
    data_1 = resp_ball_1.json()
    assert data_1["total_runs"] == 6
    assert data_1["legal_balls"] == 1

    # 3. Re-send identical request with same Idempotency-Key
    resp_ball_2 = await test_client.post(
        f"/api/v1/matches/{m_id}/innings/1/deliveries",
        json={"runs": 6},
        headers=headers,
    )
    assert resp_ball_2.status_code == 201
    data_2 = resp_ball_2.json()
    assert data_2["total_runs"] == 6
    assert data_2["legal_balls"] == 1

    # 4. Verify that only 1 delivery exists in deliveries list endpoint
    resp_delivs = await test_client.get(f"/api/v1/matches/{m_id}/innings/1/deliveries")
    assert resp_delivs.status_code == 200
    delivs = resp_delivs.json()
    assert len(delivs) == 1
    assert delivs[0]["runs"] == 6


@sync
async def test_idempotency_key_isolation_across_different_matches():
    """Identical idempotency keys on different matches are strictly isolated and do not collide."""
    store = InMemoryStore()
    service, match_1, innings_1 = _setup_service(store)

    # Setup second match in same store
    match_2 = Match(id=2, team_a=1, team_b=2, venue="Eden Gardens", format=MatchFormat.T20, status=MatchStatus.LIVE)
    innings_2 = Innings(
        id=2, match_id=2, innings_number=1, batting_team_id=1, bowling_team_id=2,
        status=InningsStatus.IN_PROGRESS, current_striker_id=10, current_non_striker_id=11, current_bowler_id=20
    )
    store.matches[2] = match_2
    store.innings[2] = innings_2

    shared_key = "client-counter-1"

    # Match 1 records 4 runs with shared_key
    res1 = await service.record_delivery(
        match_id=1, innings_number=1, delivery_in=DeliveryCreate(runs=4),
        return_state=True, idempotency_key=shared_key
    )
    assert res1.total_runs == 4

    # Match 2 records 6 runs with the exact same shared_key
    res2 = await service.record_delivery(
        match_id=2, innings_number=1, delivery_in=DeliveryCreate(runs=6),
        return_state=True, idempotency_key=shared_key
    )
    # Must NOT return match 1's cached state of 4 runs
    assert res2.total_runs == 6
    assert res2.match_id == 2
