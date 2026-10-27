# ADR-002: Modular Monolith Architecture Pattern

## Context

The MES application coordinates deeply interconnected domain contexts (Master Data, Order Execution, Real-time Machine Monitoring, OEE Calculations, Digital Andon, and Security/Audit). A decision was required between distributed microservices and a monolithic architecture.

## Decision

Adopt a **Modular Monolith** architecture pattern hosted within a NestJS application. Each domain capability is encapsulated in a dedicated module with strict dependency injection boundaries.

## Consequences

- **Positive:** Eliminates inter-service network latency, avoids distributed transaction complexity (two-phase commits / Saga overhead), and ensures simple, reproducible local development and demonstration setup.
- **Negative:** All domain services share a single process runtime. Process crashes affect all modules (mitigated through global exception filters and decoupled asynchronous task handling).
