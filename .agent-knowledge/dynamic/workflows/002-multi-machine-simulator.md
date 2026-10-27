# Implementation Workflow 002: Multi-Machine Simulator & Telemetry Ingestion (Phase 2)

**Status:** PROPOSED PLAN — READY FOR STAGED EXECUTION  
**Target Completion:** Phase 2 (Multi-Machine Simulator, Event Ingestion Pipeline, & Real-Time WebSocket Telemetry)  
**References:**

- Product Requirements: [PRD.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/.agent-knowledge/dynamic/docs/dev/PRD.md)
- Architecture Plan: [ARCHITECTURE.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/.agent-knowledge/dynamic/docs/dev/sdd/ARCHITECTURE.md)
- Database Plan: [DATABASE.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/.agent-knowledge/dynamic/docs/dev/sdd/DATABASE.md)
- State Machine & Event Spec: [MES-STATE-MACHINE-EVENT-SPEC.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/docs/notes/MES-STATE-MACHINE-EVENT-SPEC.md)
- Machine Data Dictionary: [MES-MACHINE-DATA-DICTIONARY.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/docs/notes/MES-MACHINE-DATA-DICTIONARY.md)
- ADR-004 (Deterministic Simulator): [ADR-004-deterministic-simulator.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/docs/notes/ADR-004-deterministic-simulator.md)
- ADR-005 (Normalized Event Contract): [ADR-005-normalized-event-contract.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/docs/notes/ADR-005-normalized-event-contract.md)

---

## 1. Executive Summary & Architecture Context

Phase 2 builds the **multi-machine telemetry backbone** of the MES. In industrial manufacturing execution, the MES core must ingest high-frequency equipment state changes and sensor streams while maintaining strict decoupling from heterogeneous machine controllers (Euromap 77, OPC UA, or Beckhoff/Siemens PLCs).

To validate real-time latency, state projection integrity, and downstream OEE computation without physical factory equipment, this phase delivers an **in-process, deterministic 10-Machine Simulator** operating under the approved **8 + 1 + 1 baseline configuration**:

```text
Shop Floor (10 Virtual Injection Molding Machines: IMM-01 to IMM-10)
┌─────────────────────────────────────────────────────────────────────────────────┐
│  IMM-01 to IMM-08       IMM-09 (Candidate)            IMM-10 (Candidate)        │
│  [Normal Flow]          [Slow-Cycle Scenario]         [Fault / Andon Scenario]  │
│  Standard Cycle Time    Cycle Time +40% to +60%       Hydraulic / Thermal Trip  │
│  Nominal OEE Baseline   Performance Loss Analysis     Availability Downtime     │
└──────────────────────────────────────┬──────────────────────────────────────────┘
                                       │ Normalized JSON Telemetry Events
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Ingestion Engine (TelemetryIngestionService)                                    │
│  ├── Idempotency Check (eventId uniqueness constraint in DB)                    │
│  ├── Chronological Resequencing & Machine ID Resolution                         │
│  ├── State Projection: Atomic Update to `machine_current_states`                │
│  ├── Time Slicing: Open/Close `machine_time_segments`                           │
│  └── Telemetry Archive: Append to `machine_event_logs`                          │
└──────────────────────────────────────┬──────────────────────────────────────────┘
                                       │ Broadcast Event Stream
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Real-Time Broadcast Gateway (Socket.IO WebSocket Gateway)                       │
│  ├── Room Subscriptions: `plant:all`, `machine:{machineId}`                     │
│  └── Sub-500ms Push to Frontend Live Monitoring Dashboards                      │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Granular Stage-by-Stage Implementation Plan

### Stage 1: Normalized Telemetry Contract & Ingestion Pipeline

_Objective: Build the domain ingestion engine that validates, deduplicates, and commits equipment events._

1. **Telemetry DTOs & Validation Contracts (`backend/src/modules/telemetry/dto/`)**:
   - `NormalizedMachineEventDto`:
     - `eventId`: UUID v4 string (database uniqueness key).
     - `machineId`: Machine code (`IMM-01`) or UUID.
     - `sourceId`: Emitter node identifier (e.g. `SIMULATOR-01`).
     - `sourceType`: `Enum` (`SIMULATOR`, `OPC_UA`, `MQTT_SPB`).
     - `sourceTimestamp`: ISO-8601 wall-clock timestamp from equipment clock.
     - `receivedTimestamp`: ISO-8601 timestamp generated at ingestion entry.
     - `eventType`: `Enum` (`MACHINE_STATE_CHANGED`, `CYCLE_COMPLETED`, `COUNTER_UPDATED`, `FAULT_STARTED`, `FAULT_CLEARED`, `SETUP_STARTED`, `SETUP_COMPLETED`, `JOB_CONTEXT_CHANGED`, `PARAMETER_SAMPLE_RECEIVED`, `SOURCE_CONNECTION_CHANGED`).
     - `rawStatus`: Native string emitted by machine control (e.g. `CLAMPING`, `INJECTION_HOLD`, `COOLING_DWELL`).
     - `normalizedStatus`: Canonical MES status (`RUNNING`, `IDLE`, `SETUP`, `STOPPED`, `FAULT`, `DISCONNECTED`, `UNKNOWN`).
     - `metrics`: Optional cycle metrics (`cycleCounter`, `cycleTimeSeconds`, `cushionPositionMm`, `peakInjectionPressureBar`, `barrelTemperatures`).
     - `fault`: Optional object (`faultCode`, `severity`, `description`).
     - `dataQuality`: `GOOD` | `UNCERTAIN` | `BAD`.
     - `isSimulated`: `Boolean` (defaults to `true` for simulator events).

2. **Telemetry Ingestion Service (`backend/src/modules/telemetry/telemetry.service.ts`)**:
   - **Idempotency Enforcement**: Checks `eventId` existence in `machine_event_logs`. If present, quietly returns existing record to prevent duplicate cycle counting.
   - **Machine Resolution**: Caches and resolves machine code (`IMM-01`) to internal UUID (`machine.id`).
   - **State Projection Transaction**:
     - Updates `machine_current_states` with `normalizedStatus`, `rawStatus`, `currentCycleTime`, `lastEventTimestamp`, and `connectionStatus`.
     - Appends raw event record to `machine_event_logs`.
   - **Time Segment Transition Logic**:
     - When `normalizedStatus` changes, closes previous active `MachineTimeSegment` (calculating `durationSeconds = sourceTimestamp - startTime`) and opens a new segment (`OPERATING`, `PLANNED_DOWNTIME`, `UNPLANNED_DOWNTIME`, `CHANGEOVER`).
   - **Counter Rollover Resilience**: Recognizes hardware reset when `cycleCounter(t) < cycleCounter(t-1)` without registering negative delta.

3. **Telemetry Ingestion REST Controller (`backend/src/modules/telemetry/telemetry.controller.ts`)**:
   - `POST /api/v1/telemetry/events` — Ingest single or batch telemetry event packets.
   - `GET /api/v1/telemetry/machines/:id/latest` — Fetch latest snapshot and recent event history.

---

### Stage 2: Deterministic Multi-Machine Virtual Node Engine

_Objective: Implement the physical process simulation for injection molding machines with PackML state sequencing._

1. **Virtual Machine Node (`backend/src/modules/simulator/virtual-machine-node.ts`)**:
   - Individual instance per virtual machine (`IMM-01` to `IMM-10`).
   - **Sub-cycle State Machine (PackML & Injection Phases)**:
     ```text
     [MOLD_CLAMPING] ──► [INJECTION_BOOST] ──► [PACKING_HOLDING]
           ▲                                           │
           │                                           ▼
     [PART_EJECTION] ◄── [MOLD_OPENING]   ◄── [COOLING_PLASTICIZING]
     ```
   - **Realistic Process Variable Synthesizer**:
     - _Clamping Force:_ $F_{\text{clamp}} \in [1500, 5000]\text{ kN}$ proportional to machine tonnage.
     - _Peak Injection Pressure:_ $P_{\text{peak}} \in [130, 160]\text{ Bar}$ with realistic Gaussian jitter ($\sigma = 2.5\text{ Bar}$).
     - _Cushion Position:_ $X_{\text{cushion}} \in [10.0, 14.0]\text{ mm}$.
     - _Barrel Zone Temperatures:_ 4-5 zone gradient (e.g. 190°C feed, 210°C zone 1, 220°C zone 2, 225°C nozzle).
   - **Deterministic Seeded PRNG**:
     - Uses linear congruential generator or Mulberry32 algorithm seeded by `scenarioSeed` to ensure 100% reproducible event sequences across test runs.

2. **Multi-Machine Simulator Coordinator (`backend/src/modules/simulator/simulator.service.ts`)**:
   - Manages the lifecycle of 10 virtual machine instances.
   - High-resolution tick loop (`setInterval` or timer scheduler) ticking every 500ms or 1000ms.
   - **Configurable Speed Factor**:
     - $1\times$ (real-time wall clock), $2\times$, $5\times$, $10\times$ (accelerated simulation for fast-forward testing and CI runs).
   - Direct pipeline invocation: Virtual nodes emit normalized events directly into `TelemetryIngestionService`.

---

### Stage 3: Scenario Management & Baseline Allocation (The 8 + 1 + 1 Rule)

_Objective: Implement deterministic scenario states, fault injection, and reset/replay capabilities._

1. **Baseline Machine Allocation Matrix**:
   - **Machines `IMM-01` to `IMM-08` (Steady-State Normal Flow)**:
     - Cycle time follows product standard cycle time ($\pm 2\%$ natural variance).
     - 100% Availability, nominal Performance, zero spontaneous critical alarms.
   - **Machine `IMM-09` (Slow-Cycle Scenario Candidate)**:
     - Default: Runs normal steady-state.
     - _Scenario Activated:_ Plasticizing and cooling dwell artificially extends by $+40\%$ to $+60\%$ (e.g. 20.0s standard extends to 30.0s).
     - _Demonstrates:_ Measurable drop in OEE Performance factor while Availability remains 100%.
   - **Machine `IMM-10` (Fault & Andon Scenario Candidate)**:
     - Default: Runs normal steady-state.
     - _Scenario Activated:_ Machine asserts hydraulic pressure collapse alarm (`UNP-HYD-JAM`) or heater open fault (`UNP-HEAT-FAULT`).
     - FSM transitions state to `FAULT` and stops cycling.
     - Ingestion pipeline records `UNPLANNED_DOWNTIME` segment.
     - Ready for Digital Andon ticket creation and resolution in Phase 3.

2. **Scenario Control REST API (`backend/src/modules/simulator/simulator.controller.ts`)**:
   - `GET /api/v1/simulator/status`: Current simulation state, active seed, tick interval, speed multiplier, and state of each virtual machine.
   - `POST /api/v1/simulator/start`: Start/resume simulator engine.
   - `POST /api/v1/simulator/stop`: Pause simulator engine.
   - `POST /api/v1/simulator/speed`: Update speed factor (`{ speedMultiplier: 1 | 2 | 5 | 10 }`).
   - `POST /api/v1/simulator/reset`: Reset all 10 virtual machines to baseline steady-state with optional new seed (`{ seed?: number }`).
   - `POST /api/v1/simulator/scenarios/trigger`: Trigger interactive scenario:
     - `{ machineCode: 'IMM-09', scenario: 'SLOW_CYCLE', cycleDelayPercent: 50 }`
     - `{ machineCode: 'IMM-10', scenario: 'FAULT', faultCode: 'UNP-HYD-JAM' }`
     - `{ machineCode: 'IMM-10', scenario: 'CLEAR_FAULT' }`
     - `{ machineCode: 'IMM-05', scenario: 'DISCONNECT' }`
     - `{ machineCode: 'IMM-05', scenario: 'RECONNECT' }`

---

### Stage 4: Real-Time WebSocket Telemetry Gateway

_Objective: Broadcast live telemetry and state changes to client dashboards with sub-500ms latency._

1. **Dependencies**:
   - Add `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io` to `@mes/backend`.
2. **Telemetry Gateway (`backend/src/modules/telemetry/telemetry.gateway.ts`)**:
   - Namespace: `/ws/telemetry`.
   - Client authentication via JWT handshake token (reusing `AuthService` validation).
   - Client subscriptions:
     - Room `plant:all` — Receives overview heartbeats and state transitions for all machines.
     - Room `machine:{machineId}` — Receives high-frequency telemetry (pressure curves, zone temps, shot counters) for individual machine detail view.
   - Broadcast events:
     - `machine:state_changed` (`machineId`, `previousStatus`, `newStatus`, `timestamp`).
     - `machine:cycle_completed` (`machineId`, `cycleCounter`, `cycleTimeSeconds`, `metrics`).
     - `machine:fault_asserted` (`machineId`, `faultCode`, `description`, `timestamp`).
     - `machine:connection_changed` (`machineId`, `connectionStatus`, `timestamp`).

---

### Stage 5: Verification, Testing & Static Quality

_Objective: Validate all FSM transitions, determinism, idempotency, and WebSocket emissions._

1. **Unit Test Suite**:
   - `virtual-machine-node.spec.ts`: Validates PackML phase progression, seed reproducibility, parameter jitter bounds.
   - `simulator.service.spec.ts`: Validates 8+1+1 allocation, speed scaling, start/stop/reset.
   - `telemetry.service.spec.ts`: Validates duplicate event suppression (idempotency), time segment closure, counter reset detection.
2. **E2E Integration Test Suite (`backend/test/simulator-and-telemetry.e2e-spec.ts`)**:
   - Simulator engine start/stop/reset through REST API.
   - Ingestion of simulated cycles updates `machine_current_states` and `machine_event_logs`.
   - Triggering slow cycle on `IMM-09` increases recorded cycle time.
   - Triggering fault on `IMM-10` transitions status to `FAULT` and closes `OPERATING` segment into `UNPLANNED_DOWNTIME`.
   - Socket.IO client connects and receives real-time `machine:cycle_completed` broadcasts.
3. **Static Analysis & Monorepo Build**:
   - `pnpm lint` (0 errors, 0 warnings across all workspaces).
   - `pnpm build` (clean SWC + Vite compilation).

---

## 3. Observable Completion Criteria (Phase 2 Definition of Done)

Phase 2 is considered complete and verified when:

1. [ ] **10 Virtual Machines Running:** Starting the simulator initiates 10 virtual machine nodes (`IMM-01` through `IMM-10`) emitting valid telemetry packets.
2. [ ] **8 + 1 + 1 Baseline Validated:**
   - 8 machines (`IMM-01` to `IMM-08`) cycle steadily at nominal cycle times.
   - Triggering `SLOW_CYCLE` on `IMM-09` stretches cycle duration by 40–60%.
   - Triggering `FAULT` on `IMM-10` halts the machine, asserts fault code `UNP-HYD-JAM`, and sets status to `FAULT`.
   - Clearing fault on `IMM-10` returns it to `IDLE` / `RUNNING`.
3. [ ] **Idempotent Ingestion:** Re-sending an event with an existing `eventId` is safely dropped without duplicate database inserts or counter mutations.
4. [ ] **Real-Time State Projection:** `machine_current_states` reflects actual machine state, cycle time, and last event timestamp in real time.
5. [ ] **Time Segment Integrity:** State transitions automatically close previous time segments and open new segments in `machine_time_segments`.
6. [ ] **WebSocket Broadcasts:** Connected WebSocket clients receive `machine:cycle_completed` and `machine:state_changed` packets within $< 500\text{ ms}$ of ingestion.
7. [ ] **Deterministic Seed Replay:** Resetting the simulator with the same seed reproduces the exact same pseudo-random parameter values and sequence.
8. [ ] **Test Coverage:** All unit tests and E2E integration tests pass with 100% success rate (`pnpm test` and `pnpm test:e2e`).
9. [ ] **Code Hygiene:** Static analysis passes with 0 warnings/errors via `pnpm lint`, and monorepo builds cleanly via `pnpm build`.

---

## 4. Next Step Transition (Phase 3 Preview)

Upon successful validation and sign-off of Phase 2:

- **Proceed to Workflow 003: Production Execution, OEE Engine & Digital Andon**.
- The deterministic telemetry stream from the 10 virtual machines will feed the real-time **ISO 22400-2 OEE Calculation Engine** (Availability, Performance, Quality) and provide the trigger source for **Automated Digital Andon Tickets** on machine faults.
