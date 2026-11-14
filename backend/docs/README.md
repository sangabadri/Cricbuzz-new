# Backend Documentation (`backend/docs/`)

This directory documents the internal architecture, domain implementation, database persistence, REST API conventions, and testing practices of the Cricbuzz Tracker FastAPI backend.

---

## 📚 Backend Documentation Map

```
backend/docs/
├── README.md                                # This index
│
├── architecture/
│   ├── overview.md                          # Clean Architecture & DDD design principles
│   ├── components-and-responsibilities.md   # Layer boundaries: routers, services, repos, domain
│   └── request-lifecycle.md                 # Journey of an HTTP request through all layers
│
├── domain/
│   └── domain-implementation.md             # CreaseState, InningsAggregate, format strategies
│
├── database/
│   ├── schema-and-relationships.md          # SQLAlchemy models, relations, indexes, constraints
│   └── transactions-and-consistency.md      # AsyncSession, lock order, 1-transaction/request
│
├── api/
│   └── api-design-and-error-handling.md     # REST endpoints, Pydantic schemas, exception mapping
│
├── development/
│   ├── coding-conventions.md                # Python 3.11 standards, patterns, size limits
│   └── implementation-guidelines.md         # Step-by-step feature addition, wiring in deps.py
│
├── testing/
│   ├── testing-strategy.md                  # Pytest hierarchy, AsgiTestClient, in-memory SQLite
│   ├── functional-and-edge-cases.md         # Testing domain rules, boundary counts, rejections
│   └── failure-and-integration-testing.md   # Concurrency, rollback, token replay, E2E lifecycles
│
└── known-problems.md                        # Catalog of long functions and technical debt
```

---

## 🎯 Quick Navigation by Responsibility

- **Need to understand how layers interact?** Read [`architecture/components-and-responsibilities.md`](architecture/components-and-responsibilities.md).
- **Need to inspect database models and foreign keys?** Read [`database/schema-and-relationships.md`](database/schema-and-relationships.md).
- **Need to see how scoring locks rows?** Read [`database/transactions-and-consistency.md`](database/transactions-and-consistency.md).
- **Need to add a new endpoint or service?** Read [`development/implementation-guidelines.md`](development/implementation-guidelines.md).
- **Need to write unit or E2E tests?** Read [`testing/testing-strategy.md`](testing/testing-strategy.md).
