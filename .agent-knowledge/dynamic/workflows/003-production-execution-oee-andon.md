# Implementation Workflow 003: Production Execution, ISO 22400-2 OEE Engine & Digital Andon (Phase 3)

**Status:** PROPOSED PLAN — READY FOR STAGED EXECUTION  
**Target Completion:** Phase 3 (Production Orders, Active Runs, ISO 22400-2 OEE Engine, & Digital Andon Workflows)  
**References:**

- Product Requirements: [PRD.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/.agent-knowledge/dynamic/docs/dev/PRD.md)
- Architecture Plan: [ARCHITECTURE.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/.agent-knowledge/dynamic/docs/dev/sdd/ARCHITECTURE.md)
- Database Plan: [DATABASE.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/.agent-knowledge/dynamic/docs/dev/sdd/DATABASE.md)
- OEE Calculation Specification: [MES-OEE-CALCULATION-SPEC.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/docs/notes/MES-OEE-CALCULATION-SPEC.md)
- State Machine & Event Spec: [MES-STATE-MACHINE-EVENT-SPEC.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/docs/notes/MES-STATE-MACHINE-EVENT-SPEC.md)
- Machine Data Dictionary: [MES-MACHINE-DATA-DICTIONARY.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/docs/notes/MES-MACHINE-DATA-DICTIONARY.md)

---

## 1. Executive Summary & Domain Scope

Phase 3 implements the **core operational intelligence** of the MES. While Phase 1 delivered the master data foundation and Phase 2 built the 10-machine simulator and telemetry ingestion pipeline, Phase 3 connects actual shop floor execution to mathematical KPIs and operational problem resolution:

```text
Shop Floor Telemetry (Phase 2 Ingestion & Simulator)
                       │
                       │ Normalized Cycle & State Events
                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Production Execution Engine (Module: Production)                                │
│  ├── Work Orders (DRAFT ──► RELEASED ──► IN_PROGRESS ──► COMPLETED)             │
│  ├── Production Runs (SETUP ──► ACTIVE ──► PAUSED ──► COMPLETED)                │
│  ├── Active Run Binding: Links Machine Current State to Order, Mold, & Product  │
│  └── Automatic Output Accumulation: Shotted cycles increment run good/reject    │
└──────────────────────┬──────────────────────────────────┬───────────────────────┘
                       │                                  │
                       │ Time Segments & Output           │ Machine Fault Alarms
                       ▼                                  ▼
┌─────────────────────────────────────────┐  ┌────────────────────────────────────┐
│ ISO 22400-2 OEE Engine (Module: OEE)    │  │ Digital Andon Engine (Module: Andon│
│  ├── Availability = Run Time / PPT      │  │  ├── Auto-dispatch on Fault Alarms │
│  ├── Performance = Ideal Time / Run Time│  │  ├── Manual Operator Assistance    │
│  ├── Quality = Good Parts / Total Parts │  │  ├── FSM: OPEN ──► ACK ──► RESOLVE │
│  ├── Overall OEE = A × P × Q            │  │  ├── MTTR & Response Analytics     │
│  └── Multi-Machine Weighted Aggregation │  │  └── Pareto Breakdown by Cause     │
└──────────────────────┬──────────────────┘  └─────────────────┬──────────────────┘
                       │                                       │
                       └───────────────────┬───────────────────┘
                                           │ Real-Time Broadcasts
                                           ▼
               WebSocket Gateway (/ws/telemetry & live subscriptions)
```

---

## 2. Granular Stage-by-Stage Implementation Plan

### Stage 1: Production Planning & Shop Floor Execution Engine

_Objective: Manage work orders, production runs, tooling bindings, and real-time scrap recording._

1. **Production Order Management (`backend/src/modules/production/services/orders.service.ts`)**:
   - Status FSM: `DRAFT` $\rightarrow$ `RELEASED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `COMPLETED` (or `CANCELLED`).
   - Order creation: validates product part number, target quantity, planned start time.
   - Release validation: verifies tooling compatibility and machine availability.
2. **Production Run Execution (`backend/src/modules/production/services/runs.service.ts`)**:
   - Status FSM: `SETUP` $\rightarrow$ `ACTIVE` $\rightarrow$ `PAUSED` $\rightarrow$ `COMPLETED`.
   - Dispatch binding: mounts specific `moldId` on `machineId`, binds `activeRunId` in `machine_current_states`.
   - Real-time cycle reconciliation:
     - Hooked to `TelemetryIngestionService`: on `CYCLE_COMPLETED`, automatically increments `totalShots` on the active run.
     - Calculates finished parts based on mold cavity multiplier:
       $$\text{Good Parts Added} = \text{Shots} \times \text{Mold Cavity Count}$$
   - Scrap and reject recording:
     - `POST /api/v1/production/runs/:id/scrap` (`{ rejectQuantity: number, reasonCode: string, notes?: string }`).
     - Adjusts `rejectQuantity` and updates `goodQuantity = totalQuantity - rejectQuantity`.
3. **Production REST Controller (`backend/src/modules/production/production.controller.ts`)**:
   - `GET /api/v1/production/orders` (filterable by status, product).
   - `POST /api/v1/production/orders` (create order, RBAC: `Production Planner` / `Admin`).
   - `PATCH /api/v1/production/orders/:id/release` (release order to shop floor).
   - `POST /api/v1/production/runs/start` (dispatch run to machine, binds mold & order).
   - `POST /api/v1/production/runs/:id/pause` & `resume`.
   - `POST /api/v1/production/runs/:id/complete` (closes active run, unbinds from machine).
   - `POST /api/v1/production/runs/:id/scrap` (records defect parts).

---

### Stage 2: Mathematical ISO 22400-2 OEE Engine

_Objective: Implement mathematically rigorous OEE calculations with Zero Temporal Leakage and weighted aggregation._

1. **OEE Core Mathematical Calculator (`backend/src/modules/oee/oee-calculator.ts`)**:
   - **Zero Temporal Leakage Invariant**:
     $$\sum \Delta t_{\text{Running}} + \sum \Delta t_{\text{PlannedDowntime}} + \sum \Delta t_{\text{UnplannedDowntime}} + \sum \Delta t_{\text{Setup}} + \sum \Delta t_{\text{Idle}} \equiv T_{\text{end}} - T_{\text{start}}$$
   - **Formulations**:
     - $\text{Availability} = \frac{\text{Run Time}}{\text{Planned Production Time}}$
       (where $\text{Run Time} = \sum \Delta t_{\text{OPERATING}}$ and $\text{PPT} = \text{Total Window} - \sum \Delta t_{\text{NON\_SCHEDULED}}$).
     - $\text{Performance} = \frac{\text{Ideal Cycle Time} \times \text{Total Parts Produced}}{\text{Run Time}}$
       (where $\text{Total Parts} = \text{Total Shots} \times \text{Cavity Count}$).
     - $\text{Quality} = \frac{\text{Good Count}}{\text{Total Parts Produced}}$
     - $\text{OEE} = \text{Availability} \times \text{Performance} \times \text{Quality}$
   - **Boundary Conditions & Defensive Guards**:
     - Division by zero returns `0.0000` with explicit validity metadata.
     - If $\text{Performance} > 1.0$, system records exact metric and asserts `SPEED_OVER_PERFORMANCE` warning flag without artificial clipping.
2. **Multi-Machine & Plant Weighted Aggregation**:
   - Strictly implements weighted aggregation:
     $$\text{Plant OEE} = \left(\frac{\sum \text{Run Time}_i}{\sum \text{PPT}_i}\right) \times \left(\frac{\sum \text{Ideal Time}_i \times \text{Parts}_i}{\sum \text{Run Time}_i}\right) \times \left(\frac{\sum \text{Good Parts}_i}{\sum \text{Total Parts}_i}\right)$$
   - Rejects simple unweighted arithmetic averaging ($\frac{1}{N}\sum \text{OEE}_i$).
3. **OEE Service & Persistence (`backend/src/modules/oee/oee.service.ts`)**:
   - Calculates OEE across arbitrary windows:
     - `RUN`: OEE for a specific `ProductionRun`.
     - `SHIFT`: Rolling 8-hour shift window.
     - `DAY`: 24-hour window.
   - Persists calculated metrics in `oee_results` table for historical reporting and trends.
4. **OEE REST Controller (`backend/src/modules/oee/oee.controller.ts`)**:
   - `GET /api/v1/oee/machines/:id?window=SHIFT|DAY|RUN` (Machine OEE breakdown).
   - `GET /api/v1/oee/plant?window=SHIFT|DAY` (Plant-wide weighted OEE).
   - `GET /api/v1/oee/runs/:runId` (Run-specific OEE).

---

### Stage 3: Digital Andon & Problem Escalation Engine

_Objective: Automated alarm dispatching, manual operator ticketing, and downtime root-cause analytics._

1. **Andon Ticket FSM (`backend/src/modules/andon/services/andon.service.ts`)**:
   - Status FSM:
     ```text
     [OPEN] ──(Acknowledge)──► [ACKNOWLEDGED] ──(Diagnose)──► [IN_PROGRESS] ──(Resolve)──► [RESOLVED]
     ```
   - **Automated Fault Integration**:
     - Hooked to `TelemetryIngestionService`: when `FAULT_STARTED` event arrives on a machine (e.g. `IMM-10` tripping `UNP-HYD-JAM`), engine automatically creates an `AndonTicket` (`category: 'MAINTENANCE'`, `status: 'OPEN'`, `faultCode`).
   - **Manual Operator Ticketing**:
     - Operators can submit ticket: categories include `QUALITY`, `MAINTENANCE`, `MATERIAL`, `SAFETY`.
   - **Lifecycle Transitions**:
     - `acknowledgeTicket(ticketId, technicianId)`: records `responseTime = now`, sets status to `ACKNOWLEDGED`.
     - `resolveTicket(ticketId, { confirmedRootCause, correctiveAction })`: records `resolutionTime = now`, sets status to `RESOLVED`.
2. **Andon & Downtime Analytics**:
   - **MTTR & Response Metrics**:
     $$\text{MTTR}_{\text{response}} = \text{Average}(\text{responseTime} - \text{reportTime})$$
     $$\text{MTTR}_{\text{resolve}} = \text{Average}(\text{resolutionTime} - \text{responseTime})$$
   - **Downtime Pareto Analysis**:
     - Aggregates `machine_time_segments` and `andon_tickets` by reason code/category.
     - Computes cumulative downtime minutes and percentage contribution ($80/20$ Pareto rule).
3. **Andon REST Controller (`backend/src/modules/andon/andon.controller.ts`)**:
   - `GET /api/v1/andon/tickets` (list active and resolved tickets, filterable by machine, status, category).
   - `POST /api/v1/andon/tickets` (manual ticket creation by operator).
   - `POST /api/v1/andon/tickets/:id/acknowledge` (technician response).
   - `POST /api/v1/andon/tickets/:id/resolve` (root cause and resolution sign-off).
   - `GET /api/v1/andon/analytics/pareto` (Pareto analysis of downtime causes).
   - `GET /api/v1/andon/analytics/mttr` (MTTR response and resolution metrics).

---

### Stage 4: Real-Time Event Wiring & Notifications

_Objective: Connect Phase 3 domain events to the WebSocket gateway for instant shop floor visibility._

1. **WebSocket Event Extensions**:
   - Broadcast `andon:created` to `plant:all` and `machine:{id}` when a ticket is reported/auto-dispatched.
   - Broadcast `andon:status_changed` upon acknowledgment and resolution.
   - Broadcast `production:run_updated` with real-time good/reject piece counts.
   - Broadcast `oee:snapshot` with real-time Availability, Performance, Quality updates.

---

### Stage 5: Verification & Quality Suite

_Objective: Verify all mathematical formulas, lifecycle transitions, automated dispatching, and integration flows._

1. **Unit Test Suite**:
   - `oee-calculator.spec.ts`: Validates ISO 22400-2 equations, zero temporal leakage, division by zero guards, speed-over-performance warnings, and weighted aggregation formulas.
   - `orders.service.spec.ts` & `runs.service.spec.ts`: Validates order/run FSM, cavity multiplier, scrap logging.
   - `andon.service.spec.ts`: Validates automated fault ticket creation, FSM transitions, MTTR calculations, Pareto sorting.
2. **E2E Integration Test Suite (`backend/test/production-oee-andon.e2e-spec.ts`)**:
   - Complete end-to-end shop floor production flow:
     1. Create production order for `PRD-AUTO-BUMPER` (target: 500 pcs).
     2. Release order and start run on `IMM-01` with mold `MOLD-BUMP-2C` (2 cavities).
     3. Ingest simulated cycles $\rightarrow$ verifies `totalShots` and `goodQuantity` increment in DB.
     4. Report scrap of 10 defective parts $\rightarrow$ verifies `rejectQuantity` updates.
     5. Query OEE $\rightarrow$ verifies Availability, Performance, Quality, and OEE match ISO 22400-2 exact values.
     6. Trip fault on `IMM-10` with `UNP-HYD-JAM` $\rightarrow$ verifies automated Andon ticket is generated.
     7. Acknowledge and resolve Andon ticket $\rightarrow$ verifies status becomes `RESOLVED` and MTTR timestamps recorded.
     8. Query Pareto analytics $\rightarrow$ verifies `UNP-HYD-JAM` appears at top of downtime Pareto chart.
3. **Static Analysis & Monorepo Build**:
   - `pnpm lint` (0 errors, 0 warnings).
   - `pnpm build` (clean SWC + Vite compilation).

---

## 3. Observable Completion Criteria (Phase 3 Definition of Done)

Phase 3 is complete and verified when:

1. [ ] **Production Order & Run Lifecycle:** Work orders can be created, released, and dispatched to machines with active tooling bindings.
2. [ ] **Real-Time Output Tracking:** Completed cycles from simulator/telemetry automatically accumulate shots and parts based on mold cavity multipliers.
3. [ ] **Defect & Scrap Accounting:** Operators can log defect quantities with reason codes, updating run yield in real time.
4. [ ] **Mathematically Sound OEE:** ISO 22400-2 Availability, Performance, Quality, and Overall OEE calculate accurately across machines and runs with Zero Temporal Leakage.
5. [ ] **Weighted Factory Aggregation:** Multi-machine and plant-wide OEE uses proper time-and-quantity weighting rather than simple arithmetic averages.
6. [ ] **Automated Andon Dispatch:** Equipment trip alarms (e.g. `UNP-HYD-JAM` on `IMM-10`) automatically create an open Digital Andon ticket.
7. [ ] **Andon Workflow & MTTR:** Technicians can acknowledge and resolve tickets with root causes, capturing accurate response and resolution durations.
8. [ ] **Downtime Pareto Analytics:** Top downtime reasons are computed and ranked according to cumulative duration and frequency.
9. [ ] **Test Coverage:** All unit tests and E2E integration tests pass with 100% success rate (`pnpm test` and `pnpm test:e2e`).
10. [ ] **Static Analysis & Build:** `pnpm lint` reports 0 errors / 0 warnings and `pnpm build` succeeds.

---

## 4. Next Step Transition (Phase 4 Preview)

Upon successful validation and sign-off of Phase 3:

- **Proceed to Phase 4: Frontend Operator & Supervisory Dashboards (React + Vite)**.
- Connect the React 19 frontend to backend REST APIs and Socket.IO WebSocket streams.
- Deliver the Plant Overview Matrix (10-machine cards), Machine Detail View (pressure curves, zone temperatures), OEE Pareto Dashboards, and Digital Andon Operator Terminal.
