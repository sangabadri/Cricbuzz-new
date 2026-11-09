import pytest
from tests.conftest import AsgiTestClient, sync


@sync
async def test_auth_registration_login_and_me_e2e(test_client: AsgiTestClient):
    # 1. Register User
    reg_resp = await test_client.post(
        "/api/v1/auth/register",
        json={
            "username": "scorer_alice",
            "email": "alice@cricket.org",
            "password": "SecurePassword123!",
        },
    )
    assert reg_resp.status_code == 201, reg_resp.text
    reg_data = reg_resp.json()
    assert reg_data["user"]["username"] == "scorer_alice"
    assert "access_token" in reg_data
    assert "refresh_token" in reg_data
    alice_token = reg_data["access_token"]
    alice_refresh = reg_data["refresh_token"]

    # 2. GET /me with token
    me_resp = await test_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {alice_token}"},
    )
    assert me_resp.status_code == 200
    assert me_resp.json()["username"] == "scorer_alice"

    # 3. GET /me without token -> 401
    unauth_resp = await test_client.get("/api/v1/auth/me")
    assert unauth_resp.status_code == 401

    # 4. Login with correct password
    login_resp = await test_client.post(
        "/api/v1/auth/login",
        json={
            "username": "scorer_alice",
            "password": "SecurePassword123!",
        },
    )
    assert login_resp.status_code == 200
    assert "access_token" in login_resp.json()

    # 5. Login with invalid password -> 400
    bad_login_resp = await test_client.post(
        "/api/v1/auth/login",
        json={
            "username": "scorer_alice",
            "password": "WrongPassword999!",
        },
    )
    assert bad_login_resp.status_code == 400

    # 6. Refresh token
    refresh_resp = await test_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": alice_refresh},
    )
    assert refresh_resp.status_code == 200
    assert "access_token" in refresh_resp.json()
    assert refresh_resp.json()["refresh_token"] != alice_refresh


@sync
async def test_match_access_authorization_guard_e2e(test_client: AsgiTestClient):
    # Register Owner User
    reg_a = await test_client.post(
        "/api/v1/auth/register",
        json={
            "username": "match_owner",
            "email": "owner@cricket.org",
            "password": "Password123!",
        },
    )
    token_a = reg_a.json()["access_token"]

    # Register Scorer User
    reg_b = await test_client.post(
        "/api/v1/auth/register",
        json={
            "username": "guest_scorer",
            "email": "guest@cricket.org",
            "password": "Password123!",
        },
    )
    token_b = reg_b.json()["access_token"]
    user_b_id = reg_b.json()["user"]["id"]

    # Create Teams
    t1 = (await test_client.post("/api/v1/teams/", json={"name": "Team Alpha"})).json()
    t2 = (await test_client.post("/api/v1/teams/", json={"name": "Team Beta"})).json()

    # Owner creates a match
    match_resp = await test_client.post(
        "/api/v1/matches/",
        json={
            "team_a": t1["id"],
            "team_b": t2["id"],
            "venue": "Eden Park",
            "format": "t20",
            "match_date": "2026-11-10T14:00:00Z",
        },
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert match_resp.status_code == 201
    match_id = match_resp.json()["id"]

    # Public Spectator can view match details
    view_resp = await test_client.get(f"/api/v1/matches/{match_id}")
    assert view_resp.status_code == 200

    # Guest Scorer tries to conduct toss without permission -> 403 Forbidden
    unauthorized_toss = await test_client.post(
        f"/api/v1/matches/{match_id}/toss",
        json={"toss_winner": t1["id"], "toss_decision": "bat"},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert unauthorized_toss.status_code == 403

    # Owner delegates scorer access to Guest Scorer
    grant_resp = await test_client.post(
        f"/api/v1/matches/{match_id}/access",
        json={"username": "guest_scorer", "role": "scorer"},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert grant_resp.status_code == 201
    assert grant_resp.json()["username"] == "guest_scorer"
    assert grant_resp.json()["role"] == "scorer"

    # Guest Scorer checks access list
    access_list = await test_client.get(
        f"/api/v1/matches/{match_id}/access",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert access_list.status_code == 200
    assert len(access_list.json()) >= 1

    # Guest Scorer tries to grant access to someone else -> 403 (only owner can grant)
    guest_grant_attempt = await test_client.post(
        f"/api/v1/matches/{match_id}/access",
        json={"username": "match_owner", "role": "scorer"},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert guest_grant_attempt.status_code == 403

    # Owner revokes Guest Scorer's access
    revoke_resp = await test_client.delete(
        f"/api/v1/matches/{match_id}/access/{user_b_id}",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert revoke_resp.status_code == 204

    # Guest Scorer now receives 403 again
    revoked_attempt = await test_client.post(
        f"/api/v1/matches/{match_id}/toss",
        json={"toss_winner": t1["id"], "toss_decision": "bat"},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert revoked_attempt.status_code == 403
