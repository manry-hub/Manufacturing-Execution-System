# Architecture Plan — Manufacturing Execution System (MES)

> **Status:** `PLANNING` — New Project Mode (Technical Architecture Blueprint based on System Blueprint v1.0 & MVP Decisions)  
> **Output:** `.agent-knowledge/dynamic/docs/dev/sdd/ARCHITECTURE.md`  
> **Purpose:** Technical blueprint for system design, components, data flows, security, deployment, and key decisions.

---

## Project Type Declaration

| Item         | Value                                                           |
| ------------ | --------------------------------------------------------------- |
| Project Type | Fullstack (Modular Monolith)                                    |
| Git Location | `backend/` and `frontend/` — single monorepo (`pnpm workspace`) |

---

## 1. System Design

### Architecture Pattern

**Modular Monolith**

**Rationale:**

1. **Domain Cohesion:** MES business logic involves tightly coupled operational entities (e.g., machine cycle events update production run counters, trigger OEE loss calculations, and correlate with active Andon tickets). A modular monolith avoids distributed transactions, dual-write anomalies, and network hop latency during initial development.
2. **Modular Isolation:** Each bounded domain context (Master Data, Production Execution, Machine Integration, OEE Analytics, Digital Andon, Security & Audit) is encapsulated in an isolated NestJS module with explicit public service interfaces.
3. **Evolutionary Decoupling:** The machine integration layer operates behind an adapter interface. If high-throughput ingestion or telemetry caching requires independent horizontal scaling in the future, it can be extracted into a dedicated service without altering core MES domain rules.

### High-Level Diagram

```text
+-------------------------------------------------------------------------+
|                  Machine Simulator / OPC UA Adapter                     |
|  (10 Virtual Machines: 8 Normal Flow, 1 Slow Cycle, 1 Fault / Andon)    |
|               (Deterministic Engine, Seed Replay, Speed Multiplier)     |
+-------------------------------------------------------------------------+
                                    │
                                    ▼ (Internal Normalized Event Protocol)
+-------------------------------------------------------------------------+
|                    Machine Integration & Ingestion Layer                |
|           (Schema Validation, Deduplication, Timestamp Separation)       |
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
|                     MES Application Core (NestJS)                       |
|  ┌─────────────────────┐ ┌──────────────────────┐ ┌──────────────────┐  |
|  │ Plant & Master Data │ │ Production Execution │ │ Machine Monitor  │  |
|  └─────────────────────┘ └──────────────────────┘ └──────────────────┘  |
|  ┌─────────────────────┐ ┌──────────────────────┐ ┌──────────────────┐  |
|  │ OEE & Loss Engine   │ │ Digital Andon/Downtime│ │ Identity & Audit │  |
|  └─────────────────────┘ └──────────────────────┘ └──────────────────┘  |
+-------------------------------------------------------------------------+
            │                                           │
            ▼ (Prisma ORM)                              ▼ (Socket.IO & REST)
+-------------------------+                 +-----------------------------+
|  Microsoft SQL Server   |                 |      React Web HMI /        |
| (Transactional & Event) |                 |     Operations Board        |
+-------------------------+                 +-----------------------------+
```

---

## 2. Component Breakdown

| Component                 | Type             | Responsibility                                                                                                                                                                                   | Technology                          |
| ------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- |
| `Machine Simulator`       | Worker / Service | Manages state machines for 10 virtual injection molding machines (default: 8 normal, 1 slow cycle, 1 fault). Generates cycle pulses, simulates mold changes, and supports scenario reset/replay. | TypeScript, NestJS Provider         |
| `Ingestion Gateway`       | Backend Engine   | Receives machine telemetry events, validates schema contracts, enforces idempotency deduplication (`eventId`), and normalizes monotonic timestamps.                                              | NestJS, RxJS, class-validator       |
| `MES Core API Server`     | Backend API      | Orchestrates business workflows for work orders, production runs, current state projections, Andon dispatching, and OEE loss categorization.                                                     | NestJS, Prisma ORM, SWC             |
| `Event Streaming Gateway` | WebSocket Hub    | Broadcasts real-time machine telemetry, active Andon ticket alerts, and production output counters to web clients.                                                                               | Socket.IO, NestJS WebSocket Gateway |
| `Operations Web Client`   | Frontend SPA     | Shop floor visualization interface: real-time 10-machine board, order execution panel, operator scrap/stop forms, Andon response, and OEE Pareto analytics.                                      | React 19, Vite, TypeScript          |
| `Relational Database`     | Persistent DB    | Primary transactional store for master data, order lifecycles, append-only machine event logs, time segments, and security audit logs.                                                           | Microsoft SQL Server 2022           |

---

## 3. Routing & Middleware Strategy

### Fullstack (API + SPA)

- **API Route Prefix:** `/api/v1` for standard REST endpoints.
- **WebSocket Namespaces:**
  - `/ws/machines` — High-frequency machine telemetry, state transitions, and shot counters.
  - `/ws/andon` — Low-latency Andon alert notifications and technician escalation events.
- **Global Pipes & Interceptors:**
  - `ValidationPipe`: Validates incoming DTOs with `{ whitelist: true, forbidNonWhitelisted: true, transform: true }`.
  - `LoggingInterceptor`: Instruments request duration, tracing IDs, and logs execution anomalies.
  - `AllExceptionsFilter`: Sanitizes internal stack traces and formats standardized RFC 7807 error responses.
- **CORS Strategy:**
  - _Development:_ Frontend Vite dev server proxies `/api` directly to `http://localhost:3000` (zero CORS configuration required).
  - _Production:_ Restricted to trusted factory host origins with credential verification.

---

## 4. Data Flow

### 4.1 Machine Telemetry Ingestion Flow

```text
[Simulator / Fieldbus Adapter]
       │
       ▼ (Machine Event Payload: UUID, Timestamps, Normalized State, Counters)
[Ingestion Controller & Service]
       │
       ├──► [Validate Schema & Deduplication Check (eventId)]
       │         │ (If duplicate: Drop silently without state mutation)
       ▼
[machine_event_logs (Append-Only Persistent Log)]
       │
       ├──► [Update machine_current_states Projection]
       ├──► [Update production_runs Counters (if CYCLE_COMPLETED)]
       ├──► [Evaluate OEE Time Segment & Loss Classification]
       ▼
[Socket.IO Gateway] ──► [Broadcast to Operations Web Client (< 1000ms)]
```

### 4.2 Digital Andon & Downtime Resolution Flow

```text
[Operator / Machine Auto-Fault Trigger]
       │
       ▼
[Create Andon Ticket API] ──► [Persist Ticket (Status: OPEN)]
                                    │
                                    ▼ [Broadcast Alert to Technicians]
[Technician: Acknowledge Ticket] ──► [Status: IN_PROGRESS, Log Response Time]
                                    │
                                    ▼ [Investigate, Repair & Replace Part]
[Technician: Resolve & Close]    ──► [Status: RESOLVED, Log Resolution Time]
                                    │
                                    ▼ [Classify Verified Downtime Reason in OEE Engine]
```

---

## 5. Security Plan

| Area                | Strategy                                                                                                                                                                     |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Authentication**  | Token-based authentication using JSON Web Tokens (JWT) with short lifespans and encrypted refresh tokens. Passwords hashed using Argon2 / Bcrypt with per-user unique salts. |
| **Authorization**   | Strict Role-Based Access Control (RBAC) supporting 9 canonical roles. Enforced at the controller route level via `@Roles()` decorators and `RolesGuard`.                     |
| **CSRF Protection** | Stateless Bearer token architecture (`Authorization: Bearer <token>`) natively immune to browser-mediated CSRF.                                                              |
| **XSS Prevention**  | Automatic context-aware DOM escaping in React; input sanitization and payload stripping via NestJS `ValidationPipe`.                                                         |
| **SQL Injection**   | Parameterized query binding enforced automatically via Prisma ORM; zero raw string concatenation in SQL queries.                                                             |
| **Audit Logging**   | Immutable append-only `audit_logs` table recording user actions, timestamps, entity IDs, and pre/post mutation JSON snapshots for critical operations.                       |

---

## 6. Deployment Architecture

```text
[Local Dev / Demonstration] ──► [Docker Compose: MS SQL Server 2022]
                            ──► [pnpm dev (Concurrently: NestJS Backend + Vite Frontend)]
                            ──► [Integrated 10-Machine Deterministic Simulator]
```

| Environment           | Host Server                  | Port / Domain                                         | Target Git Branch      |
| --------------------- | ---------------------------- | ----------------------------------------------------- | ---------------------- |
| **Local Development** | Localhost Workstation        | Backend: `3000`, Frontend: `5173`, SQL Server: `1433` | `feature/*`, `develop` |
| **Staging / Demo**    | Single Dockerized Linux Host | `mes-staging.local` (Nginx Reverse Proxy)             | `develop`              |
| **Production**        | Industrial On-Premise Host   | Internal Factory Subnet / HTTPS Port 443              | `main`                 |

---

## 7. Key Architecture Decisions

| #   | Decision                                                  | Rationale                                                                                                                                                                      | ADR Reference                                                                                                                                                                 |
| --- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Microsoft SQL Server 2022 with Prisma ORM                 | Aligns with enterprise industrial standards; Prisma provides end-to-end static type-safety for relational schemas and migrations.                                              | [`docs/notes/ADR-001-database-choice.md`](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/docs/notes/ADR-001-database-choice.md)                     |
| 2   | Modular Monolith Architecture Pattern                     | Minimizes network complexity, avoids distributed transaction overhead, and provides single-process deployment for local demo reproducibility.                                  | [`docs/notes/ADR-002-modular-monolith.md`](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/docs/notes/ADR-002-modular-monolith.md)                   |
| 3   | Separation of Current State Projection from Event History | Current state projection (`machine_current_states`) serves high-frequency dashboard reads in $O(1)$, while `machine_event_logs` provides an immutable append-only audit trail. | [`docs/notes/ADR-003-event-state-separation.md`](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/docs/notes/ADR-003-event-state-separation.md)       |
| 4   | Deterministic Multi-Machine Simulator with Scenario Seeds | Guarantees 100% reproducible test scenarios for steady-state (8 machines), slow-cycle (1 machine), and fault/Andon (1 machine) without requiring physical shop floor hardware. | [`docs/notes/ADR-004-deterministic-simulator.md`](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/docs/notes/ADR-004-deterministic-simulator.md)     |
| 5   | Protocol-Agnostic Normalized Event Contract               | Decouples core MES manufacturing business logic from specific physical fieldbus protocols (OPC UA, MQTT Sparkplug B, Modbus).                                                  | [`docs/notes/ADR-005-normalized-event-contract.md`](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/docs/notes/ADR-005-normalized-event-contract.md) |
