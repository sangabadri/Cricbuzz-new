# 0003: Lock order when scoring: match, then innings

- Status: Accepted
- Date: 2026-11-12

## Situation
Two scorers (or a double tap) can send changes to the same innings at the same moment.
Without locking, the ball count or the crease can get corrupted.

## Decision
Every service method that changes match or innings state loads rows with `for_update=True`
(SQL `SELECT ... FOR UPDATE`) in this fixed order: **match first, then innings**.
Always the same order, so two requests cannot wait on each other forever.

## Results
Good: changes to one innings happen one at a time.
Costs: more waiting under load for the same match.
Watch: any new method that changes match or innings state must lock in the same order.
A new method that locks in another order is a Stop-and-ask change.
