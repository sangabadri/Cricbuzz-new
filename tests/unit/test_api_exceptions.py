import functools
import json
from unittest.mock import AsyncMock
from app.main import DOMAIN_EXCEPTION_STATUS_MAP, domain_exception_handler
from app.domain.exceptions import (
    EntityNotFoundError,
    RuleViolationError,
    CreaseViolationError,
    OverProgressionError,
)


def sync(async_fn):
    """Synchronous coroutine runner without Windows socket deadlocks."""
    @functools.wraps(async_fn)
    def wrapper(*args, **kwargs):
        coro = async_fn(*args, **kwargs)
        val = None
        try:
            while True:
                val = coro.send(val)
        except StopIteration as exc:
            return exc.value
    return wrapper


def test_exception_handler_status_map():
    assert DOMAIN_EXCEPTION_STATUS_MAP[EntityNotFoundError] == 404
    assert DOMAIN_EXCEPTION_STATUS_MAP[RuleViolationError] == 400
    assert DOMAIN_EXCEPTION_STATUS_MAP[CreaseViolationError] == 400
    assert DOMAIN_EXCEPTION_STATUS_MAP[OverProgressionError] == 400


@sync
async def test_domain_exception_handler_entity_not_found():
    req = AsyncMock()
    exc = EntityNotFoundError("Player not found")
    response = await domain_exception_handler(req, exc)
    assert response.status_code == 404
    assert json.loads(response.body) == {"detail": "Player not found"}


@sync
async def test_domain_exception_handler_rule_violation():
    req = AsyncMock()
    exc = RuleViolationError("Runs must be between 0 and 6")
    response = await domain_exception_handler(req, exc)
    assert response.status_code == 400
    assert json.loads(response.body) == {"detail": "Runs must be between 0 and 6"}


@sync
async def test_domain_exception_handler_crease_violation():
    req = AsyncMock()
    exc = CreaseViolationError("Striker and non-striker cannot be the same player")
    response = await domain_exception_handler(req, exc)
    assert response.status_code == 400
    assert json.loads(response.body) == {"detail": "Striker and non-striker cannot be the same player"}


@sync
async def test_domain_exception_handler_over_progression():
    req = AsyncMock()
    exc = OverProgressionError("Consecutive overs prohibited")
    response = await domain_exception_handler(req, exc)
    assert response.status_code == 400
    assert json.loads(response.body) == {"detail": "Consecutive overs prohibited"}
