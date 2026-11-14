import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi import HTTPException
from app.api.deps import require_match_owner, require_match_access
from app.models.match import Match
from app.models.user import User
from tests.conftest import sync


def make_request(path_params: dict):
    request = MagicMock()
    request.path_params = path_params
    return request


@sync
async def test_require_match_owner_missing_param():
    req = make_request({})
    repo = AsyncMock()
    with pytest.raises(HTTPException) as exc:
        await require_match_owner(req, match_repo=repo, current_user=None)
    assert exc.value.status_code == 400
    assert "Missing match ID" in exc.value.detail


@sync
async def test_require_match_owner_invalid_param():
    req = make_request({"match_id": "abc"})
    repo = AsyncMock()
    with pytest.raises(HTTPException) as exc:
        await require_match_owner(req, match_repo=repo, current_user=None)
    assert exc.value.status_code == 400
    assert "Invalid match ID" in exc.value.detail


@sync
async def test_require_match_owner_nonexistent_match():
    req = make_request({"match_id": "999"})
    repo = AsyncMock()
    repo.get_by_id.return_value = None
    with pytest.raises(HTTPException) as exc:
        await require_match_owner(req, match_repo=repo, current_user=None)
    assert exc.value.status_code == 404
    assert "999 not found" in exc.value.detail


@sync
async def test_require_match_owner_unassigned_match_allows_open_access():
    req = make_request({"match_id": "1"})
    repo = AsyncMock()
    repo.get_by_id.return_value = Match(id=1, owner_id=None)
    # Unauthenticated user permitted on unassigned/demo match
    result = await require_match_owner(req, match_repo=repo, current_user=None)
    assert result is None

    # Authenticated user also permitted on unassigned match
    user = User(id=10, username="test_user", is_superuser=False)
    result = await require_match_owner(req, match_repo=repo, current_user=user)
    assert result == user


@sync
async def test_require_match_owner_unauthenticated_on_owned_match_raises_401():
    req = make_request({"match_id": "1"})
    repo = AsyncMock()
    repo.get_by_id.return_value = Match(id=1, owner_id=42)
    with pytest.raises(HTTPException) as exc:
        await require_match_owner(req, match_repo=repo, current_user=None)
    assert exc.value.status_code == 401
    assert "Bearer" in exc.value.headers.get("WWW-Authenticate", "")


@sync
async def test_require_match_owner_matching_owner_permitted():
    req = make_request({"match_id": "1"})
    repo = AsyncMock()
    repo.get_by_id.return_value = Match(id=1, owner_id=42)
    owner = User(id=42, username="owner_bob", is_superuser=False)
    result = await require_match_owner(req, match_repo=repo, current_user=owner)
    assert result == owner


@sync
async def test_require_match_owner_non_owner_forbidden():
    req = make_request({"match_id": "1"})
    repo = AsyncMock()
    repo.get_by_id.return_value = Match(id=1, owner_id=42)
    stranger = User(id=99, username="stranger_dan", is_superuser=False)
    with pytest.raises(HTTPException) as exc:
        await require_match_owner(req, match_repo=repo, current_user=stranger)
    assert exc.value.status_code == 403
    assert "You do not have permission" in exc.value.detail


@sync
async def test_require_match_owner_superuser_permitted():
    req = make_request({"match_id": "1"})
    repo = AsyncMock()
    repo.get_by_id.return_value = Match(id=1, owner_id=42)
    admin = User(id=1, username="admin_alice", is_superuser=True)
    result = await require_match_owner(req, match_repo=repo, current_user=admin)
    assert result == admin


@sync
async def test_require_match_access_alias():
    guard = require_match_access()
    req = make_request({"match_id": "1"})
    repo = AsyncMock()
    repo.get_by_id.return_value = Match(id=1, owner_id=42)
    owner = User(id=42, username="owner_bob", is_superuser=False)
    result = await guard(req, match_repo=repo, current_user=owner)
    assert result == owner
