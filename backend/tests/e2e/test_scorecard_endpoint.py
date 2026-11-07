from tests.conftest import sync, AsgiTestClient


@sync
async def test_full_scorecard_endpoint(test_client: AsgiTestClient):
    # 1. Seed demo match with teams, players, toss and innings ready
    seed_resp = await test_client.post("/api/v1/seed/demo-match")
    assert seed_resp.status_code == 201
    mid = seed_resp.json()["match_id"]

    # 2. Fetch full scorecard for the match
    sc_resp = await test_client.get(f"/api/v1/matches/{mid}/scorecard")
    assert sc_resp.status_code == 200
    sc_data = sc_resp.json()

    # 3. Verify top-level match metadata
    assert sc_data["match_id"] == mid
    assert sc_data["format"] == "t20"
    assert sc_data["status"] == "live"
    assert sc_data["team_a_name"] == "India"
    assert sc_data["team_b_name"] == "Australia"
    assert sc_data["venue"] == "Wankhede Stadium, Mumbai"
    assert "innings" in sc_data
    assert len(sc_data["innings"]) >= 1

    # 4. Verify Innings 1 scorecard fields
    inn1 = sc_data["innings"][0]
    assert inn1["innings_number"] == 1
    assert inn1["batting_team_name"] == "India"
    assert inn1["bowling_team_name"] == "Australia"
    assert "runs" in inn1
    assert "wickets" in inn1
    assert "overs" in inn1
    assert "extras" in inn1
    assert "batting" in inn1
    assert "bowling" in inn1
    assert "fall_of_wickets" in inn1
    assert "partnerships" in inn1

    # 5. Record a delivery and verify scorecard reflects it
    # Record a boundary 4 by striker (player 1) bowled by bowler (player 12)
    del_resp = await test_client.post(
        f"/api/v1/matches/{mid}/innings/1/deliveries",
        json={"runs": 4, "extra_type": None, "extras": 0},
    )
    assert del_resp.status_code == 201

    # Refetch full scorecard
    sc_resp2 = await test_client.get(f"/api/v1/matches/{mid}/scorecard")
    assert sc_resp2.status_code == 200
    sc_data2 = sc_resp2.json()
    inn1_updated = sc_data2["innings"][0]
    assert inn1_updated["runs"] == 4
    assert inn1_updated["wickets"] == 0
    assert len(inn1_updated["batting"]) >= 1
    assert inn1_updated["batting"][0]["runs"] == 4
    assert inn1_updated["batting"][0]["fours"] == 1
    assert len(inn1_updated["bowling"]) >= 1
    assert inn1_updated["bowling"][0]["runs"] == 4

    # 6. Verify Partnerships serialization and computed aliases
    assert len(inn1_updated["partnerships"]) == 1
    p = inn1_updated["partnerships"][0]
    assert p["runs"] == 4
    assert p["total_runs"] == 4
    assert p["batters"][0]["runs"] == 4
    assert p["batter_1"] is not None
    assert p["batter_1"]["runs"] == 4
    assert p["batter_2"] is not None
    assert p["batter_2"]["runs"] == 0
