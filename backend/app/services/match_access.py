from app.domain.enums import MatchUserRole
from app.domain.exceptions import EntityNotFoundError, RuleViolationError
from app.models.match_access import MatchAccess
from app.repositories.match import MatchRepository
from app.repositories.match_access import MatchAccessRepository
from app.repositories.user import UserRepository


class MatchAccessService:
    def __init__(
        self,
        match_access_repo: MatchAccessRepository,
        match_repo: MatchRepository,
        user_repo: UserRepository,
    ):
        self.match_access_repo = match_access_repo
        self.match_repo = match_repo
        self.user_repo = user_repo

    async def list_match_access(self, match_id: int) -> list[dict]:
        match = await self.match_repo.get_by_id(match_id)
        if not match:
            raise EntityNotFoundError(f"Match with ID {match_id} not found")

        records = await self.match_access_repo.list_for_match(match_id)
        return [
            {
                "user_id": access.user_id,
                "username": username,
                "role": access.role,
                "granted_by": access.granted_by,
                "created_at": access.created_at,
            }
            for access, username in records
        ]

    async def grant_match_access(
        self,
        match_id: int,
        target_username: str,
        role: MatchUserRole,
        granted_by_id: int | None = None,
    ) -> dict:
        match = await self.match_repo.get_by_id(match_id)
        if not match:
            raise EntityNotFoundError(f"Match with ID {match_id} not found")

        target_user = await self.user_repo.get_by_username(target_username)
        if not target_user:
            raise EntityNotFoundError(f"User '{target_username}' not found")

        access = await self.match_access_repo.grant_access(
            match_id=match_id,
            user_id=target_user.id,
            role=role,
            granted_by=granted_by_id,
        )

        return {
            "user_id": access.user_id,
            "username": target_user.username,
            "role": access.role,
            "granted_by": access.granted_by,
            "created_at": access.created_at,
        }

    async def revoke_match_access(
        self,
        match_id: int,
        target_user_id: int,
    ) -> bool:
        match = await self.match_repo.get_by_id(match_id)
        if not match:
            raise EntityNotFoundError(f"Match with ID {match_id} not found")

        # Do not allow revoking the owner's access
        current_role = await self.match_access_repo.get_user_match_role(match_id, target_user_id)
        if current_role == MatchUserRole.OWNER:
            raise RuleViolationError("Cannot revoke access from the match owner")

        revoked = await self.match_access_repo.revoke_access(match_id, target_user_id)
        if not revoked:
            raise EntityNotFoundError("Access grant not found")
        return True
