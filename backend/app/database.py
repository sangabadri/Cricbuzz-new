from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.config import settings

# 1. Create the asynchronous database engine.
# An engine manages the connection pool to PostgreSQL.
engine = create_async_engine(
    settings.database_url,
    echo=settings.DB_ECHO,
    future=True,
)

# 2. Create the async session factory.
# Each web request will instantiate its own AsyncSession from this factory.
# expire_on_commit=False prevents SQLAlchemy from expiring object attributes after commit,
# which avoids unexpected lazy-loading errors in async Python.
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


# 3. FastAPI Dependency to provide an async database session per request.
# Uses Python's async context manager to ensure sessions are always closed cleanly.
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Yields an active database session for a single request,
    commits on success, rolls back on exception, and closes cleanly.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
