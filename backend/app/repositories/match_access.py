from dataclasses import dataclass
from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.match import Match
from app.models.match_access import MatchAccess
from app.models.user import User
from app.domain.enums import MatchUserRole


@dataclass(frozen=True)
class MatchAuthContext:
    match_exists: bool
    user_role: MatchUserRole | None
    has_access_records: bool


class MatchAccessRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_match_auth_context(
        self, match_id: int, user_id: int | None = None
    ) -> MatchAuthContext:
        """
        Executes a single consolidated index-seek query returning:
        - match_exists: True if match found in database
        - user_role: MatchUserRole if the user has an assigned role on this match
        - has_access_records: True if match has any access entries, False if unassigned legacy fixture
        """
        role_subquery = (
            select(MatchAccess.role)
            .where(
                MatchAccess.match_id == Match.id,
                MatchAccess.user_id == user_id,
            )
            .correlate(Match)
            .scalar_subquery()
            .label("user_role")
        )

        has_records_subquery = (
            select(func.count(MatchAccess.id) > 0)
            .where(MatchAccess.match_id == Match.id)
            .correlate(Match)
            .scalar_subquery()
            .label("has_access_records")
        )

        query = (
            select(
                Match.id,
                role_subquery,
                has_records_subquery,
            )
            .where(Match.id == match_id)
        )
        result = await self.session.execute(query)
        row = result.first()
        if not row:
            return MatchAuthContext(
                match_exists=False,
                user_role=None,
                has_access_records=False,
            )
        return MatchAuthContext(
            match_exists=True,
            user_role=row[1],
            has_access_records=bool(row[2]),
        )

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
