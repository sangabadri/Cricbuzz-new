# Cricbuzz Tracker Documentation Index

This directory contains the durable **project knowledge base** for Cricbuzz Tracker. It is designed to guide AI coding agents and software engineers to understand the system, respect its architecture, make consistent modifications, and thoroughly verify their changes.

---

## 🧭 The Four Fundamental Questions

The documentation is organized to provide unambiguous answers to four core engineering questions:

```
+--------------------------------------------------------------------------------+
|                         THE 4 FUNDAMENTAL QUESTIONS                            |
|                                                                                |
|   1. WHAT ARE WE BUILDING?                                                     |
|      Requirements, domain knowledge, and expected behaviour.                   |
|      -> [Product Overview](product/overview.md)                                  |
|      -> [Product Requirements](product/requirements.md)                          |
|      -> [Domain Model & Crease Invariants](domain/domain-model.md)               |
|      -> [Cricket Rules](domain/cricket-rules.md)                                  |
|                                                                                |
|   2. HOW IS IT BUILT?                                                          |
|      Architecture, components, responsibilities, and decisions.               |
|      -> [System Architecture Overview](architecture/system-overview.md)          |
|      -> [Interface & REST Contracts](contracts/interface-contracts.md)           |
|      -> [Architecture Decision Records (ADRs)](decisions/README.md)              |
|      -> [Backend Architecture](../backend/docs/architecture/overview.md)                 |
|      -> [Frontend Architecture](../frontend/docs/architecture/overview.md)               |
|                                                                                |
|   3. HOW SHOULD WE CHANGE IT?                                                  |
|      Development workflows, implementation practices, and commit rules.        |
|      -> [General Development Workflow](development/development-workflow.md)     |
|      -> [Feature Development Guide](development/feature-development.md)        |
|      -> [Bug Fixing Guide](development/bug-fixing.md)                           |
|      -> [Refactoring Guide](development/refactoring.md)                         |
|      -> [Commit Guidelines & Git Hygiene](development/commit-guidelines.md)     |
|      -> [Code Review & Completion](development/code-review-and-completion.md)   |
|                                                                                |
|   4. HOW DO WE KNOW IT WORKS?                                                  |
|      Requirement-driven testing, verification, and quality gates.              |
|      -> [Testing Strategy](testing/testing-strategy.md)                         |
|      -> [Requirements-to-Tests Matrix](testing/requirements-to-tests.md)         |
|      -> [Quality Gates & Automated Checks](testing/quality-gates.md)             |
+--------------------------------------------------------------------------------+
```

---

## 🗂️ Documentation Directory Map

| Directory | Scope & Purpose | Key Documents |
|---|---|---|
| [`product/`](product) | Scope, target personas, functional requirements (FR-1 to FR-8), and acceptance criteria. | [`overview.md`](product/overview.md), [`requirements.md`](product/requirements.md) |
| [`architecture/`](architecture) | High-level system topology, clean architecture, tech stack, and boundaries. | [`system-overview.md`](architecture/system-overview.md) |
| [`domain/`](domain) | Cricket domain entities, crease state machine, innings aggregates, format rules. | [`domain-model.md`](domain/domain-model.md), [`cricket-rules.md`](domain/cricket-rules.md) |
| [`contracts/`](contracts) | REST API specifications, auth cookie specifications, status code mapping. | [`interface-contracts.md`](contracts/interface-contracts.md) |
| [`development/`](development) | Actionable engineering workflows for features, fixes, refactoring, commits, and review. | [`development-workflow.md`](development/development-workflow.md), [`feature-development.md`](development/feature-development.md), [`commit-guidelines.md`](development/commit-guidelines.md) |
| [`testing/`](testing) | Testing philosophy, 7 testing dimensions, traceability matrix, automated quality gates. | [`testing-strategy.md`](testing/testing-strategy.md), [`requirements-to-tests.md`](testing/requirements-to-tests.md), [`quality-gates.md`](testing/quality-gates.md) |
| [`deployment/`](deployment) | Local Docker Compose, production Kubernetes manifests, environment configuration. | [`deployment-guide.md`](deployment/deployment-guide.md) |
| [`decisions/`](decisions) | Architectural Decision Records (ADRs 0001 through 0007). | [`README.md`](decisions/README.md) |
| [`examples/`](examples) | Concrete worked examples of Small, Medium, and Large tasks. | [`worked-examples.md`](examples/worked-examples.md) |
| [`backend/docs/`](../backend/docs) | Backend internal architecture, request lifecycle, DB schemas, conventions. | [`backend/docs/README.md`](../backend/docs/README.md) |
| [`frontend/docs/`](../frontend/docs) | Frontend internal architecture, state flow, UI conventions, testing. | [`frontend/docs/README.md`](../frontend/docs/README.md) |

---

## ⚖️ Precedence Order: Which Source is the Truth?

When navigating documentation and code:
1. **The Active Human Instruction**: Takes immediate precedence.
2. **Root `AGENTS.md` Rules**: Global guardrails and autonomy limits.
3. **Automated Tests & Real Source Code**: **The code is the ultimate truth** for how the system currently works.
4. **Architectural Decision Records (`docs/decisions/`)**: Established architectural designs.
5. **Topic Documentation (`docs/`)**: Detailed guides and references.
6. **Chat History**: Weakest source; may reflect outdated intermediate plans.

If documentation and source code disagree, investigate the cause. Determine whether it is an outdated document, an implementation defect, or an unresolved design decision. Report the mismatch rather than silently making an assumption.
