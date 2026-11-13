import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi import HTTPException
from app.api.deps import require_match_access
from app.domain.enums import MatchUserRole
from app.models.user import User
from app.repositories.match_access import MatchAuthContext
from app.services.match_access import MatchAccessService


@pytest.fixture
def mock_match_access_repo():
    return AsyncMock()


@pytest.fixture
def mock_match_repo():
    return AsyncMock()


@pytest.fixture
def mock_user_repo():
    return AsyncMock()


@pytest.fixture
def auth_service(mock_match_access_repo, mock_match_repo, mock_user_repo):
    return MatchAccessService(mock_match_access_repo, mock_match_repo, mock_user_repo)


@pytest.mark.anyio
async def test_authorize_match_access_nonexistent_match(auth_service, mock_match_access_repo):
    mock_match_access_repo.get_match_auth_context.return_value = MatchAuthContext(
        match_exists=False,
        user_role=None,
        has_access_records=False,
    )
    user = User(id=1, username="test", is_superuser=False)
    # Endpoint handles 404
    result = await auth_service.authorize_match_access(999, user, [MatchUserRole.OWNER, MatchUserRole.SCORER])
    assert result == user


@pytest.mark.anyio
async def test_authorize_match_access_legacy_unassigned_match(auth_service, mock_match_access_repo):
    mock_match_access_repo.get_match_auth_context.return_value = MatchAuthContext(
        match_exists=True,
        user_role=None,
        has_access_records=False,
    )
    # Allows unauthenticated access on legacy matches
    result = await auth_service.authorize_match_access(1, None, [MatchUserRole.OWNER, MatchUserRole.SCORER])
    assert result is None


@pytest.mark.anyio
async def test_authorize_match_access_unauthenticated_on_assigned_match(auth_service, mock_match_access_repo):
    mock_match_access_repo.get_match_auth_context.return_value = MatchAuthContext(
        match_exists=True,
        user_role=None,
        has_access_records=True,
    )
    with pytest.raises(HTTPException) as exc_info:
        await auth_service.authorize_match_access(1, None, [MatchUserRole.OWNER, MatchUserRole.SCORER])
    assert exc_info.value.status_code == 401


@pytest.mark.anyio
async def test_authorize_match_access_superuser_always_allowed(auth_service, mock_match_access_repo):
    mock_match_access_repo.get_match_auth_context.return_value = MatchAuthContext(
        match_exists=True,
        user_role=None,
        has_access_records=True,
    )
    admin = User(id=99, username="admin", is_superuser=True)
    result = await auth_service.authorize_match_access(1, admin, [MatchUserRole.OWNER])
    assert result == admin


@pytest.mark.anyio
async def test_authorize_match_access_owner_allowed_for_all_actions(auth_service, mock_match_access_repo):
    mock_match_access_repo.get_match_auth_context.return_value = MatchAuthContext(
        match_exists=True,
        user_role=MatchUserRole.OWNER,
        has_access_records=True,
    )
    owner = User(id=5, username="owner", is_superuser=False)
    # Allowed for SCORER action
    result = await auth_service.authorize_match_access(1, owner, [MatchUserRole.SCORER])
    assert result == owner


@pytest.mark.anyio
async def test_authorize_match_access_scorer_denied_owner_action(auth_service, mock_match_access_repo):
    mock_match_access_repo.get_match_auth_context.return_value = MatchAuthContext(
        match_exists=True,
        user_role=MatchUserRole.SCORER,
        has_access_records=True,
    )
    scorer = User(id=6, username="scorer", is_superuser=False)
    with pytest.raises(HTTPException) as exc_info:
        await auth_service.authorize_match_access(1, scorer, [MatchUserRole.OWNER])
    assert exc_info.value.status_code == 403
    assert "required role" in exc_info.value.detail


@pytest.mark.anyio
async def test_authorize_match_access_viewer_denied_mutation(auth_service, mock_match_access_repo):
    mock_match_access_repo.get_match_auth_context.return_value = MatchAuthContext(
        match_exists=True,
        user_role=MatchUserRole.VIEWER,
        has_access_records=True,
    )
    viewer = User(id=7, username="viewer", is_superuser=False)
    with pytest.raises(HTTPException) as exc_info:
        await auth_service.authorize_match_access(1, viewer, [MatchUserRole.OWNER, MatchUserRole.SCORER])
    assert exc_info.value.status_code == 403


@pytest.mark.anyio
async def test_require_match_access_guard_fails_closed_on_missing_id():
    guard = require_match_access([MatchUserRole.OWNER])
    request = MagicMock()
    request.path_params = {}
    service = AsyncMock()

    with pytest.raises(HTTPException) as exc_info:
        await guard(request=request, match_access_service=service, current_user=None)
    assert exc_info.value.status_code == 400
    assert "Missing match ID" in exc_info.value.detail


@pytest.mark.anyio
async def test_require_match_access_guard_fails_closed_on_invalid_id():
    guard = require_match_access([MatchUserRole.OWNER])
    request = MagicMock()
    request.path_params = {"match_id": "not-a-number"}
    service = AsyncMock()

    with pytest.raises(HTTPException) as exc_info:
        await guard(request=request, match_access_service=service, current_user=None)
    assert exc_info.value.status_code == 400
    assert "Invalid match ID" in exc_info.value.detail
