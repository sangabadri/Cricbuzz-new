"""
Domain Exceptions for Cricket Logic.
Pure Python exceptions completely decoupled from FastAPI / HTTP frameworks.
"""


class CricketDomainError(Exception):
    """Base exception for all cricket domain errors."""

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message
        self.detail = message

    def __str__(self) -> str:
        return self.message


class RuleViolationError(CricketDomainError):
    """Raised when a general cricket rule or constraint is violated."""
    pass


class EntityNotFoundError(CricketDomainError):
    """Raised when a requested domain entity (match, innings, player, team) is not found."""
    pass


class CreaseViolationError(CricketDomainError):
    """Raised when a batting crease rule is violated (e.g., non-striker stumped, re-batting)."""
    pass


class OverProgressionError(CricketDomainError):
    """Raised when bowler quota, over progression, or innings state rules are violated."""
    pass
