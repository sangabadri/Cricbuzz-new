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


class AuthenticationRequiredError(CricketDomainError):
    """Raised when authentication is required to access or modify a domain entity."""
    pass


class InvalidCredentialsError(AuthenticationRequiredError):
    """Raised when provided authentication credentials (username or password) are incorrect."""
    pass


class TokenExpiredOrInvalidError(AuthenticationRequiredError):
    """Raised when an authentication or refresh token is expired, malformed, or invalid."""
    pass


class AccessDeniedError(CricketDomainError):
    """Raised when an authenticated actor lacks the required authorization role."""
    pass


class InactiveUserError(AccessDeniedError):
    """Raised when an account is deactivated or suspended."""
    pass


class EntityConflictError(CricketDomainError):
    """Raised when an entity creation or update conflicts with an existing unique resource."""
    pass
