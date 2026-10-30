# Implementation Workflow 006: Real-Time WebSocket Live Synchronization for Hybrid Manufacturing Modules (Epics 2, 7, 8, 9, 10, 11)

**Status:** PROPOSED PLAN — READY FOR STAGED EXECUTION  
**Target Completion:** Phase 7 / Option 2 (Zero-Latency Real-Time Ecosystem Across Packaging, Quality Gates, Tool PM, Material Inventory, and Visual Scheduling)  
**References:**
- Product Requirements: [PRD.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/.agent-knowledge/dynamic/docs/dev/PRD.md)
- System Architecture: [ARCHITECTURE.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/.agent-knowledge/dynamic/docs/dev/sdd/ARCHITECTURE.md)
- Database Specifications: [DATABASE.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/.agent-knowledge/dynamic/docs/dev/sdd/DATABASE.md)
- Design System Tokens: [DESIGN.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/DESIGN.md)

---

## 1. Executive Summary & Problem Statement

In a modern high-volume plastic injection molding plant, operations across work centers are deeply interdependent:
1. **Packaging Lag**: While injection machines cycle every 20–30 seconds, packaging operators work at downstream carton/pallet stations. Currently, when an operator registers a packed carton, floor supervisors on the main dashboard cannot see updated shot-to-pack reconciliations without manually refreshing the browser.
2. **Tooling PM Blindness**: Injection molds accumulate strokes on every clamp closure. When a mold exceeds its PM threshold (e.g. 25,000 shots for cavity cleaning), maintenance work orders are generated, but technicians in the toolroom remain unaware until they manually check the table.
3. **Quality Gate Interlock Gap**: If a First-Piece inspection on a newly mounted mold fails dimensional tolerance and is marked `QUARANTINE`, machine operators and supervisors on the shop floor grid need an immediate visual and functional interlock (`LOCKED_BY_QC`) to prevent mass-producing defective parts.
4. **Material Hopper Depletion**: Resin loaded into machine hoppers is consumed shot-by-shot. Without live updates, material handlers cannot anticipate when a hopper will run dry until an alarm trips.
5. **Multi-Planner Scheduling Collisions**: In visual Gantt dispatch boards, when Planner A reschedules a work order or resolves a changeover, Planner B must see the board update in real-time to avoid duplicate allocations.

**Implementation Workflow 006** solves this by extending the NestJS Socket.IO gateway (`/ws/telemetry`) and frontend socket client into a unified, **Zero-Latency Event Bus** covering all manufacturing modules.

```text
 ┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
 │                             REAL-TIME HYBRID EVENT BUS TOPOLOGY                                        │
 └───────────────────────────────────────────────────┬────────────────────────────────────────────────────┘
                                                     │
                 ┌───────────────────────────────────┴───────────────────────────────────┐
                 ▼                                                                       ▼
   ┌───────────────────────────┐                                           ┌───────────────────────────┐
   │ Machine Telemetry Stream  │                                           │  Domain Business Services │
   │ - Machine Cycle & Strokes │                                           │  - PackagingService       │
   │ - Barrel Heat / Pressure  │                                           │  - MaintenanceService     │
   │ - Hydraulic Faults/States │                                           │  - QualityService         │
   │ - Automated PM Triggers   │                                           │  - MaterialsService       │
   │ - Resin Consumption       │                                           │  - SchedulingService      │
   └─────────────┬─────────────┘                                           └─────────────┬─────────────┘
                 │                                                                       │
                 └───────────────────────────────────┬───────────────────────────────────┘
                                                     │
                                                     ▼
                                      ┌─────────────────────────────┐
                                      │   TelemetryGateway Core     │
                                      │   (Namespace: /ws/telemetry)│
                                      │   - Room: plant:all         │
                                      │   - Room: machine:<id>      │
                                      │   - Room: module:<domain>   │
                                      └──────────────┬──────────────┘
                                                     │
        ┌──────────────────────────────┬─────────────┴────────────────┬──────────────────────────────┐
        ▼                              ▼                              ▼                              ▼
 ┌───────────────┐              ┌───────────────┐              ┌───────────────┐              ┌───────────────┐
 │ Packaging HMI │              │ Maintenance   │              │ Quality Gates │              │ Gantt Board   │
 │ Live Cartons  │              │ Live PM Alert │              │ QC Interlock  │              │ Live Resched  │
 │ Shot-to-Pack  │              │ Stroke Dials  │              │ Disposition   │              │ Sync Tracks   │
 └───────────────┘              └───────────────┘              └───────────────┘              └───────────────┘
```

---

## 2. Event Contracts & Room Topology

### 2.1 WebSocket Namespace & Rooms
All communications operate over `/ws/telemetry`. Clients subscribe dynamically based on active view:
- `plant:all`: Universal shop floor broadcasts (telemetry, state changes, critical alerts).
- `machine:<machineId>`: Machine-specific cycle telemetry and parameter updates.
- `module:packaging`: Real-time carton scans and run reconciliation updates.
- `module:quality`: First-piece approvals, inspection checks, and machine interlocks.
- `module:maintenance`: Tool stroke updates, PM work orders, and technician acknowledgments.
- `module:materials`: Hopper load events, lot allocations, and resin depletion warnings.
- `module:scheduling`: Timeline block dispatches, drag-and-drop moves, and changeover matrix updates.

---

### 2.2 Domain Event Specifications

#### A. Packaging & Reconciliation Events
| Event Name | Source | Payload Summary | UI Effect |
|---|---|---|---|
| `packaging:unit_created` | `PackagingService.createUnit` | `{ runId, unit: PackagingUnit, currentPackedTotal }` | Instantly increments carton tally and appends unit to table. |
| `packaging:reconciled` | `PackagingService.reconcile` | `{ runId, goodQuantity, packedQuantity, delta, status }` | Updates shot-to-pack reconciliation gauge & alert status. |

#### B. Tooling & Maintenance Events
| Event Name | Source | Payload Summary | UI Effect |
|---|---|---|---|
| `mold:stroke_accumulated` | `SimulatorService` / Ingestion | `{ moldId, machineId, totalShots, nextPmShots, pctToPm }` | Updates mold stroke dial and remaining strokes to PM. |
| `maintenance:work_order_created` | `MaintenanceService.autoPm` | `{ workOrder: MaintenanceWorkOrder, moldCode, urgency }` | Pops toast notification, plays chime, appends open work order. |
| `maintenance:work_order_updated` | `MaintenanceService.updateStatus` | `{ workOrderId, status, completedAt, moldId }` | Moves ticket to completed, resets mold stroke progress bar. |

#### C. Quality & Interlock Events
| Event Name | Source | Payload Summary | UI Effect |
|---|---|---|---|
| `quality:check_recorded` | `QualityService.createCheck` | `{ runId, check: QualityCheck, disposition }` | Appends sample measurements to inspection log live. |
| `quality:first_piece_status_changed` | `QualityService.recordCheck` | `{ runId, machineId, orderId, status: 'PASSED'\|'QUARANTINE'\|'REJECTED' }` | Updates First-Piece banner and asserts/clears machine run interlock. |
| `machine:interlock_state` | `QualityService` / `RunsService` | `{ machineId, isInterlocked: boolean, interlockReason: string }` | Displays lock icon & badge on `ShopFloorGrid` machine card. |

#### D. Material Inventory & Hopper Events
| Event Name | Source | Payload Summary | UI Effect |
|---|---|---|---|
| `materials:hopper_loaded` | `MaterialsService.loadHopper` | `{ runId, machineId, lotCode, quantityKg, totalHopperKg }` | Updates hopper bar level in Materials view and Machine detail. |
| `materials:hopper_depleted` | `SimulatorService` (per shot) | `{ runId, machineId, consumedKg, remainingHopperKg, isLowResin }` | Animates hopper level downward; triggers low-resin alert when $<10\text{ kg}$. |
| `materials:lot_stock_updated` | `MaterialsService` | `{ lotId, lotNumber, remainingQuantityKg }` | Updates inventory stock balance in real-time. |

#### E. Visual Scheduling & Gantt Events
| Event Name | Source | Payload Summary | UI Effect |
|---|---|---|---|
| `scheduling:order_scheduled` | `SchedulingService.scheduleOrder` | `{ orderId, machineId, moldId, startTime, endTime }` | Smoothly inserts scheduled block into machine track. |
| `scheduling:order_rescheduled` | `SchedulingService.reschedule` | `{ orderId, machineId, newStartTime, newEndTime }` | Animates block moving to new position or machine row. |
| `scheduling:order_unscheduled` | `SchedulingService.unschedule` | `{ orderId, orderNumber }` | Removes block from track and restores card into Backlog drawer. |
| `scheduling:changeover_updated`| `SchedulingService.upsertChangeover` | `{ changeoverRule }` | Updates transition matrix modal table live. |

---

## 3. Staged Implementation Plan

```text
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    STAGE EXECUTION ROADMAP                                             │
└───────────────────────────────────────────────────┬────────────────────────────────────────────────────┘
                                                    │
    ┌───────────────────────────────────────────────┴───────────────────────────────────────────────┐
    ▼                                                                                               ▼
┌───────────────────────────────────────────┐                   ┌───────────────────────────────────────────┐
│ Stage 1: Backend Gateway & Broadcasters   │                   │ Stage 2: Simulator Cross-Module Triggers  │
│ - TelemetryGateway broadcast methods      │                   │ - Stroke accumulation & auto-PM event     │
│ - Inject Gateway into domain services     │                   │ - Real-time hopper resin deduction        │
│ - Emit events on mutations                │                   │ - First-piece run interlock state         │
└─────────────────────┬─────────────────────┘                   └─────────────────────┬─────────────────────┘
                      │                                                               │
                      └─────────────────────────────┬─────────────────────────────────┘
                                                    │
                                                    ▼
                                    ┌───────────────────────────────┐
                                    │ Stage 3: Frontend Socket Hook │
                                    │ - Expand useTelemetrySocket   │
                                    │ - Typed event subscribers     │
                                    │ - Reconnection state manager  │
                                    └───────────────┬───────────────┘
                                                    │
                      ┌─────────────────────────────┴─────────────────────────────┐
                      ▼                                                           ▼
┌───────────────────────────────────────────┐                   ┌───────────────────────────────────────────┐
│ Stage 4: Reactive View Components         │                   │ Stage 5: Verification & Multi-Client E2E  │
│ - PackagingView live reconciliation       │                   │ - Vitest backend unit test coverage       │
│ - MaintenanceView instant work orders     │                   │ - Oxlint clean zero-error validation      │
│ - QualityView & MachineCard QC interlock  │                   │ - Playwright 2-browser window live sync   │
│ - SchedulingView multi-client drag sync   │                   │ - Final Task Report 015                   │
└───────────────────────────────────────────┘                   └───────────────────────────────────────────┘
```

---

### Stage 1: Backend Gateway Expansion & Domain Service Broadcasters
1. **Extend `TelemetryGateway` (`backend/src/modules/telemetry/telemetry.gateway.ts`)**:
   - Add broadcast helper methods:
     - `broadcastPackagingEvent(event: string, payload: any)`
     - `broadcastMaintenanceEvent(event: string, payload: any)`
     - `broadcastQualityEvent(event: string, payload: any)`
     - `broadcastMaterialsEvent(event: string, payload: any)`
     - `broadcastSchedulingEvent(event: string, payload: any)`
   - Add room join subscriptions: `subscribe:module`, `unsubscribe:module`.
2. **Wire Gateway into Domain Services**:
   - `PackagingService`: Emit `packaging:unit_created` on `createPackagingUnit()` and `packaging:reconciled` on `reconcileRunPackaging()`.
   - `QualityService`: Emit `quality:check_recorded` and `quality:first_piece_status_changed` on `recordCheck()`.
   - `MaintenanceService`: Emit `maintenance:work_order_created` on auto-PM trigger and `maintenance:work_order_updated` on `updateWorkOrderStatus()`.
   - `MaterialsService`: Emit `materials:hopper_loaded` on `loadHopper()`.
   - `SchedulingService`: Emit `scheduling:order_scheduled`, `scheduling:order_rescheduled`, `scheduling:order_unscheduled`, and `scheduling:changeover_updated`.

---

### Stage 2: Simulator Cross-Module Triggers & Interlock Enforcement
1. **Automated Shot Stroke Accumulation & PM Work Order Broadcast**:
   - In `SimulatorService` or `TelemetryIngestionService`: on every completed injection cycle, increment `totalShots` on the assigned mold.
   - When lifetime shots cross the PM threshold, automatically generate `MaintenanceWorkOrder` and call `gateway.broadcastMaintenanceEvent('maintenance:work_order_created', ...)`.
2. **Hopper Resin Depletion per Cycle**:
   - On each shot: deduct resin weight $\Delta W = \text{shotWeightKg}$ from active hopper loading.
   - Broadcast `materials:hopper_depleted` with updated hopper kilograms.
3. **First-Piece QC Run Interlock**:
   - If an active run on machine has no approved First-Piece check or is marked `QUARANTINE`, flag `isInterlocked: true` on machine snapshot.
   - Broadcast `machine:interlock_state` to all clients.

---

### Stage 3: Frontend WebSocket Hook Expansion (`useTelemetrySocket.ts`)
1. Extend `useTelemetrySocket` with strongly-typed listener subscriptions:
   ```ts
   interface UseTelemetrySocketOptions {
     // Existing telemetry listeners...
     // Packaging
     onPackagingUnitCreated?: (data: { runId: string; unit: PackagingUnit }) => void;
     onPackagingReconciled?: (data: RunReconciliation) => void;
     // Maintenance
     onMaintenanceWoCreated?: (data: MaintenanceWorkOrder) => void;
     onMaintenanceWoUpdated?: (data: MaintenanceWorkOrder) => void;
     onMoldStrokeAccumulated?: (data: { moldId: string; totalShots: number }) => void;
     // Quality
     onQualityCheckRecorded?: (data: QualityCheck) => void;
     onFirstPieceStatusChanged?: (data: FirstPieceReleaseStatus) => void;
     onMachineInterlockState?: (data: { machineId: string; isInterlocked: boolean; reason?: string }) => void;
     // Materials
     onHopperLoaded?: (data: { runId: string; lotCode: string; quantityKg: number }) => void;
     onHopperDepleted?: (data: { machineId: string; remainingKg: number }) => void;
     // Scheduling
     onSchedulingUpdated?: (data: { eventType: string; orderId?: string }) => void;
   }
   ```
2. Automatically join/leave domain module rooms when specific views mount/unmount.

---

### Stage 4: Reactive View Components & Visual Affordances
1. **`PackagingView.tsx`**:
   - Listens to `packaging:unit_created` and `packaging:reconciled`.
   - Appends new units to the table in real-time with subtle flash animation.
   - Updates reconciliation progress bar without requiring manual refresh.
2. **`MaintenanceView.tsx`**:
   - Listens to `maintenance:work_order_created` and `mold:stroke_accumulated`.
   - Displays incoming work orders immediately with an amber pulse badge.
   - Mold stroke progress bars and gauges update live with machine cycles.
3. **`QualityView.tsx` & `MachineCard.tsx`**:
   - Listens to `quality:first_piece_status_changed` and `machine:interlock_state`.
   - `MachineCard.tsx` displays a prominent **"QC Interlocked"** lock badge (`Lock` icon in `#C9372C`) when a machine run is under quarantine.
   - `QualityView.tsx` updates First-Piece banner status immediately upon signoff.
4. **`MaterialsView.tsx`**:
   - Listens to `materials:hopper_loaded` and `materials:hopper_depleted`.
   - Live hopper depletion bar updates smoothly as virtual machines run.
5. **`SchedulingView.tsx`**:
   - Listens to `scheduling:order_scheduled`, `scheduling:order_rescheduled`, and `scheduling:order_unscheduled`.
   - Auto-refreshes timeline blocks smoothly when another user or automated planner modifies the schedule.

---

### Stage 5: Verification, Testing & Multi-Client E2E Audit
1. **Unit Tests**:
   - Add unit tests in `telemetry.gateway.spec.ts` and domain service specs verifying event dispatch calls.
2. **Monorepo Health Check**:
   - `pnpm lint` (`oxlint`) at 0 errors, 0 warnings.
   - `pnpm test` (all Vitest suites passing).
   - `pnpm build` (clean Vite bundle).
3. **Multi-Window E2E Playwright Verification**:
   - Open 2 independent browser contexts via Playwright:
     - Window A: Packaging / Scheduling operator.
     - Window B: Supervisor Dashboard / Quality view.
   - Perform an action in Window A (e.g. pack carton, schedule order, record QC check).
   - Assert that Window B updates within $<500\text{ms}$ without page refresh!
4. **Task Report**:
   - Document results in `.agent-knowledge/dynamic/reports/tasks/015-implement-phase-7-realtime-websocket-sync.md`.

---

## 4. Definition of Done (Observable Completion Criteria)

| # | Objective | Verification Method |
|---|---|---|
| 1 | **Packaging Live Sync** | Packing a carton in `PackagingView` updates the counter and reconciliation status in other tabs in $<500\text{ms}$. |
| 2 | **Tool PM Live Alert** | Crossing a mold shot threshold creates a PM work order and renders it live in `MaintenanceView` without F5. |
| 3 | **QC Interlock Live Reflection** | Submitting a `QUARANTINE` or pending First-Piece check immediately renders the lock badge on `ShopFloorGrid`. |
| 4 | **Material Hopper Live Depletion** | Running machines smoothly deplete hopper levels in `MaterialsView` with real-time gram-per-cycle deductions. |
| 5 | **Gantt Multi-Client Live Sync** | Dragging an order onto a machine track in `SchedulingView` reflects the block move in all other open browser sessions. |
| 6 | **Monorepo Health** | `pnpm lint` = 0 errors/0 warnings; `pnpm test` = 100% passing; clean `pnpm build`. |
