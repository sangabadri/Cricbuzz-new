from app.domain.enums import MatchUserRole
from app.domain.exceptions import (
    AccessDeniedError,
    AuthenticationRequiredError,
    EntityNotFoundError,
    RuleViolationError,
)
from app.models.match_access import MatchAccess
from app.models.user import User
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

        # Do not allow demoting the sole owner of the match
        if role != MatchUserRole.OWNER:
            current_role = await self.match_access_repo.get_user_match_role(match_id, target_user.id)
            if current_role == MatchUserRole.OWNER:
                existing_grants = await self.match_access_repo.list_for_match(match_id)
                owner_count = sum(1 for rec, _ in existing_grants if rec.role == MatchUserRole.OWNER)
                if owner_count <= 1:
                    raise RuleViolationError("Cannot demote the sole owner of the match")

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

    async def authorize_match_access(
        self,
        match_id: int,
        user: User | None,
        allowed_roles: list[MatchUserRole],
    ) -> User | None:
        """
        Consolidated authorization decision for match mutation operations.
        Executes exactly 1 database round-trip via MatchAccessRepository.get_match_auth_context.
        """
        context = await self.match_access_repo.get_match_auth_context(
            match_id=match_id,
            user_id=user.id if user else None,
        )
        if not context.match_exists:
            raise EntityNotFoundError(f"Match with ID {match_id} not found")

        # Legacy / unassigned match compatibility:
        # If no access entries exist for this match, permit open access (historical fixtures & tests)
        if not context.has_access_records:
            return user

        if not user:
            raise AuthenticationRequiredError("Authentication required for this match")

        if getattr(user, "is_superuser", False):
            return user

        if context.user_role == MatchUserRole.OWNER or (context.user_role and context.user_role in allowed_roles):
            return user

        if context.user_role is not None:
            raise AccessDeniedError("You do not have the required role for this match")

        raise AccessDeniedError("You do not have permission to modify this match")
