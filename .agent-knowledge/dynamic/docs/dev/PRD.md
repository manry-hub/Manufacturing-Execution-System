# Product Requirements Document — Manufacturing Execution System (MES)

> **Status:** `PLANNING` — New Project Mode (System Blueprint v1.0 & Initial MVP Decisions)  
> **Purpose:** Single source of truth for product vision, user stories, and features to be built.

---

## 1. Product Vision

### Elevator Pitch

MES is a unified Manufacturing Execution System platform designed to manage and monitor production execution in injection molding manufacturing plants (and discrete manufacturing domains), seamlessly interconnecting production orders, machines, operators, materials, quality gates, maintenance workflows, and operational analytics into a single application.

### Problem Statement

Injection molding facilities face persistent operational challenges:

1. **Lack of Real-Time Visibility:** Floor supervisors lack continuous, real-time visibility into machine states, running cycle times, and order execution progress across multiple production lines.
2. **Lagging Downtime & Micro-Stop Response:** Communication gaps delay technician dispatch when machines trip or experience frequent unrecorded micro-stops ($<60\text{s}$).
3. **Inauditable & Manual OEE Calculations:** OEE metrics compiled manually at shift ends are prone to errors, inconsistent time allocations, and cannot be traced back to raw machine telemetry events.
4. **Siloed Maintenance and Quality Data:** Maintenance work orders, mold service records, and scrap/defect reports exist in isolated spreadsheets, disconnected from the machine events that caused them.
5. **Incomplete Material Traceability:** Inability to track which specific resin lots or molds produced a given finished serialized product during quality containment investigations.

### Target Users

| Role                               | Description                                      | Primary Needs                                                                                                                                              |
| ---------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **System Administrator**           | System governance and platform administrator     | User administration, role-based access control (RBAC), data source/simulator connectivity configuration, and immutable system audit trails.                |
| **Production Planner**             | Work scheduler and plant capacity planner        | Creating and releasing production orders, setting target quantities and deadlines, assigning operation routings, and tracking planned vs. actual output.   |
| **Production Supervisor**          | Daily shop floor supervisor and line coordinator | Assigning orders to work centers, real-time multi-machine monitoring across all plant areas, authorizing mold changeovers, and managing escalation queues. |
| **Machine Operator**               | Workstation operator at individual machines      | Viewing active job instructions, initiating/pausing runs, logging manual scrap reasons, and triggering Digital Andon tickets.                              |
| **Quality Inspector**              | Quality assurance and inspection officer         | Defining sampling inspection plans, recording defect codes/quantities, and applying `HOLD`, `RELEASED`, or `REWORK` lot status.                            |
| **Maintenance Technician**         | Shop floor maintenance engineer                  | Receiving real-time Andon alerts, acknowledging tasks, recording diagnostic root causes, and executing corrective maintenance actions.                     |
| **Maintenance Supervisor**         | Equipment reliability and asset manager          | Managing preventive maintenance schedules, tracking MTTR/MTBF, and analyzing recurring breakdown patterns.                                                 |
| **Material Handler**               | Warehouse and raw material coordinator           | Registering resin material lots, assigning lots to machines/orders, and managing WIP transfer between stations.                                            |
| **Management / Read-only Analyst** | Executive leadership and industrial engineers    | High-level OEE trend analytics, downtime Pareto charts, reject loss breakdowns, and plant/shift efficiency comparisons.                                    |

---

## 2. User Stories / Use Cases

### Epic 1: Plant & Master Data Management

| ID     | User Story                                                                                                                              | Priority | Acceptance Criteria                                                                                                                            |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| US-001 | As an Administrator, I want to manage plants, areas, work centers, and machines so that the physical hierarchy is accurately modeled.   | P0       | Full CRUD for plant structure; each machine retains a permanent, immutable Machine ID regardless of physical relocation between areas.         |
| US-002 | As a Planner, I want to manage product catalogs, molds, shifts, and production calendars so that operational baseline parameters exist. | P0       | Compatibility matrix between products, molds, and machines is established; ideal cycle times are defined per product-mold-machine combination. |

### Epic 2: Production Planning & Execution

| ID     | User Story                                                                                                                                     | Priority | Acceptance Criteria                                                                                                                                                      |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| US-003 | As a Planner, I want to create and release production orders with specific routings so that shop floor teams can execute them.                 | P0       | Order lifecycle transitions strictly: `DRAFT → RELEASED → IN_PROGRESS → COMPLETED` (with `ON_HOLD` / `CANCELLED` guards); target quantities and deadlines are validated. |
| US-004 | As a Supervisor/Operator, I want to start, pause, and close production runs on assigned machines so that order execution progress is recorded. | P0       | Machine cycle telemetry automatically increments run counters; run completion requires explicit reconciliation of total shots, good parts, and scrap before closure.     |

### Epic 3: Machine Monitoring & Telemetry Ingestion

| ID     | User Story                                                                                                                             | Priority | Acceptance Criteria                                                                                                                                                           |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US-005 | As a Supervisor, I want to view a real-time board of all 10 virtual machines so that abnormal machine states are detected immediately. | P0       | Dashboard displays normalized statuses (`RUNNING`, `STOPPED`, `FAULT`, `SETUP`, `IDLE`, `DISCONNECTED`, `UNKNOWN`); real-time updates push via WebSocket in $<1000\text{ms}$. |
| US-006 | As the System, I want to ingest, validate, and normalize machine telemetry events so that the event history is clean and idempotent.   | P0       | Duplicate `eventId` payloads are rejected without side effects; source timestamp and arrival timestamp are stored separately; `DISCONNECTED` is not treated as `STOPPED`.     |

### Epic 4: OEE & Production Analytics

| ID     | User Story                                                                                                                              | Priority | Acceptance Criteria                                                                                                                                                    |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US-007 | As Management, I want to inspect OEE, Availability, Performance, and Quality metrics that can be audited back to raw events.            | P1       | Calculations strictly follow ISO 22400-2; planned vs. unplanned stops are separated; zero-division, performance over-speed, and counter resets are gracefully handled. |
| US-008 | As a Supervisor, I want to view Pareto charts of downtime reasons and scrap defect codes so that operational losses can be prioritized. | P1       | Pareto charts rank top downtime duration categories and top defect counts for any selected machine, area, shift, or date range.                                        |

### Epic 5: Digital Andon & Downtime Management

| ID     | User Story                                                                                                                                     | Priority | Acceptance Criteria                                                                                                                                           |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US-009 | As an Operator, I want to trigger Digital Andon tickets when machines or processes encounter issues so that support teams respond quickly.     | P1       | Ticket records Machine ID, active Order ID, category, and timestamp; automated machine fault events do not create duplicate tickets if one is already active. |
| US-010 | As a Technician, I want to acknowledge tickets and record root causes and corrective actions so that response and resolution times are logged. | P1       | System captures response timestamp, resolution timestamp, confirmed root cause, and assigns the verified downtime classification to the OEE engine.           |

### Epic 6: Identity, Access & Audit

| ID     | User Story                                                                                                                              | Priority | Acceptance Criteria                                                                                                                                     |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US-011 | As a User, I want to log in with secure credentials and access features authorized for my role so that operational safety is preserved. | P0       | JWT authentication with argon2/bcrypt password hashing; backend RBAC guards reject unauthorized cross-role requests with HTTP 403.                      |
| US-012 | As an Administrator, I want to inspect audit logs for critical data mutations so that system actions are fully accountable.             | P0       | Mutations to order states, master configurations, and maintenance resolutions are recorded in `audit_logs` with actor ID, timestamp, and payload diffs. |

### Epic 7: Quality, Material & Maintenance (Post-MVP Core)

| ID     | User Story                                                                                                                     | Priority | Acceptance Criteria                                                                                                    |
| ------ | ------------------------------------------------------------------------------------------------------------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------- |
| US-013 | As a Quality Inspector, I want to record sampling inspection results and mark lots as `HOLD`, `RELEASED`, or `REWORK`.         | P2       | Parts marked as `HOLD` are excluded from finalized good production output until officially dispositioned.              |
| US-014 | As a Material Handler, I want to assign resin material lots to machines/runs to enable forward and backward genealogy tracing. | P2       | Material lot tracking links consumed raw resin heats to specific production runs and finished serial numbers.          |
| US-015 | As a Maintenance Supervisor, I want to manage preventive maintenance schedules and monitor MTTR/MTBF metrics.                  | P2       | Maintenance work orders link to Andon tickets and equipment service histories; MTTR/MTBF metrics update automatically. |

---

## 3. Feature List

### MVP (Minimum Viable Product)

| #   | Feature                       | Description                                                                                                                         | Epic   |
| --- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | Master Data Management        | CRUD for Plant, 4 Areas, Work Centers, Machines, Products, Molds, Shifts, and Production Calendars.                                 | Epic 1 |
| 2   | Production Order Management   | Full lifecycle tracking (`DRAFT → RELEASED → IN_PROGRESS → COMPLETED`), operation routings, and machine assignments.                | Epic 2 |
| 3   | Multi-Machine Simulator       | Deterministic 10-machine virtual simulator supporting baseline normal flow and triggerable slow-cycle / fault scenarios.            | Epic 3 |
| 4   | Telemetry Ingestion & History | Ingestion of normalized event payloads, idempotency deduplication, timestamp separation, and append-only event logging.             | Epic 3 |
| 5   | Real-Time Monitoring Board    | Live shop floor dashboard for 10 machines with WebSocket updates, area/status filters, shot counters, and event timelines.          | Epic 3 |
| 6   | Production Run Execution      | Real-time shot counter aggregation, output tracking, manual scrap reporting, and run reconciliation.                                | Epic 2 |
| 7   | OEE Calculation Engine        | Rigorous ISO 22400-2 OEE engine (Availability, Performance, Quality) with time conservation and multi-machine weighted aggregation. | Epic 4 |
| 8   | Digital Andon System          | Dispatch workflow: ticket creation, technician assignment, acknowledgement tracking, and root cause classification.                 | Epic 5 |
| 9   | Downtime Pareto & Analytics   | Downtime Pareto rankings, scrap defect distribution, and multi-machine comparative performance views.                               | Epic 4 |
| 10  | RBAC & Security Audit Trail   | Local JWT authentication, 9 canonical user roles, endpoint authorization guards, and immutable audit logging.                       | Epic 6 |

### Post-MVP / Future

| #   | Feature                       | Description                                                                                                | Priority         |
| --- | ----------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------- |
| 1   | Quality Management & Sampling | Inspection plans, sampling checklists, nonconformance workflows, and hold/rework dispositions.             | High (Phase 4)   |
| 2   | Material Lots & Genealogy     | Resin lot tracking, multi-echelon WIP movement, and bi-directional traceability DAGs.                      | High (Phase 4)   |
| 3   | Mold & Recipe Management      | Mold stroke accumulation tracking, process recipe versioning, and mold changeover checklists.              | Medium (Phase 5) |
| 4   | Maintenance Management        | Preventive maintenance calendar, maintenance work orders, spare parts consumption, and MTTR/MTBF tracking. | Medium (Phase 5) |
| 5   | Physical OPC UA Adapter       | Fieldbus connectivity engine conforming to OPC 40077 (Euromap 77) for physical machine controllers.        | Medium (Phase 6) |
| 6   | Advanced Analytics & FMEA     | Long-term OEE trend projections, FMEA-based risk prioritization, and cycle deviation pattern analysis.     | Low (Phase 6)    |

---

## 4. Constraints & Assumptions

### Constraints

- **Non-Safety-Critical Boundary:** MES strictly operates as an execution and monitoring platform. It does NOT command physical machine movements, actuate hydraulic valves, or replace physical safety interlocks.
- **Non-ERP Boundary:** System excludes corporate financial accounting (General Ledger, AP/AR), payroll, invoicing, and enterprise procurement.
- **Local Development & Demonstration:** The initial development target is a reproducible local environment using Docker Compose for infrastructure dependencies and an integrated simulator.
- **Database Engine:** Standardized on Microsoft SQL Server 2022 with Prisma ORM for relational constraints and indexed time-series event querying.

### Assumptions

- One model plant facility configured with 4 operational areas: _Injection Production_, _Finishing & Inspection_, _Material & Mold Preparation_, and _Quality & Maintenance_.
- Demonstrations use **10 virtual injection molding machines** operating with independent state machines.
- **Default Simulator Configuration:**
  - 8 machines operate in normal flow (baseline steady-state).
  - 1 machine enters a slow-cycle condition upon scenario activation (demonstrating Performance loss).
  - 1 machine experiences a critical fault upon scenario activation (demonstrating Andon dispatch and Availability loss).
  - All scenarios can be reset and replayed with 100% reproducibility via scenario seeds.
- Controller signals are translated by an ingestion adapter into the MES internal event contract before processing.
- All simulated telemetry is explicitly tagged with `isSimulated: true`.

---

## 5. Success Metrics

| Metric                        | Target           | Measurement Method                                                                                                        |
| ----------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **OEE Auditability**          | 100%             | Every calculated OEE figure can be reconstructed back to discrete, non-overlapping raw event timestamps.                  |
| **Ingestion Idempotency**     | 0 duplicates     | Replaying identical `eventId` payloads creates 0 duplicate production counts or time segment records.                     |
| **Machine State Isolation**   | 100%             | Injecting a fault or disconnect on machine #1 causes zero state alterations or side-effects on machines #2–#10.           |
| **Dashboard Latency**         | $<1000\text{ms}$ | Measured elapsed duration from simulator cycle completion to WebSocket UI state reflection in the browser.                |
| **Simulator Reproducibility** | 100%             | Replaying a scenario with the same seed generates identical event sequences, shot tallies, and OEE results.               |
| **Authorization Enforcement** | 100%             | Cross-role privilege escalation attempts (e.g., an Operator modifying master process routings) return HTTP 403 Forbidden. |

---

## 6. Out of Scope

**Explicitly excluded from this phase:**

- Enterprise Resource Planning (ERP): Financial ledger, tax reporting, accounts payable/receivable, payroll, HR, and vendor procurement.
- Physical Machine Motion Control: Direct actuation, servo motor commands, or overriding physical emergency stops.
- Physical Machine Safety Interlocks: Machine enclosure door switches, light curtains, and safety relays.
- Physics-Based Digital Twins: FEA thermal/stress simulations or 3D mold plastic flow rheology simulations.
- Mandatory Physical PLC Hardware: Initial phases utilize the software-in-the-loop multi-machine simulator.
- Unvalidated AI/ML Predictive Maintenance: Predictive failure modeling is deferred until verified historical operational datasets exist.
