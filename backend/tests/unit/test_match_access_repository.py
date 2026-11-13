from datetime import datetime, timezone
import pytest
from sqlalchemy import create_engine, select, func
from sqlalchemy.dialects import postgresql, sqlite
from sqlalchemy.orm import Session
from app.domain.enums import MatchFormat, MatchStatus, MatchUserRole
from app.models.base import Base
from app.models.match import Match
from app.models.match_access import MatchAccess
from app.models.team import Team
from app.models.user import User


def build_auth_context_query(match_id: int, user_id: int | None = None):
    """Replicates the query structure from MatchAccessRepository.get_match_auth_context."""
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

    return select(
        Match.id,
        role_subquery,
        has_records_subquery,
    ).where(Match.id == match_id)


def test_correlated_subquery_compiles_for_postgresql():
    """
    Verifies that the correlated subquery compiles to valid PostgreSQL SQL
    with proper correlation, scalar subqueries, and parameters.
    """
    query = build_auth_context_query(match_id=42, user_id=10)
    compiled = query.compile(dialect=postgresql.dialect())
    sql_str = str(compiled)

    assert "SELECT matches.id" in sql_str
    assert "FROM match_access" in sql_str
    assert "match_access.match_id = matches.id" in sql_str
    assert "has_access_records" in sql_str


def test_correlated_subquery_real_sql_execution():
    """
    Executes the correlated subquery against an actual SQLite database engine
    to verify that the subquery syntax, table joins, and aggregations run cleanly.
    """
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        now = datetime.now(timezone.utc)

        # 1. Seed Teams
        team_a = Team(id=1, name="India")
        team_b = Team(id=2, name="Australia")
        session.add_all([team_a, team_b])

        # 2. Seed Users
        alice = User(id=10, username="alice", email="alice@test.com", password_hash="pw", is_active=True, is_superuser=False)
        bob = User(id=20, username="bob", email="bob@test.com", password_hash="pw", is_active=True, is_superuser=False)
        charlie = User(id=30, username="charlie", email="charlie@test.com", password_hash="pw", is_active=True, is_superuser=False)
        session.add_all([alice, bob, charlie])

        # 3. Seed Match 1 (Legacy fixture without access records)
        match_legacy = Match(
            id=100,
            team_a=1,
            team_b=2,
            venue="Wankhede",
            format=MatchFormat.T20,
            status=MatchStatus.SCHEDULED,
            match_date=now,
        )
        session.add(match_legacy)

        # 4. Seed Match 2 (Protected match with Alice as OWNER, Bob as SCORER)
        match_protected = Match(
            id=200,
            team_a=1,
            team_b=2,
            venue="Eden Gardens",
            format=MatchFormat.T20,
            status=MatchStatus.SCHEDULED,
            match_date=now,
        )
        session.add(match_protected)
        session.flush()

        access_owner = MatchAccess(match_id=200, user_id=10, role=MatchUserRole.OWNER)
        access_scorer = MatchAccess(match_id=200, user_id=20, role=MatchUserRole.SCORER)
        session.add_all([access_owner, access_scorer])
        session.commit()

        # --- Check 1: Non-existent match ---
        row_missing = session.execute(build_auth_context_query(match_id=999, user_id=10)).first()
        assert row_missing is None

        # --- Check 2: Legacy fixture (no access records) ---
        row_legacy = session.execute(build_auth_context_query(match_id=100, user_id=10)).first()
        assert row_legacy is not None
        assert row_legacy[0] == 100
        assert row_legacy[1] is None  # no role
        assert bool(row_legacy[2]) is False  # has_access_records = False

        # --- Check 3: Protected match queried by OWNER (Alice) ---
        row_owner = session.execute(build_auth_context_query(match_id=200, user_id=10)).first()
        assert row_owner is not None
        assert row_owner[0] == 200
        assert row_owner[1] == MatchUserRole.OWNER
        assert bool(row_owner[2]) is True

        # --- Check 4: Protected match queried by SCORER (Bob) ---
        row_scorer = session.execute(build_auth_context_query(match_id=200, user_id=20)).first()
        assert row_scorer is not None
        assert row_scorer[0] == 200
        assert row_scorer[1] == MatchUserRole.SCORER
        assert bool(row_scorer[2]) is True

        # --- Check 5: Protected match queried by Unassigned User (Charlie) ---
        row_unassigned = session.execute(build_auth_context_query(match_id=200, user_id=30)).first()
        assert row_unassigned is not None
        assert row_unassigned[0] == 200
        assert row_unassigned[1] is None
        assert bool(row_unassigned[2]) is True

        # --- Check 6: Protected match queried unauthenticated (user_id=None) ---
        row_anon = session.execute(build_auth_context_query(match_id=200, user_id=None)).first()
        assert row_anon is not None
        assert row_anon[0] == 200
        assert row_anon[1] is None
        assert bool(row_anon[2]) is True
