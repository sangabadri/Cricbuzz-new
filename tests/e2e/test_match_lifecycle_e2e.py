"""
Comprehensive End-to-End Test Suite for Cricket Scoring Tracker.
Covers 4 Tiers of lifecycle and regression verification across all 8 match phases:
- Tier 1: 30 Feature Coverage test cases covering HTTP API routes.
- Tier 2: 5 Boundary and Corner test cases (illegal sequences, maidens, quota, all-out, target chase).
- Tier 3: 5 Pairwise Combination test cases (strike rotation, illegal dismissal, final ball tie/win, cross-innings restrictions).
- Tier 4: Complete Real-World Match Lifecycle scenario.
"""

import pytest
from app.domain.enums import MatchStatus, InningsStatus, TossDecision, ExtraType, WicketType
from tests.conftest import sync, AsgiTestClient


# ---------------------------------------------------------------------------
# Setup Helper: Registers 2 Teams, 22 Players, 1 Match, and 2 Playing XI Squads
# ---------------------------------------------------------------------------
async def _setup_standard_match(client: AsgiTestClient) -> dict:
    # 1. Create Teams
    resp_t1 = await client.post("/api/v1/teams/", json={"name": "Mumbai Titans"})
    resp_t2 = await client.post("/api/v1/teams/", json={"name": "Chennai Super Kings"})
    t1 = resp_t1.json()
    t2 = resp_t2.json()

    # 2. Register 11 Players for Team 1
    t1_pids = []
    for i in range(1, 12):
        role = "batsman" if i <= 5 else ("wicketkeeper" if i == 6 else ("all-rounder" if i <= 8 else "bowler"))
        r = await client.post(
            "/api/v1/players/",
            json={"name": f"Mum_Player_{i}", "role": role, "batting": "right-handed batsman", "bowling": "right-arm fast"},
        )
        t1_pids.append(r.json()["id"])

    # 3. Register 11 Players for Team 2
    t2_pids = []
    for i in range(1, 12):
        role = "batsman" if i <= 5 else ("wicketkeeper" if i == 6 else ("all-rounder" if i <= 8 else "bowler"))
        r = await client.post(
            "/api/v1/players/",
            json={"name": f"Che_Player_{i}", "role": role, "batting": "right-handed batsman", "bowling": "right-arm medium"},
        )
        t2_pids.append(r.json()["id"])

    # 4. Schedule Match
    resp_match = await client.post(
        "/api/v1/matches/",
        json={
            "team_a": t1["id"],
            "team_b": t2["id"],
            "venue": "Wankhede Stadium",
            "format": "t20",
            "match_date": "2026-11-01T14:00:00Z",
        },
    )
    match_data = resp_match.json()

    # 5. Submit Squads
    await client.post(
        f"/api/v1/matches/{match_data['id']}/squad",
        json={
            "team_id": t1["id"],
            "captain_id": t1_pids[0],
            "wicket_keeper_id": t1_pids[5],
            "players": [{"player_id": pid, "is_playing_xi": True} for pid in t1_pids],
        },
    )
    await client.post(
        f"/api/v1/matches/{match_data['id']}/squad",
        json={
            "team_id": t2["id"],
            "captain_id": t2_pids[0],
            "wicket_keeper_id": t2_pids[5],
            "players": [{"player_id": pid, "is_playing_xi": True} for pid in t2_pids],
        },
    )

    return {
        "t1": t1,
        "t2": t2,
        "t1_pids": t1_pids,
        "t2_pids": t2_pids,
        "match": match_data,
    }


async def _bowl_out_innings_1(test_client: AsgiTestClient, mid: int, setup: dict, initial_runs: int = 0):
    """Bowls out Innings 1 with exactly 10 wickets respecting over progression and bowling changes."""
    if initial_runs > 0:
        await test_client.post(f"/api/v1/matches/{mid}/innings/1/deliveries", json={"runs": initial_runs})
        rem_balls_over0 = 5
    else:
        rem_balls_over0 = 6

    # Dismiss batters in over 0
    for i in range(rem_balls_over0):
        await test_client.post(f"/api/v1/matches/{mid}/innings/1/deliveries", json={"wicket_type": "bowled"})
        await test_client.post(f"/api/v1/matches/{mid}/innings/1/set-incoming-batter", json={"player_id": setup["t1_pids"][i + 2]})

    # Over 0 is complete -> Set bowler for over 1
    await test_client.post(f"/api/v1/matches/{mid}/innings/1/set-bowler", json={"bowler_id": setup["t2_pids"][1]})

    # Dismiss remaining batters in over 1 (total 10 wickets)
    rem_wickets = 10 - rem_balls_over0
    start_pid_idx = rem_balls_over0 + 2
    for j in range(rem_wickets):
        await test_client.post(f"/api/v1/matches/{mid}/innings/1/deliveries", json={"wicket_type": "bowled"})
        if j < rem_wickets - 1:
            await test_client.post(f"/api/v1/matches/{mid}/innings/1/set-incoming-batter", json={"player_id": setup["t1_pids"][start_pid_idx + j]})


# ===========================================================================
# Tier 1: Feature Coverage (30 Test Cases)
# ===========================================================================

@sync
async def test_f1_create_teams(test_client: AsgiTestClient):
    resp = await test_client.post("/api/v1/teams/", json={"name": "Kolkata Riders"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Kolkata Riders"
    assert "id" in data


@sync
async def test_f2_list_and_get_team(test_client: AsgiTestClient):
    await test_client.post("/api/v1/teams/", json={"name": "Delhi Stars"})
    list_resp = await test_client.get("/api/v1/teams/", params={"search": "Delhi"})
    assert list_resp.status_code == 200
    teams = list_resp.json()
    assert len(teams) >= 1
    team_id = teams[0]["id"]
    get_resp = await test_client.get(f"/api/v1/teams/{team_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["name"] == "Delhi Stars"


@sync
async def test_f3_create_players(test_client: AsgiTestClient):
    resp = await test_client.post(
        "/api/v1/players/",
        json={"name": "Virat", "role": "batsman", "batting": "right-handed batsman"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Virat"
    assert data["role"] == "batsman"


@sync
async def test_f4_schedule_match(test_client: AsgiTestClient):
    t1 = (await test_client.post("/api/v1/teams/", json={"name": "Team 1"})).json()
    t2 = (await test_client.post("/api/v1/teams/", json={"name": "Team 2"})).json()
    resp = await test_client.post(
        "/api/v1/matches/",
        json={
            "team_a": t1["id"],
            "team_b": t2["id"],
            "venue": "Eden Gardens",
            "format": "t20",
            "match_date": "2026-11-05T10:00:00Z",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "scheduled"
    assert data["venue"] == "Eden Gardens"


@sync
async def test_f5_submit_playing_xi_squads(test_client: AsgiTestClient):
    setup = await _setup_standard_match(test_client)
    mid = setup["match"]["id"]
    t1_id = setup["t1"]["id"]
    resp = await test_client.get(f"/api/v1/matches/{mid}/squad/{t1_id}")
    assert resp.status_code == 200
    squad_data = resp.json()
    assert len(squad_data["players"]) == 11


@sync
async def test_f6_squad_cross_team_conflict_rejected(test_client: AsgiTestClient):
    t1 = (await test_client.post("/api/v1/teams/", json={"name": "Conflict Team 1"})).json()
    t2 = (await test_client.post("/api/v1/teams/", json={"name": "Conflict Team 2"})).json()
    p1 = (await test_client.post("/api/v1/players/", json={"name": "Shared Player", "role": "batsman", "batting": "right-handed batsman"})).json()
    p_others = []
    for i in range(21):
        p = (await test_client.post("/api/v1/players/", json={"name": f"P_{i}", "role": "batsman", "batting": "right-handed batsman"})).json()
        p_others.append(p["id"])

    m = (await test_client.post(
        "/api/v1/matches/",
        json={"team_a": t1["id"], "team_b": t2["id"], "venue": "MCG", "format": "t20", "match_date": "2026-11-05T10:00:00Z"},
    )).json()

    # Team 1 submits squad containing p1
    await test_client.post(
        f"/api/v1/matches/{m['id']}/squad",
        json={
            "team_id": t1["id"],
            "captain_id": p1["id"],
            "wicket_keeper_id": p_others[0],
            "players": [{"player_id": p1["id"], "is_playing_xi": True}] + [{"player_id": pid, "is_playing_xi": True} for pid in p_others[:10]],
        },
    )

    # Team 2 attempts to submit squad containing p1 as well -> rejected!
    resp = await test_client.post(
        f"/api/v1/matches/{m['id']}/squad",
        json={
            "team_id": t2["id"],
            "captain_id": p_others[10],
            "wicket_keeper_id": p_others[11],
            "players": [{"player_id": p1["id"], "is_playing_xi": True}] + [{"player_id": pid, "is_playing_xi": True} for pid in p_others[10:20]],
        },
    )
    assert resp.status_code == 400
    assert "already registered in the opposing team" in resp.json()["detail"]


@sync
async def test_f7_toss_before_squads_rejected(test_client: AsgiTestClient):
    t1 = (await test_client.post("/api/v1/teams/", json={"name": "NoSquad T1"})).json()
    t2 = (await test_client.post("/api/v1/teams/", json={"name": "NoSquad T2"})).json()
    m = (await test_client.post(
        "/api/v1/matches/",
        json={"team_a": t1["id"], "team_b": t2["id"], "venue": "MCG", "format": "t20", "match_date": "2026-11-05T10:00:00Z"},
    )).json()

    resp = await test_client.post(f"/api/v1/matches/{m['id']}/toss", json={"toss_winner": t1["id"], "toss_decision": "bat"})
    assert resp.status_code == 400
    assert "Squads for both teams must be submitted" in resp.json()["detail"]


@sync
async def test_f8_conduct_toss_bat_first(test_client: AsgiTestClient):
    setup = await _setup_standard_match(test_client)
    mid = setup["match"]["id"]
    t1_id = setup["t1"]["id"]
    resp = await test_client.post(f"/api/v1/matches/{mid}/toss", json={"toss_winner": t1_id, "toss_decision": "bat"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "toss_done"

    # Innings 1 is auto-created with batting=t1
    inn_resp = await test_client.get(f"/api/v1/matches/{mid}/innings/1")
    assert inn_resp.status_code == 200
    assert inn_resp.json()["batting_team_id"] == t1_id
    assert inn_resp.json()["bowling_team_id"] == setup["t2"]["id"]


@sync
async def test_f9_conduct_toss_bowl_first(test_client: AsgiTestClient):
    setup = await _setup_standard_match(test_client)
    mid = setup["match"]["id"]
    t1_id = setup["t1"]["id"]
    resp = await test_client.post(f"/api/v1/matches/{mid}/toss", json={"toss_winner": t1_id, "toss_decision": "bowl"})
    assert resp.status_code == 200

    inn_resp = await test_client.get(f"/api/v1/matches/{mid}/innings/1")
    assert inn_resp.status_code == 200
    # Team 1 elected to bowl, so Team 2 bats first
    assert inn_resp.json()["batting_team_id"] == setup["t2"]["id"]
    assert inn_resp.json()["bowling_team_id"] == t1_id


@sync
async def test_f10_start_innings_openers(test_client: AsgiTestClient):
    setup = await _setup_standard_match(test_client)
    mid = setup["match"]["id"]
    await test_client.post(f"/api/v1/matches/{mid}/toss", json={"toss_winner": setup["t1"]["id"], "toss_decision": "bat"})

    striker = setup["t1_pids"][0]
    non_striker = setup["t1_pids"][1]
    bowler = setup["t2_pids"][0]

    resp = await test_client.post(
        f"/api/v1/matches/{mid}/innings/1/start",
        json={"striker_id": striker, "non_striker_id": non_striker, "bowler_id": bowler},
    )
    assert resp.status_code == 200
    inn_data = resp.json()
    assert inn_data["status"] == "in_progress"
    assert inn_data["current_striker_id"] == striker
    assert inn_data["current_non_striker_id"] == non_striker
    assert inn_data["current_bowler_id"] == bowler


@sync
async def test_f11_start_innings_duplicate_openers_rejected(test_client: AsgiTestClient):
    setup = await _setup_standard_match(test_client)
    mid = setup["match"]["id"]
    await test_client.post(f"/api/v1/matches/{mid}/toss", json={"toss_winner": setup["t1"]["id"], "toss_decision": "bat"})

    striker = setup["t1_pids"][0]
    bowler = setup["t2_pids"][0]

    resp = await test_client.post(
        f"/api/v1/matches/{mid}/innings/1/start",
        json={"striker_id": striker, "non_striker_id": striker, "bowler_id": bowler},
    )
    assert resp.status_code == 400
    assert "cannot be the same player" in resp.json()["detail"]


@sync
async def test_f12_start_innings_bowler_batting_rejected(test_client: AsgiTestClient):
    setup = await _setup_standard_match(test_client)
    mid = setup["match"]["id"]
    await test_client.post(f"/api/v1/matches/{mid}/toss", json={"toss_winner": setup["t1"]["id"], "toss_decision": "bat"})

    striker = setup["t1_pids"][0]
    non_striker = setup["t1_pids"][1]

    # Passing striker as bowler
    resp = await test_client.post(
        f"/api/v1/matches/{mid}/innings/1/start",
        json={"striker_id": striker, "non_striker_id": non_striker, "bowler_id": striker},
    )
    assert resp.status_code == 400
    assert "Bowler cannot be currently batting" in resp.json()["detail"]


@sync
async def test_f13_ball_event_dot_ball(test_client: AsgiTestClient):
    setup = await _setup_standard_match(test_client)
    mid = setup["match"]["id"]
    await test_client.post(f"/api/v1/matches/{mid}/toss", json={"toss_winner": setup["t1"]["id"], "toss_decision": "bat"})
    await test_client.post(
        f"/api/v1/matches/{mid}/innings/1/start",
        json={"striker_id": setup["t1_pids"][0], "non_striker_id": setup["t1_pids"][1], "bowler_id": setup["t2_pids"][0]},
    )

    resp = await test_client.post(f"/api/v1/matches/{mid}/innings/1/deliveries", json={"runs": 0})
    assert resp.status_code == 201
    scorer_state = (await test_client.get(f"/api/v1/matches/{mid}/innings/1/scorer-state")).json()
    assert scorer_state["total_runs"] == 0
    assert scorer_state["legal_balls"] == 1
    assert scorer_state["overs_display"] == "0.1"
    assert scorer_state["striker_id"] == setup["t1_pids"][0]


@sync
async def test_f14_ball_event_single_rotates_strike(test_client: AsgiTestClient):
    setup = await _setup_standard_match(test_client)
    mid = setup["match"]["id"]
    await test_client.post(f"/api/v1/matches/{mid}/toss", json={"toss_winner": setup["t1"]["id"], "toss_decision": "bat"})
    await test_client.post(
        f"/api/v1/matches/{mid}/innings/1/start",
        json={"striker_id": setup["t1_pids"][0], "non_striker_id": setup["t1_pids"][1], "bowler_id": setup["t2_pids"][0]},
    )

    await test_client.post(f"/api/v1/matches/{mid}/innings/1/deliveries", json={"runs": 1})
    scorer_state = (await test_client.get(f"/api/v1/matches/{mid}/innings/1/scorer-state")).json()
    assert scorer_state["total_runs"] == 1
    # Odd run rotates strike to non-striker
    assert scorer_state["striker_id"] == setup["t1_pids"][1]
    assert scorer_state["non_striker_id"] == setup["t1_pids"][0]


@sync
async def test_f15_ball_event_boundary_four_retains_strike(test_client: AsgiTestClient):
    setup = await _setup_standard_match(test_client)
    mid = setup["match"]["id"]
    await test_client.post(f"/api/v1/matches/{mid}/toss", json={"toss_winner": setup["t1"]["id"], "toss_decision": "bat"})
    await test_client.post(
        f"/api/v1/matches/{mid}/innings/1/start",
        json={"striker_id": setup["t1_pids"][0], "non_striker_id": setup["t1_pids"][1], "bowler_id": setup["t2_pids"][0]},
    )

    await test_client.post(f"/api/v1/matches/{mid}/innings/1/deliveries", json={"runs": 4})
    scorer_state = (await test_client.get(f"/api/v1/matches/{mid}/innings/1/scorer-state")).json()
    assert scorer_state["total_runs"] == 4
    assert scorer_state["striker_id"] == setup["t1_pids"][0]


@sync
async def test_f16_ball_event_six_runs(test_client: AsgiTestClient):
    setup = await _setup_standard_match(test_client)
    mid = setup["match"]["id"]
    await test_client.post(f"/api/v1/matches/{mid}/toss", json={"toss_winner": setup["t1"]["id"], "toss_decision": "bat"})
    await test_client.post(
        f"/api/v1/matches/{mid}/innings/1/start",
        json={"striker_id": setup["t1_pids"][0], "non_striker_id": setup["t1_pids"][1], "bowler_id": setup["t2_pids"][0]},
    )

    await test_client.post(f"/api/v1/matches/{mid}/innings/1/deliveries", json={"runs": 6})
    scorer_state = (await test_client.get(f"/api/v1/matches/{mid}/innings/1/scorer-state")).json()
    assert scorer_state["total_runs"] == 6
    assert scorer_state["striker_id"] == setup["t1_pids"][0]


@sync
async def test_f17_manual_strike_swap(test_client: AsgiTestClient):
    setup = await _setup_standard_match(test_client)
    mid = setup["match"]["id"]
    await test_client.post(f"/api/v1/matches/{mid}/toss", json={"toss_winner": setup["t1"]["id"], "toss_decision": "bat"})
    await test_client.post(
        f"/api/v1/matches/{mid}/innings/1/start",
        json={"striker_id": setup["t1_pids"][0], "non_striker_id": setup["t1_pids"][1], "bowler_id": setup["t2_pids"][0]},
    )

    resp = await test_client.post(f"/api/v1/matches/{mid}/innings/1/swap-strike")
    assert resp.status_code == 200
    scorer_state = (await test_client.get(f"/api/v1/matches/{mid}/innings/1/scorer-state")).json()
    assert scorer_state["striker_id"] == setup["t1_pids"][1]
    assert scorer_state["non_striker_id"] == setup["t1_pids"][0]


@sync
async def test_f18_wicket_bowled_auto_derive_striker(test_client: AsgiTestClient):
    setup = await _setup_standard_match(test_client)
    mid = setup["match"]["id"]
    await test_client.post(f"/api/v1/matches/{mid}/toss", json={"toss_winner": setup["t1"]["id"], "toss_decision": "bat"})
    await test_client.post(
        f"/api/v1/matches/{mid}/innings/1/start",
        json={"striker_id": setup["t1_pids"][0], "non_striker_id": setup["t1_pids"][1], "bowler_id": setup["t2_pids"][0]},
    )

    # Scorer records bowled without player_out_id -> auto-derived as striker!
    resp = await test_client.post(f"/api/v1/matches/{mid}/innings/1/deliveries", json={"wicket_type": "bowled"})
    assert resp.status_code == 201

    scorer_state = (await test_client.get(f"/api/v1/matches/{mid}/innings/1/scorer-state")).json()
    assert scorer_state["total_wickets"] == 1
    assert scorer_state["striker_id"] is None
    assert scorer_state["awaiting_new_batter"] is True
    assert scorer_state["next_action"] == "SET_BATTER"


@sync
async def test_f19_wicket_blocks_subsequent_delivery(test_client: AsgiTestClient):
    setup = await _setup_standard_match(test_client)
    mid = setup["match"]["id"]
    await test_client.post(f"/api/v1/matches/{mid}/toss", json={"toss_winner": setup["t1"]["id"], "toss_decision": "bat"})
    await test_client.post(
        f"/api/v1/matches/{mid}/innings/1/start",
        json={"striker_id": setup["t1_pids"][0], "non_striker_id": setup["t1_pids"][1], "bowler_id": setup["t2_pids"][0]},
    )

    await test_client.post(f"/api/v1/matches/{mid}/innings/1/deliveries", json={"wicket_type": "bowled"})
    resp = await test_client.post(f"/api/v1/matches/{mid}/innings/1/deliveries", json={"runs": 1})
    assert resp.status_code == 400
    assert "Must set incoming batter" in resp.json()["detail"]


@sync
async def test_f20_set_incoming_batter_resumes_play(test_client: AsgiTestClient):
    setup = await _setup_standard_match(test_client)
    mid = setup["match"]["id"]
    await test_client.post(f"/api/v1/matches/{mid}/toss", json={"toss_winner": setup["t1"]["id"], "toss_decision": "bat"})
    await test_client.post(
        f"/api/v1/matches/{mid}/innings/1/start",
        json={"striker_id": setup["t1_pids"][0], "non_striker_id": setup["t1_pids"][1], "bowler_id": setup["t2_pids"][0]},
    )

    await test_client.post(f"/api/v1/matches/{mid}/innings/1/deliveries", json={"wicket_type": "bowled"})
    incoming = setup["t1_pids"][2]
    set_resp = await test_client.post(f"/api/v1/matches/{mid}/innings/1/set-incoming-batter", json={"player_id": incoming})
    assert set_resp.status_code == 200

    scorer_state = (await test_client.get(f"/api/v1/matches/{mid}/innings/1/scorer-state")).json()
    assert scorer_state["striker_id"] == incoming
    assert scorer_state["awaiting_new_batter"] is False
    assert scorer_state["next_action"] == "NEXT_BALL"

    # Play can now resume
    d2 = await test_client.post(f"/api/v1/matches/{mid}/innings/1/deliveries", json={"runs": 1})
    assert d2.status_code == 201


@sync
async def test_f21_rebatting_dismissed_batter_rejected(test_client: AsgiTestClient):
    setup = await _setup_standard_match(test_client)
    mid = setup["match"]["id"]
    await test_client.post(f"/api/v1/matches/{mid}/toss", json={"toss_winner": setup["t1"]["id"], "toss_decision": "bat"})
    await test_client.post(
        f"/api/v1/matches/{mid}/innings/1/start",
        json={"striker_id": setup["t1_pids"][0], "non_striker_id": setup["t1_pids"][1], "bowler_id": setup["t2_pids"][0]},
    )

    # Dismiss player 0
    await test_client.post(f"/api/v1/matches/{mid}/innings/1/deliveries", json={"wicket_type": "bowled"})
    # Attempt to re-set player 0 as incoming batter
    resp = await test_client.post(f"/api/v1/matches/{mid}/innings/1/set-incoming-batter", json={"player_id": setup["t1_pids"][0]})
    assert resp.status_code == 400
    assert "already been dismissed" in resp.json()["detail"]


@sync
async def test_f22_wicket_caught_requires_fielder(test_client: AsgiTestClient):
    setup = await _setup_standard_match(test_client)
    mid = setup["match"]["id"]
    await test_client.post(f"/api/v1/matches/{mid}/toss", json={"toss_winner": setup["t1"]["id"], "toss_decision": "bat"})
    await test_client.post(
        f"/api/v1/matches/{mid}/innings/1/start",
        json={"striker_id": setup["t1_pids"][0], "non_striker_id": setup["t1_pids"][1], "bowler_id": setup["t2_pids"][0]},
    )

    resp = await test_client.post(f"/api/v1/matches/{mid}/innings/1/deliveries", json={"wicket_type": "caught", "fielder_id": None})
    assert resp.status_code == 400
    assert "fielder_id is required" in resp.json()["detail"]


@sync
async def test_f23_over_completion_end_of_over_strike_rotation(test_client: AsgiTestClient):
    setup = await _setup_standard_match(test_client)
    mid = setup["match"]["id"]
    await test_client.post(f"/api/v1/matches/{mid}/toss", json={"toss_winner": setup["t1"]["id"], "toss_decision": "bat"})
    await test_client.post(
        f"/api/v1/matches/{mid}/innings/1/start",
        json={"striker_id": setup["t1_pids"][0], "non_striker_id": setup["t1_pids"][1], "bowler_id": setup["t2_pids"][0]},
    )

    # Bowl 6 legal dot balls
    for _ in range(6):
        await test_client.post(f"/api/v1/matches/{mid}/innings/1/deliveries", json={"runs": 0})

    scorer_state = (await test_client.get(f"/api/v1/matches/{mid}/innings/1/scorer-state")).json()
    assert scorer_state["overs_display"] == "1.0"
    assert scorer_state["over_completed"] is True
    assert scorer_state["current_bowler_id"] is None
    assert scorer_state["next_action"] == "SET_BOWLER"
    # Batters swap ends at the end of the over
    assert scorer_state["striker_id"] == setup["t1_pids"][1]
    assert scorer_state["non_striker_id"] == setup["t1_pids"][0]


@sync
async def test_f24_set_new_bowler_for_next_over(test_client: AsgiTestClient):
    setup = await _setup_standard_match(test_client)
    mid = setup["match"]["id"]
    await test_client.post(f"/api/v1/matches/{mid}/toss", json={"toss_winner": setup["t1"]["id"], "toss_decision": "bat"})
    await test_client.post(
        f"/api/v1/matches/{mid}/innings/1/start",
        json={"striker_id": setup["t1_pids"][0], "non_striker_id": setup["t1_pids"][1], "bowler_id": setup["t2_pids"][0]},
    )
    for _ in range(6):
        await test_client.post(f"/api/v1/matches/{mid}/innings/1/deliveries", json={"runs": 0})

    next_bowler = setup["t2_pids"][1]
    resp = await test_client.post(f"/api/v1/matches/{mid}/innings/1/set-bowler", json={"bowler_id": next_bowler})
    assert resp.status_code == 200
    scorer_state = (await test_client.get(f"/api/v1/matches/{mid}/innings/1/scorer-state")).json()
    assert scorer_state["current_bowler_id"] == next_bowler
    assert scorer_state["next_action"] == "NEXT_BALL"


@sync
async def test_f25_consecutive_over_bowler_rejected(test_client: AsgiTestClient):
    setup = await _setup_standard_match(test_client)
    mid = setup["match"]["id"]
    await test_client.post(f"/api/v1/matches/{mid}/toss", json={"toss_winner": setup["t1"]["id"], "toss_decision": "bat"})
    await test_client.post(
        f"/api/v1/matches/{mid}/innings/1/start",
        json={"striker_id": setup["t1_pids"][0], "non_striker_id": setup["t1_pids"][1], "bowler_id": setup["t2_pids"][0]},
    )
    for _ in range(6):
        await test_client.post(f"/api/v1/matches/{mid}/innings/1/deliveries", json={"runs": 0})

    # Bowler 0 just bowled over 0; cannot bowl consecutive over 1
    resp = await test_client.post(f"/api/v1/matches/{mid}/innings/1/set-bowler", json={"bowler_id": setup["t2_pids"][0]})
    assert resp.status_code == 400
    assert "consecutive overs" in resp.json()["detail"]


@sync
async def test_f26_scorer_state_eligible_bowlers_filtering(test_client: AsgiTestClient):
    setup = await _setup_standard_match(test_client)
    mid = setup["match"]["id"]
    await test_client.post(f"/api/v1/matches/{mid}/toss", json={"toss_winner": setup["t1"]["id"], "toss_decision": "bat"})
    await test_client.post(
        f"/api/v1/matches/{mid}/innings/1/start",
        json={"striker_id": setup["t1_pids"][0], "non_striker_id": setup["t1_pids"][1], "bowler_id": setup["t2_pids"][0]},
    )
    for _ in range(6):
        await test_client.post(f"/api/v1/matches/{mid}/innings/1/deliveries", json={"runs": 0})

    scorer_state = (await test_client.get(f"/api/v1/matches/{mid}/innings/1/scorer-state")).json()
    eligible = scorer_state["eligible_bowler_ids"]
    assert setup["t2_pids"][0] not in eligible  # Bowled previous over
    assert setup["t2_pids"][1] in eligible


@sync
async def test_f27_innings_1_completion_triggers_break_and_inn2(test_client: AsgiTestClient):
    setup = await _setup_standard_match(test_client)
    mid = setup["match"]["id"]
    await test_client.post(f"/api/v1/matches/{mid}/toss", json={"toss_winner": setup["t1"]["id"], "toss_decision": "bat"})
    await test_client.post(
        f"/api/v1/matches/{mid}/innings/1/start",
        json={"striker_id": setup["t1_pids"][0], "non_striker_id": setup["t1_pids"][1], "bowler_id": setup["t2_pids"][0]},
    )

    # Dismiss 10 batters respecting over progression
    await _bowl_out_innings_1(test_client, mid, setup, initial_runs=0)

    # Innings 1 is completed
    inn1 = (await test_client.get(f"/api/v1/matches/{mid}/innings/1")).json()
    assert inn1["status"] == "completed"

    # Match status transitions to INNINGS_BREAK
    match_data = (await test_client.get(f"/api/v1/matches/{mid}")).json()
    assert match_data["status"] == "innings_break"

    # Innings 2 is auto-created with reversed teams and target = 1
    inn2 = (await test_client.get(f"/api/v1/matches/{mid}/innings/2")).json()
    assert inn2["batting_team_id"] == setup["t2"]["id"]
    assert inn2["bowling_team_id"] == setup["t1"]["id"]
    assert inn2["target"] == 1


@sync
async def test_f28_innings_2_target_chased_batting_win(test_client: AsgiTestClient):
    setup = await _setup_standard_match(test_client)
    mid = setup["match"]["id"]
    await test_client.post(f"/api/v1/matches/{mid}/toss", json={"toss_winner": setup["t1"]["id"], "toss_decision": "bat"})
    await test_client.post(
        f"/api/v1/matches/{mid}/innings/1/start",
        json={"striker_id": setup["t1_pids"][0], "non_striker_id": setup["t1_pids"][1], "bowler_id": setup["t2_pids"][0]},
    )
    # Bowl 1 run off bat, then dismiss all 10 batters -> Target = 2
    await _bowl_out_innings_1(test_client, mid, setup, initial_runs=1)

    # Start Innings 2: Team 2 batting
    await test_client.post(
        f"/api/v1/matches/{mid}/innings/2/start",
        json={"striker_id": setup["t2_pids"][0], "non_striker_id": setup["t2_pids"][1], "bowler_id": setup["t1_pids"][0]},
    )
    # Hit a 4 off ball 1 -> Target 2 chased!
    await test_client.post(f"/api/v1/matches/{mid}/innings/2/deliveries", json={"runs": 4})

    match_data = (await test_client.get(f"/api/v1/matches/{mid}")).json()
    assert match_data["status"] == "completed"
    assert match_data["winner"] == setup["t2"]["id"]
    assert match_data["win_margin_wickets"] == 10


@sync
async def test_f29_award_man_of_the_match(test_client: AsgiTestClient):
    setup = await _setup_standard_match(test_client)
    mid = setup["match"]["id"]
    await test_client.post(f"/api/v1/matches/{mid}/toss", json={"toss_winner": setup["t1"]["id"], "toss_decision": "bat"})
    await test_client.post(
        f"/api/v1/matches/{mid}/innings/1/start",
        json={"striker_id": setup["t1_pids"][0], "non_striker_id": setup["t1_pids"][1], "bowler_id": setup["t2_pids"][0]},
    )
    await _bowl_out_innings_1(test_client, mid, setup, initial_runs=0)

    await test_client.post(
        f"/api/v1/matches/{mid}/innings/2/start",
        json={"striker_id": setup["t2_pids"][0], "non_striker_id": setup["t2_pids"][1], "bowler_id": setup["t1_pids"][0]},
    )
    await test_client.post(f"/api/v1/matches/{mid}/innings/2/deliveries", json={"runs": 4})

    # Award MoM to Bowler
    resp = await test_client.post(f"/api/v1/matches/{mid}/mom", json={"player_id": setup["t2_pids"][0]})
    assert resp.status_code == 200
    assert resp.json()["mom"] == setup["t2_pids"][0]


@sync
async def test_f30_immutability_checkpoint_locks_modifications(test_client: AsgiTestClient):
    setup = await _setup_standard_match(test_client)
    mid = setup["match"]["id"]
    await test_client.post(f"/api/v1/matches/{mid}/toss", json={"toss_winner": setup["t1"]["id"], "toss_decision": "bat"})
    await test_client.post(
        f"/api/v1/matches/{mid}/innings/1/start",
        json={"striker_id": setup["t1_pids"][0], "non_striker_id": setup["t1_pids"][1], "bowler_id": setup["t2_pids"][0]},
    )
    await _bowl_out_innings_1(test_client, mid, setup, initial_runs=0)

    await test_client.post(
        f"/api/v1/matches/{mid}/innings/2/start",
        json={"striker_id": setup["t2_pids"][0], "non_striker_id": setup["t2_pids"][1], "bowler_id": setup["t1_pids"][0]},
    )
    await test_client.post(f"/api/v1/matches/{mid}/innings/2/deliveries", json={"runs": 4})
    await test_client.post(f"/api/v1/matches/{mid}/mom", json={"player_id": setup["t2_pids"][0]})

    # Attempting to delete delivery in Innings 2 after MOM is awarded -> rejected!
    resp = await test_client.delete(f"/api/v1/matches/{mid}/innings/2/deliveries/last")
    assert resp.status_code == 400
    assert "Man of the Match has already been awarded" in resp.json()["detail"]


@sync
async def test_f31_deleted_and_consolidated_endpoints_status(test_client: AsgiTestClient):
    """Verifies that redundant endpoints are cleanly deleted (404/405) and consolidated on /deliveries."""
    setup = await _setup_standard_match(test_client)
    mid = setup["match"]["id"]
    await test_client.post(f"/api/v1/matches/{mid}/toss", json={"toss_winner": setup["t1"]["id"], "toss_decision": "bat"})

    # 1. POST /matches/{mid}/innings is deleted (Method Not Allowed 405 on collection)
    r_inn = await test_client.post(f"/api/v1/matches/{mid}/innings", json={})
    assert r_inn.status_code == 405

    # 2. POST /matches/{mid}/innings/1/ball-events is deleted (404 Not Found)
    r_be = await test_client.post(f"/api/v1/matches/{mid}/innings/1/ball-events", json={"runs": 1})
    assert r_be.status_code == 404

    # 3. PUT /matches/{mid}/innings/1/deliveries/last is deleted (405 Method Not Allowed)
    r_put = await test_client.put(f"/api/v1/matches/{mid}/innings/1/deliveries/last", json={"runs": 2})
    assert r_put.status_code == 405


# ===========================================================================
# Tier 2: Boundary & Corner Cases (5 Test Cases)
# ===========================================================================

@sync
async def test_boundary_illegal_deliveries_wides_noballs_sequential(test_client: AsgiTestClient):
    setup = await _setup_standard_match(test_client)
    mid = setup["match"]["id"]
    await test_client.post(f"/api/v1/matches/{mid}/toss", json={"toss_winner": setup["t1"]["id"], "toss_decision": "bat"})
    await test_client.post(
        f"/api/v1/matches/{mid}/innings/1/start",
        json={"striker_id": setup["t1_pids"][0], "non_striker_id": setup["t1_pids"][1], "bowler_id": setup["t2_pids"][0]},
    )

    # Ball 1: Wide
    await test_client.post(f"/api/v1/matches/{mid}/innings/1/deliveries", json={"extra_type": "wide", "extras": 1})
    # Ball 2: No-ball
    await test_client.post(f"/api/v1/matches/{mid}/innings/1/deliveries", json={"extra_type": "noball", "extras": 1, "runs": 0})
    # Ball 3: Wide
    await test_client.post(f"/api/v1/matches/{mid}/innings/1/deliveries", json={"extra_type": "wide", "extras": 1})
    # Ball 4: Legal dot ball
    await test_client.post(f"/api/v1/matches/{mid}/innings/1/deliveries", json={"runs": 0})

    scorer_state = (await test_client.get(f"/api/v1/matches/{mid}/innings/1/scorer-state")).json()
    assert scorer_state["total_runs"] == 3
    assert scorer_state["legal_balls"] == 1
    assert scorer_state["overs_display"] == "0.1"


@sync
async def test_boundary_maiden_over_scoring_and_stats(test_client: AsgiTestClient):
    setup = await _setup_standard_match(test_client)
    mid = setup["match"]["id"]
    await test_client.post(f"/api/v1/matches/{mid}/toss", json={"toss_winner": setup["t1"]["id"], "toss_decision": "bat"})
    await test_client.post(
        f"/api/v1/matches/{mid}/innings/1/start",
        json={"striker_id": setup["t1_pids"][0], "non_striker_id": setup["t1_pids"][1], "bowler_id": setup["t2_pids"][0]},
    )

    for _ in range(6):
        await test_client.post(f"/api/v1/matches/{mid}/innings/1/deliveries", json={"runs": 0})

    scorer_state = (await test_client.get(f"/api/v1/matches/{mid}/innings/1/scorer-state")).json()
    assert scorer_state["total_runs"] == 0
    assert scorer_state["legal_balls"] == 6
    assert scorer_state["overs_display"] == "1.0"
    assert scorer_state["over_completed"] is True


@sync
async def test_boundary_maximum_bowler_quota_t20_limit(test_client: AsgiTestClient):
    setup = await _setup_standard_match(test_client)
    mid = setup["match"]["id"]
    await test_client.post(f"/api/v1/matches/{mid}/toss", json={"toss_winner": setup["t1"]["id"], "toss_decision": "bat"})
    await test_client.post(
        f"/api/v1/matches/{mid}/innings/1/start",
        json={"striker_id": setup["t1_pids"][0], "non_striker_id": setup["t1_pids"][1], "bowler_id": setup["t2_pids"][0]},
    )

    b0 = setup["t2_pids"][0]
    b1 = setup["t2_pids"][1]

    # Bowler b0 bowls Over 0, 2, 4, 6 (total 4 overs in T20)
    for over_num in range(8):
        if over_num > 0:
            bowler = b0 if over_num % 2 == 0 else b1
            await test_client.post(f"/api/v1/matches/{mid}/innings/1/set-bowler", json={"bowler_id": bowler})
        for _ in range(6):
            await test_client.post(f"/api/v1/matches/{mid}/innings/1/deliveries", json={"runs": 0})

    # At over 8, b0 has bowled 4 overs (max quota). Attempting to assign b0 again -> rejected!
    resp = await test_client.post(f"/api/v1/matches/{mid}/innings/1/set-bowler", json={"bowler_id": b0})
    assert resp.status_code == 400
    assert "maximum quota" in resp.json()["detail"]


@sync
async def test_boundary_all_out_at_10_wickets_terminal(test_client: AsgiTestClient):
    setup = await _setup_standard_match(test_client)
    mid = setup["match"]["id"]
    await test_client.post(f"/api/v1/matches/{mid}/toss", json={"toss_winner": setup["t1"]["id"], "toss_decision": "bat"})
    await test_client.post(
        f"/api/v1/matches/{mid}/innings/1/start",
        json={"striker_id": setup["t1_pids"][0], "non_striker_id": setup["t1_pids"][1], "bowler_id": setup["t2_pids"][0]},
    )

    await _bowl_out_innings_1(test_client, mid, setup, initial_runs=0)

    # Cannot bowl after innings is all out
    resp = await test_client.post(f"/api/v1/matches/{mid}/innings/1/deliveries", json={"runs": 1})
    assert resp.status_code == 400
    assert "already completed" in resp.json()["detail"]


@sync
async def test_boundary_target_chase_exact_and_overshoot(test_client: AsgiTestClient):
    setup = await _setup_standard_match(test_client)
    mid = setup["match"]["id"]
    await test_client.post(f"/api/v1/matches/{mid}/toss", json={"toss_winner": setup["t1"]["id"], "toss_decision": "bat"})
    await test_client.post(
        f"/api/v1/matches/{mid}/innings/1/start",
        json={"striker_id": setup["t1_pids"][0], "non_striker_id": setup["t1_pids"][1], "bowler_id": setup["t2_pids"][0]},
    )
    # Score 5 runs, then all out -> Target = 6
    await _bowl_out_innings_1(test_client, mid, setup, initial_runs=5)

    # Start Innings 2: Target is 6. Score a 6 -> Target surpassed!
    await test_client.post(
        f"/api/v1/matches/{mid}/innings/2/start",
        json={"striker_id": setup["t2_pids"][0], "non_striker_id": setup["t2_pids"][1], "bowler_id": setup["t1_pids"][0]},
    )
    await test_client.post(f"/api/v1/matches/{mid}/innings/2/deliveries", json={"runs": 6})

    scorer_state = (await test_client.get(f"/api/v1/matches/{mid}/innings/2/scorer-state")).json()
    assert scorer_state["match_status"] == "completed"
    assert scorer_state["runs_needed"] == 0
    assert scorer_state["next_action"] == "MATCH_COMPLETED"


# ===========================================================================
# Tier 3: Pairwise Combinations (5 Test Cases)
# ===========================================================================

@sync
async def test_pairwise_strike_rotation_on_odd_extras_byes_legbyes(test_client: AsgiTestClient):
    setup = await _setup_standard_match(test_client)
    mid = setup["match"]["id"]
    await test_client.post(f"/api/v1/matches/{mid}/toss", json={"toss_winner": setup["t1"]["id"], "toss_decision": "bat"})
    await test_client.post(
        f"/api/v1/matches/{mid}/innings/1/start",
        json={"striker_id": setup["t1_pids"][0], "non_striker_id": setup["t1_pids"][1], "bowler_id": setup["t2_pids"][0]},
    )

    # 1. 1 Bye -> physical run, odd, strike rotates!
    await test_client.post(f"/api/v1/matches/{mid}/innings/1/deliveries", json={"extra_type": "bye", "extras": 1})
    st1 = (await test_client.get(f"/api/v1/matches/{mid}/innings/1/scorer-state")).json()
    assert st1["striker_id"] == setup["t1_pids"][1]

    # 2. 2 Leg-byes -> physical runs, even, strike retained!
    await test_client.post(f"/api/v1/matches/{mid}/innings/1/deliveries", json={"extra_type": "leg-bye", "extras": 2})
    st2 = (await test_client.get(f"/api/v1/matches/{mid}/innings/1/scorer-state")).json()
    assert st2["striker_id"] == setup["t1_pids"][1]

    # 3. 1 Wide -> penalty extra, no running, strike retained!
    await test_client.post(f"/api/v1/matches/{mid}/innings/1/deliveries", json={"extra_type": "wide", "extras": 1})
    st3 = (await test_client.get(f"/api/v1/matches/{mid}/innings/1/scorer-state")).json()
    assert st3["striker_id"] == setup["t1_pids"][1]


@sync
async def test_pairwise_wicket_on_illegal_delivery(test_client: AsgiTestClient):
    setup = await _setup_standard_match(test_client)
    mid = setup["match"]["id"]
    await test_client.post(f"/api/v1/matches/{mid}/toss", json={"toss_winner": setup["t1"]["id"], "toss_decision": "bat"})
    await test_client.post(
        f"/api/v1/matches/{mid}/innings/1/start",
        json={"striker_id": setup["t1_pids"][0], "non_striker_id": setup["t1_pids"][1], "bowler_id": setup["t2_pids"][0]},
    )

    # Run out on a wide (non-striker run out)
    resp = await test_client.post(
        f"/api/v1/matches/{mid}/innings/1/deliveries",
        json={"extra_type": "wide", "extras": 1, "wicket_type": "run_out", "player_out_id": setup["t1_pids"][1]},
    )
    assert resp.status_code == 201
    st = (await test_client.get(f"/api/v1/matches/{mid}/innings/1/scorer-state")).json()
    assert st["total_wickets"] == 1
    assert st["legal_balls"] == 0  # Wide is not legal
    assert st["non_striker_id"] is None
    assert st["awaiting_new_batter"] is True


@sync
async def test_pairwise_target_reached_on_final_legal_delivery(test_client: AsgiTestClient):
    setup = await _setup_standard_match(test_client)
    mid = setup["match"]["id"]
    await test_client.post(f"/api/v1/matches/{mid}/toss", json={"toss_winner": setup["t1"]["id"], "toss_decision": "bat"})
    await test_client.post(
        f"/api/v1/matches/{mid}/innings/1/start",
        json={"striker_id": setup["t1_pids"][0], "non_striker_id": setup["t1_pids"][1], "bowler_id": setup["t2_pids"][0]},
    )
    # Score 2 runs, then all out -> Target = 3
    await _bowl_out_innings_1(test_client, mid, setup, initial_runs=2)

    # Innings 2: Target is 3.
    # Bowl all 20 overs (120 legal balls) rotating 5 legal bowlers within quota.
    # Balls 1 & 2 score 1 run each (total = 2). Balls 3-119 are dot balls.
    # Ball 120 scores 4 runs -> total = 6 (reaches target 3 on ball 120).
    bowlers = [setup["t1_pids"][i % 5] for i in range(20)]

    await test_client.post(
        f"/api/v1/matches/{mid}/innings/2/start",
        json={"striker_id": setup["t2_pids"][0], "non_striker_id": setup["t2_pids"][1], "bowler_id": bowlers[0]},
    )
    # Over 0: Ball 1 (1 run), Ball 2 (1 run), Balls 3-6 (0 runs)
    await test_client.post(f"/api/v1/matches/{mid}/innings/2/deliveries", json={"runs": 1})
    await test_client.post(f"/api/v1/matches/{mid}/innings/2/deliveries", json={"runs": 1})
    for _ in range(4):
        await test_client.post(f"/api/v1/matches/{mid}/innings/2/deliveries", json={"runs": 0})

    # Overs 1 through 18: each 6 dot balls
    for over_idx in range(1, 19):
        await test_client.post(f"/api/v1/matches/{mid}/innings/2/set-bowler", json={"bowler_id": bowlers[over_idx]})
        for _ in range(6):
            await test_client.post(f"/api/v1/matches/{mid}/innings/2/deliveries", json={"runs": 0})

    # Over 19 (20th over): 5 dot balls, then ball 120 hits a boundary 4 to win
    await test_client.post(f"/api/v1/matches/{mid}/innings/2/set-bowler", json={"bowler_id": bowlers[19]})
    for _ in range(5):
        await test_client.post(f"/api/v1/matches/{mid}/innings/2/deliveries", json={"runs": 0})

    # Ball 120 (over 19, ball 6)
    resp_last_ball = await test_client.post(f"/api/v1/matches/{mid}/innings/2/deliveries", json={"runs": 4})
    assert resp_last_ball.status_code == 201

    match_data = (await test_client.get(f"/api/v1/matches/{mid}")).json()
    assert match_data["status"] == "completed"
    assert match_data["winner"] == setup["t2"]["id"]

    # Verify live scorer state on final ball match completion
    scorer_state = (await test_client.get(f"/api/v1/matches/{mid}/innings/2/scorer-state")).json()
    assert scorer_state["match_status"] == "completed"
    assert scorer_state["innings_status"] == "completed"
    assert scorer_state["legal_balls"] == 120
    assert scorer_state["overs_display"] == "20.0"
    assert scorer_state["total_runs"] == 6
    assert scorer_state["target"] == 3
    assert scorer_state["match_winner"] == setup["t2"]["id"]
    assert scorer_state["win_margin_wickets"] == 10
    assert scorer_state["win_margin_runs"] is None
    assert scorer_state["next_action"] == "MATCH_COMPLETED"
    assert len(scorer_state["current_over_balls"]) == 6
    assert scorer_state["current_over_balls"][-1] == "4"


@sync
async def test_pairwise_consecutive_over_bowler_prohibition_across_innings_and_breaks(test_client: AsgiTestClient):
    setup = await _setup_standard_match(test_client)
    mid = setup["match"]["id"]
    await test_client.post(f"/api/v1/matches/{mid}/toss", json={"toss_winner": setup["t1"]["id"], "toss_decision": "bat"})
    await test_client.post(
        f"/api/v1/matches/{mid}/innings/1/start",
        json={"striker_id": setup["t1_pids"][0], "non_striker_id": setup["t1_pids"][1], "bowler_id": setup["t2_pids"][0]},
    )
    await _bowl_out_innings_1(test_client, mid, setup, initial_runs=0)

    # Bowler in Innings 2 is from Team 1. Even if Bowler ID matched Bowler from Innings 1,
    # consecutive over rule is strictly scoped to the bowling team within an innings.
    resp = await test_client.post(
        f"/api/v1/matches/{mid}/innings/2/start",
        json={"striker_id": setup["t2_pids"][0], "non_striker_id": setup["t2_pids"][1], "bowler_id": setup["t1_pids"][0]},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "in_progress"


@sync
async def test_pairwise_wicket_on_last_ball_of_over(test_client: AsgiTestClient):
    setup = await _setup_standard_match(test_client)
    mid = setup["match"]["id"]
    await test_client.post(f"/api/v1/matches/{mid}/toss", json={"toss_winner": setup["t1"]["id"], "toss_decision": "bat"})
    await test_client.post(
        f"/api/v1/matches/{mid}/innings/1/start",
        json={"striker_id": setup["t1_pids"][0], "non_striker_id": setup["t1_pids"][1], "bowler_id": setup["t2_pids"][0]},
    )

    # 5 dot balls
    for _ in range(5):
        await test_client.post(f"/api/v1/matches/{mid}/innings/1/deliveries", json={"runs": 0})

    # Ball 6: Wicket! (both over complete AND wicket fell)
    await test_client.post(f"/api/v1/matches/{mid}/innings/1/deliveries", json={"wicket_type": "bowled"})

    st = (await test_client.get(f"/api/v1/matches/{mid}/innings/1/scorer-state")).json()
    assert st["overs_display"] == "1.0"
    assert st["over_completed"] is True
    assert st["awaiting_new_batter"] is True
    assert st["current_bowler_id"] is None
    # Priority is to set batter first
    assert st["next_action"] == "SET_BATTER"

    # Set batter
    await test_client.post(f"/api/v1/matches/{mid}/innings/1/set-incoming-batter", json={"player_id": setup["t1_pids"][2]})
    st2 = (await test_client.get(f"/api/v1/matches/{mid}/innings/1/scorer-state")).json()
    assert st2["awaiting_new_batter"] is False
    assert st2["next_action"] == "SET_BOWLER"


# ===========================================================================
# Tier 4: Real-World Match Lifecycle Scenario
# ===========================================================================

@sync
async def test_real_world_complete_match_lifecycle_e2e(test_client: AsgiTestClient):
    # 1. Pre-Match Setup
    setup = await _setup_standard_match(test_client)
    mid = setup["match"]["id"]
    t1_id = setup["t1"]["id"]
    t2_id = setup["t2"]["id"]

    # 2. Toss
    toss_resp = await test_client.post(f"/api/v1/matches/{mid}/toss", json={"toss_winner": t1_id, "toss_decision": "bat"})
    assert toss_resp.status_code == 200

    # 3. Start Innings 1
    start_resp = await test_client.post(
        f"/api/v1/matches/{mid}/innings/1/start",
        json={"striker_id": setup["t1_pids"][0], "non_striker_id": setup["t1_pids"][1], "bowler_id": setup["t2_pids"][0]},
    )
    assert start_resp.status_code == 200

    # 4. Score Over 0: 6 balls -> 1, 4, 0, 2, 1, 0 = 8 runs
    over0_runs = [1, 4, 0, 2, 1, 0]
    for r in over0_runs:
        await test_client.post(f"/api/v1/matches/{mid}/innings/1/deliveries", json={"runs": r})

    # Over 0 completed -> Set bowler for Over 1
    await test_client.post(f"/api/v1/matches/{mid}/innings/1/set-bowler", json={"bowler_id": setup["t2_pids"][1]})

    # In Over 1: 6 wickets fall
    for i in range(6):
        await test_client.post(f"/api/v1/matches/{mid}/innings/1/deliveries", json={"wicket_type": "bowled"})
        await test_client.post(f"/api/v1/matches/{mid}/innings/1/set-incoming-batter", json={"player_id": setup["t1_pids"][i + 2]})

    # Over 1 completed -> Set bowler for Over 2
    await test_client.post(f"/api/v1/matches/{mid}/innings/1/set-bowler", json={"bowler_id": setup["t2_pids"][0]})

    # In Over 2: remaining 4 wickets fall (total 10 wickets)
    for j in range(4):
        await test_client.post(f"/api/v1/matches/{mid}/innings/1/deliveries", json={"wicket_type": "bowled"})
        if j < 3:
            await test_client.post(f"/api/v1/matches/{mid}/innings/1/set-incoming-batter", json={"player_id": setup["t1_pids"][8 + j]})

    # Innings 1 completed
    inn1 = (await test_client.get(f"/api/v1/matches/{mid}/innings/1")).json()
    assert inn1["status"] == "completed"

    # Innings 2 auto-created
    inn2 = (await test_client.get(f"/api/v1/matches/{mid}/innings/2")).json()
    assert inn2["target"] == 9  # 8 runs + 1

    # 5. Start Innings 2
    await test_client.post(
        f"/api/v1/matches/{mid}/innings/2/start",
        json={"striker_id": setup["t2_pids"][0], "non_striker_id": setup["t2_pids"][1], "bowler_id": setup["t1_pids"][0]},
    )

    # Team 2 chases down target: 4, 6 = 10 runs >= 9
    await test_client.post(f"/api/v1/matches/{mid}/innings/2/deliveries", json={"runs": 4})
    await test_client.post(f"/api/v1/matches/{mid}/innings/2/deliveries", json={"runs": 6})

    # 6. Match Conclusion
    m_final = (await test_client.get(f"/api/v1/matches/{mid}")).json()
    assert m_final["status"] == "completed"
    assert m_final["winner"] == t2_id
    assert m_final["win_margin_wickets"] == 10

    # 7. Award Man of the Match
    mom_resp = await test_client.post(f"/api/v1/matches/{mid}/mom", json={"player_id": setup["t2_pids"][1]})
    assert mom_resp.status_code == 200
    assert mom_resp.json()["mom"] == setup["t2_pids"][1]

    # 8. Scorecard check
    sc_resp = await test_client.get(f"/api/v1/matches/{mid}/scorecard")
    assert sc_resp.status_code == 200
    sc_data = sc_resp.json()
    assert sc_data["winner_id"] == t2_id
    assert sc_data["mom_id"] == setup["t2_pids"][1]
