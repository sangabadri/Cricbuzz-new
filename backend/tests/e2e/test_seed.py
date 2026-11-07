from tests.conftest import sync, AsgiTestClient


@sync
async def test_seed_demo_match(test_client: AsgiTestClient):
    resp = await test_client.post("/api/v1/seed/demo-match")
    assert resp.status_code == 201
    data = resp.json()
    assert "match_id" in data
    assert data["team_a_name"] == "India"
    assert data["team_b_name"] == "Australia"
    assert data["innings_number"] == 1

    # Verify match can be fetched and has enriched team names
    m_resp = await test_client.get(f"/api/v1/matches/{data['match_id']}")
    assert m_resp.status_code == 200
    m_data = m_resp.json()
    assert m_data["team_a_name"] == "India"
    assert m_data["team_b_name"] == "Australia"
    assert m_data["status"] == "live"

    # Verify live scorer state is ready
    scorer_resp = await test_client.get(f"/api/v1/matches/{data['match_id']}/innings/1/scorer-state")
    assert scorer_resp.status_code == 200
    scorer_data = scorer_resp.json()
    assert scorer_data["next_action"] == "NEXT_BALL"
