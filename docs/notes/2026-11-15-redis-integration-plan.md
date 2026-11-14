# Design Plan: Redis Integration & Distributed Upgrades

## 1. What I Understood
We are introducing Redis as an optional distributed layer to upgrade two existing services (`MatchEventBus` and `ScorecardCache`) and add one new middleware (`RateLimitMiddleware`). The application must feature 100% graceful degradation: if Redis is not reachable or `REDIS_URL` is omitted, the entire backend functions seamlessly using local in-memory fallback.

## 2. What Could Be Affected
- [ ] Database tables / columns (None; relational data stays in Postgres)
- [ ] Domain rules (`backend/app/domain`) (None; domain remains pure)
- [ ] Schemas (None)
- [ ] Repositories (None)
- [x] Services (`backend/app/services/event_bus.py`, `backend/app/services/scorecard_cache.py`, new `backend/app/services/redis_client.py`)
- [x] Routers / API shape (New Rate Limiting middleware / 429 response handling)
- [ ] Frontend types (None)
- [x] Frontend API client / hooks (`api-client.ts` handling 429 Retry-After toast)
- [ ] Pages / components (None)
- [x] Tests (`backend/tests/unit/test_redis_integration.py`, `backend/tests/unit/test_rate_limiter.py`)
- [x] Config / Docker / k8s (`docker-compose.yaml`, `backend/requirements.txt`, `k8s/redis-*.yaml`, `app/core/config.py`)
- [x] Docs (`docs/architecture/system-overview.md`, `backend/docs/architecture/components-and-responsibilities.md`, `docs/contracts/interface-contracts.md`)

## 3. Architecture & Data Flow

```text
[ Client (Spectator / Scorer) ]
             |
             v
   [ RateLimitMiddleware ] <---- Redis (Atomic INCR / EXPIRE sliding window)
             |                   (Fails open if Redis down)
             v
      [ FastAPI Routers ]
       /               \
      v                 v
[ DeliveryService ]   [ ScorecardService ]
      |                         |
      v                         v
[ MatchEventBus ]         [ ScorecardCache ]
      |                         |
      +--> Redis Pub/Sub        +--> Redis Key-Value (ex=86400)
      |    (Fallback: memory)   |    (Fallback: OrderedDict LRU)
      v                         v
[ PostgreSQL 16 ] <=============+ (ACID source of truth for deliveries, matches, idempotency)
```

## 4. Key Design Details

### A. Redis Connection Lifecycle (`app/services/redis_client.py`)
- Provides `get_redis_client()` returning `redis.asyncio.Redis | None`.
- Connection pool with timeout (e.g. 1.0s connect timeout) to prevent blocking if Redis is down.
- Helper `is_redis_available()` checks ping with exception catching.

### B. Upgrading `MatchEventBus` (Pub/Sub)
- When publishing an event:
  - If Redis is available: `await redis.publish(channel, payload)`
  - Also emits to local subscriber queues (for same-pod subscribers or offline mode).
- When subscribing:
  - Listens to Redis pubsub channel or local queues.

### C. Upgrading `ScorecardCache` (Cache-Aside)
- `get(match_id)`:
  - If Redis is available, calls `await redis.get(f"cricbuzz:scorecard:{match_id}")`.
  - On hit: desrializes `MatchScorecardResponse`.
  - On miss/offline: checks in-memory `_cache`.
- `set(match_id, scorecard)`:
  - Writes to Redis with 24h TTL (`ex=86400`).
  - Writes to in-memory `_cache`.
- `invalidate(match_id)`:
  - Deletes from Redis (`await redis.delete(...)`) and in-memory.

### D. Rate Limiting Middleware
- Implemented as FastAPI/Starlette `BaseHTTPMiddleware`.
- Scopes rate limits by client IP:
  - `/api/v1/auth/token`, `/api/v1/auth/login`: 10 req/min
  - Public reads (`/scorecard`, `/live`): 60 req/min
- Headers returned on 429:
  - `Retry-After: <seconds>`
  - `X-RateLimit-Limit: <limit>`
  - `X-RateLimit-Remaining: 0`

## 5. Options and Trade-offs
| Option | Good | Bad |
|---|---|---|
| **A. Optional Redis with In-Memory Fallback (Recommended)** | Zero downtime, unit tests run offline, zero local dev friction, production-ready for multi-pod scale. | Need small adapter abstraction in cache and event bus. |
| **B. Hard-Dependency Redis** | Slightly simpler code (no fallback). | All local unit tests require a running Redis daemon; CI/CD fails without Redis service. |

## 6. Build Order (Vertical Slices) - COMPLETED
- [x] **Slice A (Infrastructure & Client)**: `docker-compose.yaml` (redis:7-alpine), `backend/requirements.txt` (`redis>=5.0.0`), `backend/app/config.py` (`REDIS_URL`), `k8s/redis-*.yaml`, `app/services/redis_client.py` (async connection pool, health check probe, lifespan shutdown), `test_redis_client.py` (7 tests).
- [x] **Slice B (Distributed Pub/Sub)**: Updated `MatchEventBus` (`event_bus.py`) with cross-pod Redis Pub/Sub (`cricbuzz:match:{id}`), unique pod ID self-echo deduplication, background listener loop, and in-process `asyncio.Queue` fallback. Added 4 unit tests in `test_sse_live_stream.py`.
- [x] **Slice C (Distributed Scorecard Cache)**: Updated `ScorecardCache` (`scorecard_cache.py`) with two-tiered caching (L1 local LRU, L2 Redis with 24h TTL), `get_async`, `set_async`, and `invalidate_async`. Added 5 unit tests in `test_scorecard_cache.py`.
- [x] **Slice D (Distributed Rate Limiting)**: Implemented `DistributedRateLimitMiddleware` (`rate_limit.py`) as a pure ASGI middleware with atomic Lua script counter, two tiers (60 req/min public, 10 req/min auth), `X-RateLimit-*` and `Retry-After` headers, exempt routes, and fail-open resilience. Added 6 unit tests in `test_rate_limiter.py`.
- [x] **Slice E (Verification & Docs Sync)**: Updated system overview, interface contracts, and component responsibility documentation. Ran full quality gate audit.

## 7. Human Approvals Required ("Stop and Ask")
- [x] New Library: Add `redis>=5.0.0` to `backend/requirements.txt`.
- [x] Docker: Add `redis:7-alpine` container to `docker-compose.yaml`.
- [x] K8s: Add Redis deployment and service manifests to `k8s/`.
