from abc import ABC, abstractmethod
from app.domain.enums import MatchFormat


class MatchFormatRules(ABC):
    """
    Strategy interface for cricket match format rules (T20, ODI, Test).
    Adheres to Open/Closed Principle: new formats can be added without modifying existing logic.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Name of the format."""
        pass

    @property
    @abstractmethod
    def max_overs(self) -> int:
        """Maximum overs allowed per innings."""
        pass

    @property
    @abstractmethod
    def max_bowler_overs(self) -> int:
        """Maximum overs an individual bowler may bowl in an innings."""
        pass

    @property
    def balls_per_over(self) -> int:
        """Number of legal deliveries per over."""
        return 6

    @property
    def total_innings(self) -> int:
        """Number of innings in a standard match."""
        return 2

    @property
    def max_wickets(self) -> int:
        """Number of wickets before an innings is considered all out."""
        return 10

    def can_bowler_bowl(self, completed_overs: int, balls_in_current_over: int = 0) -> bool:
        """Checks if a bowler is legally allowed to bowl another delivery."""
        if completed_overs > self.max_bowler_overs:
            return False
        if completed_overs == self.max_bowler_overs and balls_in_current_over > 0:
            return False
        return True


class T20FormatRules(MatchFormatRules):
    """Rules strategy for Twenty20 (T20) cricket."""

    @property
    def name(self) -> str:
        return "t20"

    @property
    def max_overs(self) -> int:
        return 20

    @property
    def max_bowler_overs(self) -> int:
        return 4


class ODIFormatRules(MatchFormatRules):
    """Rules strategy for One Day International (ODI) cricket."""

    @property
    def name(self) -> str:
        return "odi"

    @property
    def max_overs(self) -> int:
        return 50

    @property
    def max_bowler_overs(self) -> int:
        return 10


class TestFormatRules(MatchFormatRules):
    """Rules strategy for Test / Multi-day cricket."""

    @property
    def name(self) -> str:
        return "test"

    @property
    def max_overs(self) -> int:
        return 450

    @property
    def max_bowler_overs(self) -> int:
        # Unlimited bowler overs in test cricket
        return 100

    @property
    def total_innings(self) -> int:
        return 4


def get_format_rules(match_format: MatchFormat | str) -> MatchFormatRules:
    """Factory function returning the corresponding MatchFormatRules strategy."""
    format_value = match_format.value if isinstance(match_format, MatchFormat) else str(match_format).lower()
    if format_value == MatchFormat.T20.value or format_value == "t20":
        return T20FormatRules()
    elif format_value == MatchFormat.ODI.value or format_value == "odi":
        return ODIFormatRules()
    elif format_value == "test":
        return TestFormatRules()
    else:
        # Default fallback to T20
        return T20FormatRules()
