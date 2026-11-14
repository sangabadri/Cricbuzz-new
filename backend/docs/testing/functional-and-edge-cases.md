# Backend Functional & Edge-Case Testing

This document details how to verify functional requirements, boundary conditions, edge cases, and negative rejection scenarios in the backend.

---

## 1. Domain Boundary & Edge Cases

Cricket rules are full of nuanced boundary conditions that must be rigorously tested:

| Boundary Scenario | Expected System Behavior | Verification Pattern |
|---|---|---|
| **Wide on 6th Ball** | Over does NOT complete. Wide adds +1 penalty run and must be re-bowled. | `aggregate.record_ball(extra_type=ExtraType.WIDE); assert aggregate.completed_overs == 0 and aggregate.balls_in_current_over == 5` |
| **No-ball with Boundary** | Batter scores 4 runs + 1 penalty run = 5 runs total. Legal ball count unchanged. | `assert aggregate.total_runs == 5 and aggregate.batter_stats[striker].runs == 4 and aggregate.balls_in_current_over == 0` |
| **Wicket on 6th Ball** | Batter is dismissed AND over completes. New batter must be assigned before over 2 starts. | `crease.handle_wicket(striker_id); crease.handle_over_end(); assert crease.is_waiting_for_batter is True` |
| **Run-Out on Non-Striker** | Non-striker is dismissed. Wicket is NOT credited to the bowler. Striker remains at crease. | `aggregate.record_ball(is_wicket=True, wicket_type=WicketType.RUN_OUT, dismissed_player_id=non_striker_id); assert bowler.wickets == 0` |
| **Bowler Quota Reached** | Bowler in T20 who has bowled 4.0 overs cannot bowl over 5. | Call `service.record_delivery(...)` with bowler; expect `OverProgressionError`. |
| **Consecutive Overs** | Bowler from over 1 cannot bowl over 2 from the same end. | Expect `OverProgressionError("Bowler cannot bowl consecutive overs")`. |
| **All-Out on 10th Wicket** | 10th wicket immediately completes the innings (status `completed`). | `assert innings.status == InningsStatus.COMPLETED and match.status == MatchStatus.INNINGS_BREAK` |

---

## 2. Negative & Invalid State Testing

Always test that invalid operations are explicitly rejected with exact domain errors:

### A. Illegal Crease Assignments
```python
def test_cannot_assign_same_player_as_striker_and_non_striker():
    with pytest.raises(CreaseViolationError) as exc_info:
        CreaseState(striker_id=1, non_striker_id=1, current_bowler_id=2)
    assert "Striker and non-striker must be different players" in str(exc_info.value)
```

### B. Re-batting Dismissed Player
```python
def test_cannot_reassign_dismissed_batter_to_crease():
    crease = CreaseState(striker_id=10, non_striker_id=11, current_bowler_id=20)
    crease.handle_wicket(dismissed_player_id=10)
    
    with pytest.raises(CreaseViolationError) as exc_info:
        crease.assign_new_batter(new_batter_id=10)
    assert "has already been dismissed" in str(exc_info.value)
```

### C. Illegal Match State Transitions
- Attempting to score deliveries before toss is done -> Raises `RuleViolationError("Match is not in live state")`.
- Attempting to record deliveries in a completed match -> Raises `RuleViolationError("Match is already completed")`.
- Submitting Playing XI with duplicate player IDs -> Raises `RuleViolationError("Duplicate players found in squad")`.
