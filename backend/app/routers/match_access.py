from fastapi import APIRouter, Depends, status
from app.api.deps import get_current_user, get_match_access_service, require_match_access
from app.domain.enums import MatchUserRole
from app.models.user import User
from app.schemas.auth import MatchAccessGrant, MatchAccessResponse
from app.services.match_access import MatchAccessService

router = APIRouter(prefix="/matches/{id}/access", tags=["Match Access"])


@router.get("", response_model=list[MatchAccessResponse], dependencies=[Depends(require_match_access([MatchUserRole.OWNER, MatchUserRole.SCORER, MatchUserRole.VIEWER]))])
async def list_match_access(
    id: int,
    match_access_service: MatchAccessService = Depends(get_match_access_service),
):
    """
    Lists all users with delegated access to this match.
    """
    return await match_access_service.list_match_access(id)


@router.post("", response_model=MatchAccessResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_match_access([MatchUserRole.OWNER]))])
async def grant_match_access(
    id: int,
    grant_in: MatchAccessGrant,
    current_user: User = Depends(get_current_user),
    match_access_service: MatchAccessService = Depends(get_match_access_service),
):
    """
    Grants or updates a user's scoring or viewing access for this match.
    Only the match owner or superuser can grant access.
    """
    return await match_access_service.grant_match_access(
        match_id=id,
        target_username=grant_in.username,
        role=grant_in.role,
        granted_by_id=current_user.id,
    )


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_match_access([MatchUserRole.OWNER]))])
async def revoke_match_access(
    id: int,
    user_id: int,
    match_access_service: MatchAccessService = Depends(get_match_access_service),
):
    """
    Revokes a user's access grant for this match.
    Only the match owner or superuser can revoke access.
    """
    await match_access_service.revoke_match_access(match_id=id, target_user_id=user_id)
