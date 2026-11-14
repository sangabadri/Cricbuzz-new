# Deployment & Infrastructure Guide

This document describes how to deploy, configure, and orchestrate Cricbuzz Tracker across local development, Docker Compose, and Kubernetes environments.

---

## 1. Environment Configuration

The application is configured through environment variables (defined with Pydantic in `backend/app/config.py`):

| Variable | Default Value | Description | Production Requirement |
|---|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://postgres:postgres@localhost:5432/cricbuzz` | Async SQLAlchemy database connection URL. | Mandatory: points to managed PostgreSQL cluster. |
| `API_V1_PREFIX`| `/api/v1` | URL prefix for REST API endpoints. | Standardized `/api/v1`. |
| `PROJECT_NAME` | `Cricbuzz Tracker API` | Application name in Swagger/OpenAPI docs. | Optional. |
| `JWT_SECRET_KEY`| Hardcoded development secret | Secret key for signing HS256 JWT tokens. | **Mandatory**: Cryptographically strong random key via environment secret. |
| `JWT_ALGORITHM` | `HS256` | JWT signing algorithm. | Standard `HS256`. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `15` | Lifetime of short-lived JWT access token. | 15–30 minutes. |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Lifetime of rotating refresh token session. | 7–30 days. |
| `CORS_ORIGINS` | `["http://localhost:5173", ...]` | Allowed CORS origins for web clients. | Strict production domains. |

---

## 2. Local Multi-Container Deployment (Docker Compose)

The project includes `docker-compose.yaml` for standing up a local PostgreSQL 16 database and FastAPI container:

```powershell
# Start PostgreSQL and FastAPI backend:
docker-compose up --build

# Run in background:
docker-compose up -d

# Stop and remove containers:
docker-compose down
```

### Services Defined:
1. `postgres`: Official `postgres:16-alpine` image with healthcheck probing `pg_isready`.
2. `api`: Builds from `./backend/Dockerfile`. Mounts `./backend` as a volume for hot reloading. Waits for PostgreSQL healthcheck before starting.

---

## 3. Kubernetes Orchestration (`k8s/`)

Declarative production Kubernetes manifests live in `k8s/`:

```
k8s/
├── postgres-configmap.yaml      # Non-sensitive database config (DB name, user)
├── postgres-secret.yaml         # Base64-encoded DB credentials
├── postgres-service.yaml        # Headless/ClusterIP service for PostgreSQL
├── postgres-statefulset.yaml    # StatefulSet with PersistentVolumeClaim for PG data
├── api-deployment.yaml          # FastAPI Deployment (Replicas, probes, resources)
└── api-service.yaml             # ClusterIP service routing traffic to API pods
```

### Applying Manifests:
```bash
# 1. Apply database configs and secrets:
kubectl apply -f k8s/postgres-configmap.yaml
kubectl apply -f k8s/postgres-secret.yaml

# 2. Deploy PostgreSQL StatefulSet and Service:
kubectl apply -f k8s/postgres-service.yaml
kubectl apply -f k8s/postgres-statefulset.yaml

# 3. Deploy API application and Service:
kubectl apply -f k8s/api-deployment.yaml
kubectl apply -f k8s/api-service.yaml
```

### Probes & Resilience:
The API deployment defines:
- **Liveness Probe**: `httpGet: path: /docs, port: 8000` (periodSeconds: 10).
- **Readiness Probe**: `httpGet: path: /docs, port: 8000` (periodSeconds: 5).
- **Resource Limits**: Configured CPU/memory limits to avoid OOM kills.
