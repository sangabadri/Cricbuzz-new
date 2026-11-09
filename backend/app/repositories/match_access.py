from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.match_access import MatchAccess
from app.models.user import User
from app.domain.enums import MatchUserRole


class MatchAccessRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_user_match_role(self, match_id: int, user_id: int) -> MatchUserRole | None:
        query = select(MatchAccess.role).where(
            MatchAccess.match_id == match_id,
            MatchAccess.user_id == user_id,
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def grant_access(
        self,
        match_id: int,
        user_id: int,
        role: MatchUserRole,
        granted_by: int | None = None,
    ) -> MatchAccess:
        # Check if already exists; if so, update role
        query = select(MatchAccess).where(
            MatchAccess.match_id == match_id,
            MatchAccess.user_id == user_id,
        )
        result = await self.session.execute(query)
        existing = result.scalar_one_or_none()
        if existing:
            existing.role = role
            existing.granted_by = granted_by
            await self.session.flush()
            await self.session.refresh(existing)
            return existing

        access = MatchAccess(
            match_id=match_id,
            user_id=user_id,
            role=role,
            granted_by=granted_by,
        )
        self.session.add(access)
        await self.session.flush()
        await self.session.refresh(access)
        return access

    async def revoke_access(self, match_id: int, user_id: int) -> bool:
        stmt = delete(MatchAccess).where(
            MatchAccess.match_id == match_id,
            MatchAccess.user_id == user_id,
        )
        result = await self.session.execute(stmt)
        await self.session.flush()
        return result.rowcount > 0

    async def list_for_match(self, match_id: int) -> list[tuple[MatchAccess, str]]:
        """Returns list of (MatchAccess, username) tuples for a match."""
        query = (
            select(MatchAccess, User.username)
            .join(User, MatchAccess.user_id == User.id)
            .where(MatchAccess.match_id == match_id)
            .order_by(MatchAccess.created_at.asc())
        )
        result = await self.session.execute(query)
        return result.all()
