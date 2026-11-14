# Task Brief: Redis Integration & Distributed Upgrades

## Goal
Introduce Redis 7 as an optional distributed backend for multi-pod pub/sub live match streaming, distributed scorecard caching, and global API rate limiting, with 100% graceful offline fallback to existing in-memory structures when Redis is absent.

## In Scope / Out of Scope
- **In Scope**:
  - Containerization: Add `redis:7-alpine` service to `docker-compose.yaml` and Kubernetes manifests (`k8s/redis-deployment.yaml`, `k8s/redis-service.yaml`).
  - Configuration: `REDIS_URL` in `app/core/config.py` with optional/none default for zero-dependency local runs.
  - Multi-Pod Pub/Sub: Upgrade `MatchEventBus` to publish to Redis channels when available, falling back to `asyncio.Queue` when absent.
  - Distributed Cache-Aside: Upgrade `ScorecardCache` to read and write to Redis keys with TTL, falling back to local LRU when absent.
  - Distributed Rate Limiting: Add Redis-backed sliding-window/token rate-limiting middleware for public reads and login routes with HTTP 429 and `Retry-After` headers (fail-open fallback).
  - Automated Tests: Unit and mock integration tests covering Redis client operations, graceful fallback, and rate limit enforcement.
- **Out of Scope**:
  - Idempotency records migration (Idempotency stays in PostgreSQL inside the ACID transaction boundary).
  - Primary cricket relational entities (Matches, Innings, Deliveries, Players, Teams stay in PostgreSQL).
  - Redis Cluster or Sentinel sharding (single standalone container is sufficient for current scale).

## Must Do (Requirements)
1. System must run and pass all 211 existing backend tests and 135 frontend tests completely offline without a live Redis process.
2. In production or Docker Compose, when `REDIS_URL` is set, live match events published on one API pod must be broadcast via Redis Pub/Sub to spectators connected to any other pod.
3. Completed match scorecards must be cached in Redis with a 24-hour TTL, eliminating duplicate calculations across pods.
4. Mutating a match (MOM award, delivery undo) must evict the scorecard key from Redis.
5. Public spectator reads must enforce a rate limit (60 req/min/IP) and return HTTP 429 when exceeded, while failing open if Redis is down.

## Rules to Respect (Constraints)
- **Domain Purity (ADR-0001)**: `backend/app/domain/` must have 0 imports of `redis` or any framework.
- **Spectator Access (ADR-0005)**: Live stream and scorecard reads remain completely unauthenticated.
- **Single-Owner Match Model (ADR-0008)**: Scorer authorization remains untouched.
- **Graceful Fallback**: If Redis crashes or network blips, the API must never crash or throw unhandled 500 errors.

## How We Know It Works
- [ ] Given a running Redis instance, when a delivery is recorded, then the event is published to `cricbuzz:match:{id}` channel in Redis.
- [ ] Given a completed match, when `get_match_scorecard` is called, then the scorecard is stored in Redis under `cricbuzz:scorecard:{id}` with TTL.
- [ ] Given an absent or unreachable Redis connection, when the backend boots or serves requests, then it transparently falls back to in-memory bus/cache without errors.
- [ ] Given a client exceeding 60 requests in a minute on public endpoints, when request 61 arrives, then backend returns HTTP 429 with `Retry-After` header.

## Size
- **Large** (New infrastructure service, new library dependency, cross-cutting distributed caching and pub/sub).
