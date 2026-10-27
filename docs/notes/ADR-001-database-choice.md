# ADR-001: Selection of Microsoft SQL Server 2022 with Prisma ORM

## Context

The MES platform requires a robust relational database engine capable of handling transactional integrity for master data, order scheduling, relational constraints, time-series machine telemetry event logs, and immutable audit trails. The system blueprint designates Microsoft SQL Server as the standardized enterprise database.

## Decision

Adopt **Microsoft SQL Server 2022** as the primary persistent data store, integrated with **Prisma ORM** as the schema migration, object-relational mapping, and type-safe query engine in NestJS.

## Consequences

- **Positive:** Enterprise relational guarantees, high indexing throughput on chronological timestamps, strict foreign key constraints, and end-to-end static type-safety in TypeScript.
- **Negative:** Requires running a containerized SQL Server instance during local development (managed via Docker Compose).
