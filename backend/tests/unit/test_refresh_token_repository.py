from datetime import datetime, timedelta, timezone
import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.dialects import postgresql
from sqlalchemy.orm import Session
from app.models.base import Base
from app.models.refresh_token import RefreshToken
from app.models.user import User


def test_refresh_token_table_compiles_for_postgresql():
    """
    Verifies that the RefreshToken model and queries compile cleanly to PostgreSQL dialect.
    """
    stmt = (
        select(RefreshToken)
        .where(RefreshToken.jti == "test-jti", RefreshToken.revoked_at.is_(None))
    )
    compiled = stmt.compile(dialect=postgresql.dialect())
    sql_str = str(compiled)
    assert "FROM refresh_tokens" in sql_str
    assert "refresh_tokens.jti = %(jti_1)s" in sql_str
    assert "refresh_tokens.revoked_at IS NULL" in sql_str


def test_refresh_token_repository_lifecycle_sql_execution():
    """
    Executes table creation and token lifecycle directly on an SQLite engine.
    """
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        # Create user
        user = User(
            id=1,
            username="token_user",
            email="token_user@test.com",
            password_hash="hash",
            is_active=True,
            is_superuser=False,
        )
        session.add(user)
        session.commit()

        # Insert active token
        now = datetime.now(timezone.utc)
        expires = now + timedelta(days=7)
        tok1 = RefreshToken(user_id=1, jti="jti-uuid-1", expires_at=expires)
        tok2 = RefreshToken(user_id=1, jti="jti-uuid-2", expires_at=expires)
        session.add_all([tok1, tok2])
        session.commit()

        # Seek by jti
        found = session.execute(
            select(RefreshToken).where(RefreshToken.jti == "jti-uuid-1")
        ).scalar_one_or_none()
        assert found is not None
        assert found.user_id == 1
        assert found.revoked_at is None

        # Revoke single token
        found.revoked_at = datetime.now(timezone.utc)
        session.commit()

        re_found = session.execute(
            select(RefreshToken).where(RefreshToken.jti == "jti-uuid-1")
        ).scalar_one_or_none()
        assert re_found.revoked_at is not None

        # Bulk revoke all for user
        active_tokens = session.execute(
            select(RefreshToken).where(
                RefreshToken.user_id == 1,
                RefreshToken.revoked_at.is_(None),
            )
        ).scalars().all()
        assert len(active_tokens) == 1  # tok2 is still active
        for t in active_tokens:
            t.revoked_at = datetime.now(timezone.utc)
        session.commit()

        remaining_active = session.execute(
            select(RefreshToken).where(
                RefreshToken.user_id == 1,
                RefreshToken.revoked_at.is_(None),
            )
        ).scalars().all()
        assert len(remaining_active) == 0
