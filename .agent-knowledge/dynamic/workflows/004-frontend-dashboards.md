# Implementation Workflow 004: Frontend Operator & Supervisory Dashboards (Phase 4)

**Status:** PROPOSED PLAN — READY FOR STAGED EXECUTION  
**Target Completion:** Phase 4 (Operator & Supervisory Dashboards, Live Shop Floor Telemetry, Machine Detail Gauges, Production Execution HMI, ISO 22400-2 OEE Analytics, & Digital Andon Board)  
**References:**

- Product Requirements: [PRD.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/.agent-knowledge/dynamic/docs/dev/PRD.md)
- Architecture Plan: [ARCHITECTURE.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/.agent-knowledge/dynamic/docs/dev/sdd/ARCHITECTURE.md)
- Technology Stack: [TECHNOLOGYSTACK.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/.agent-knowledge/dynamic/docs/dev/sdd/TECHNOLOGYSTACK.md)
- Machine Data Dictionary: [MES-MACHINE-DATA-DICTIONARY.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/docs/notes/MES-MACHINE-DATA-DICTIONARY.md)
- OEE Calculation Spec: [MES-OEE-CALCULATION-SPEC.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/docs/notes/MES-OEE-CALCULATION-SPEC.md)

---

## 1. Executive Summary & UI Architecture

Phase 4 delivers the single-page application (SPA) front-end for the Manufacturing Execution System. Built with **React 19**, **Vite 8**, **Tailwind CSS v4**, **Lucide Icons**, and **Socket.IO Client**, the application connects shop floor operators, technicians, plant supervisors, and executive planners to the backend services implemented in Phases 1–3:

```text
                               ┌──────────────────────────────────────────────┐
                               │       Frontend Application Architecture      │
                               └──────────────────────┬───────────────────────┘
                                                      │
                       ┌──────────────────────────────┴──────────────────────────────┐
                       │                                                             │
                       ▼                                                             ▼
         ┌───────────────────────────┐                                 ┌───────────────────────────┐
         │     REST API Client       │                                 │   WebSocket Ingestion     │
         │  (Fetch + Auth Bearer)    │                                 │   (/ws/telemetry Socket)  │
         └─────────────┬─────────────┘                                 └─────────────┬─────────────┘
                       │                                                             │
                       ▼                                                             ▼
         ┌───────────────────────────┐                                 ┌───────────────────────────┐
         │ Master Data & Orders CRUD │                                 │  Real-Time Stream Engine  │
         │ OEE Historical Analytics  │                                 │  - Machine State Changes  │
         │ Andon Ticket Resolution   │                                 │  - Shot Count Increments  │
         │ Scenario Trigger / Reset  │                                 │  - Telemetry Value Shifts │
         └─────────────┬─────────────┘                                 └─────────────┬─────────────┘
                       │                                                             │
                       └──────────────────────────────┬──────────────────────────────┘
                                                      │
                                                      ▼
                                       ┌─────────────────────────────┐
                                       │     Global State & Hooks    │
                                       │  - useAuth (Role Context)   │
                                       │  - useMachines (Live Matrix)│
                                       │  - useAndon (Alerts & MTTR) │
                                       │  - useOee (Calculations)    │
                                       └──────────────┬──────────────┘
                                                      │
         ┌────────────────────────────┬───────────────┴───────────────┬────────────────────────────┐
         │                            │                               │                            │
         ▼                            ▼                               ▼                            ▼
┌──────────────────┐        ┌──────────────────┐            ┌──────────────────┐         ┌──────────────────┐
│ Shop Floor Grid  │        │ Machine Detail   │            │ Production Order │         │ Digital Andon &  │
│  - 10 IMM Cards  │        │  - Live Gauges   │            │ & Run Execution  │         │ OEE Analytics    │
│  - State Badges  │        │  - Barrel Temp   │            │  - Run Controls  │         │  - Loss Pareto   │
│  - Live Counter  │        │  - Scenario Demo │            │  - Scrap Logger  │         │  - Response FSM  │
└──────────────────┘        └──────────────────┘            └──────────────────┘         └──────────────────┘
```

### Modern Web Standards & Design Tokens
1. **Accessible Dialog Overlays**: Implemented using native `<dialog>` elements with `showModal()`, `::backdrop` blur styling, and `overscroll-behavior: contain` to prevent background scroll chaining.
2. **Touch-Friendly HMI Ergonomics**: Designed for industrial touchscreens and desktop consoles with minimum 44px tap targets, high-contrast indicators, and state color coding:
   - `RUNNING`: Emerald green (`bg-emerald-500/20 text-emerald-400 border-emerald-500/40`)
   - `IDLE`: Amber (`bg-amber-500/20 text-amber-400 border-amber-500/40`)
   - `FAULT`: Crimson red pulsing (`bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse`)
   - `SETUP`: Electric cyan (`bg-cyan-500/20 text-cyan-400 border-cyan-500/40`)
   - `STOPPED`: Slate gray (`bg-slate-500/20 text-slate-400 border-slate-500/40`)
   - `DISCONNECTED`: Dark charcoal (`bg-zinc-800 text-zinc-500 border-zinc-700`)

---

## 2. Granular Stage-by-Stage Implementation Plan

### Stage 1: Core Layout, Real-Time Socket Connection & Role Context

_Objective: Establish the shell, live WebSocket client, API client, and multi-role simulator switcher._

1. **API Client & Authentication Service (`src/services/api.ts`)**:
   - `fetchWithAuth`: Automatically injects JWT Bearer token from local storage or mock session.
   - Demo role switcher support (`Admin`, `Supervisor`, `Operator`, `Technician`, `Planner`).
   - Standardized error handling and notification toast triggers.
2. **Real-Time Telemetry Socket Hook (`src/hooks/useTelemetrySocket.ts`)**:
   - Connects to backend `/ws/telemetry` namespace.
   - Subscribes to events:
     - `machine_state_changed`: Updates normalized machine status immediately.
     - `cycle_completed`: Increments shot counter and live cycle time.
     - `process_telemetry`: Emits hydraulic pressure, cushion position, and barrel temperature updates.
     - `andon_ticket_created`: Triggers sound/visual alert banner.
     - `andon_ticket_updated`: Updates Andon board state.
   - Provides connection health indicator (`Connected` vs `Reconnecting`).
3. **App Shell & Top Navigation (`src/components/layout/Navbar.tsx`)**:
   - Plant indicator: `Model Injection Facility (Plant 01)`.
   - Real-time connection badge with ping/latency indicator.
   - Quick role switcher for instant demonstration testing without relogging.
   - Top banner for active critical Andon tickets.
   - Navigation tabs: `Shop Floor Matrix`, `Production Runs`, `OEE Analytics`, `Digital Andon`.

---

### Stage 2: Shop Floor Overview Matrix (10 Virtual Machines)

_Objective: Real-time visual monitoring board displaying all 10 virtual injection molding machines._

1. **Machine Card Component (`src/components/machines/MachineCard.tsx`)**:
   - Header: Machine ID (`IMM-01` through `IMM-10`), Area name (`Injection Production`), status badge.
   - Metrics:
     - Active Order number & Product part number.
     - Good parts / Target parts progress bar.
     - Current cycle time vs Ideal cycle time (highlighting slow cycles $>25\text{s}$).
     - Total shots counter.
   - Action: Click to view Machine Detail Drawer/View.
2. **Shop Floor Grid Component (`src/components/machines/ShopFloorGrid.tsx`)**:
   - Responsive grid ($2 \times 5$ or $3 \times 4$ layout).
   - Filter bar:
     - Filter by Area (`All`, `Injection Production`, `Finishing & Inspection`, etc.).
     - Filter by Status (`All`, `RUNNING`, `FAULT`, `IDLE`, `SETUP`, `STOPPED`).
   - Summary statistics bar (e.g. `8 Running`, `1 Fault`, `1 Idle` | Fleet Utilization: `80%`).

---

### Stage 3: Machine Detail & Telemetry Telemetry Gauges

_Objective: Deep-dive view for individual machines showing real-time injection molding parameters and scenario triggers._

1. **Cycle Phase Progress Indicator (`src/components/machines/CyclePhaseBar.tsx`)**:
   - Shows active step in the 6-phase injection molding cycle:
     `Clamping` $\rightarrow$ `Injection` $\rightarrow$ `Holding` $\rightarrow$ `Cooling` $\rightarrow$ `Mold Opening` $\rightarrow$ `Ejection`.
2. **Real-Time Telemetry Gauges (`src/components/machines/TelemetryGauges.tsx`)**:
   - Injection Pressure Gauge (0–200 bar, with holding threshold indicator).
   - Cushion Position Gauge (0–150 mm, with injection forward limit).
   - Barrel Heating Zones ($Z_1, Z_2, Z_3, Z_4$ temperature heatmaps with setpoint comparison $210^\circ\text{C} - 235^\circ\text{C}$).
   - Cycle time history sparkline.
3. **Interactive Scenario Trigger Panel (`src/components/machines/ScenarioControlPanel.tsx`)**:
   - Direct controls to inject demonstration scenarios via API:
     - `Normal Baseline Flow` (sets machine to steady-state 22s cycle).
     - `Trigger Slow Cycle` (injects 42s slow cycle for performance drop demo).
     - `Trigger Heater Band Fault` (triggers thermocouple alarm, stops machine, fires Andon).
     - `Emergency Stop (E-Stop)` (simulates physical stop button).
     - `Reset Machine & Scenarios` (recovers machine back to nominal state).

---

### Stage 4: Production Order & Run Execution Panel

_Objective: Operator and planner interface to manage production orders, start/pause runs, and record scrap._

1. **Production Orders Table (`src/components/production/OrdersTable.tsx`)**:
   - Columns: Order Number, Product, Planned Quantity, Target Date, Status (`DRAFT`, `RELEASED`, `IN_PROGRESS`, `COMPLETED`), Actions.
   - Create Order Modal: Form to define order number, product selection, routing, target quantity.
   - Action buttons: "Release Order" (for Planners/Supervisors).
2. **Active Production Run HMI (`src/components/production/ActiveRunPanel.tsx`)**:
   - Displays active run for the selected machine.
   - Output summary: Target Qty, Total Shots, Good Quantity, Scrap Quantity, Scrap Rate %.
   - Action controls:
     - "Start Run" (assigns Order + Mold to Machine).
     - "Pause Run" / "Resume Run".
     - "Complete & Reconcile Run" (validates output reconciliation).
3. **Scrap Reporting Modal (`src/components/production/ScrapReportModal.tsx`)**:
   - Native `<dialog>` modal accessible via keyboard/Esc.
   - Inputs: Quantity, Defect Code dropdown (`FLASH`, `SHORT_SHOT`, `WARPAGE`, `SINK_MARK`, `CONTAMINATION`, `BURN_MARK`).
   - Notes field.
   - Real-time scrap rate recalculation upon submission.

---

### Stage 5: ISO 22400-2 OEE Executive Analytics

_Objective: Transparent KPI dashboard breaking down Availability, Performance, Quality, and Downtime Pareto._

1. **OEE KPI Summary Cards (`src/components/oee/OeeScorecards.tsx`)**:
   - Overall OEE Scorecard (% with World-Class benchmark indicator $>85\%$).
   - Availability Scorecard ($\frac{\text{Operating Time}}{\text{Planned Production Time}}$).
   - Performance Scorecard ($\frac{\text{Ideal Cycle Time} \times \text{Total Count}}{\text{Operating Time}}$).
   - Quality Scorecard ($\frac{\text{Good Count}}{\text{Total Count}}$).
   - Over-speed protection badge if $P > 100\%$.
2. **Multi-Machine OEE Comparison Chart (`src/components/oee/MachineOeeBarChart.tsx`)**:
   - Stacked or grouped bar chart comparing all 10 virtual machines.
   - Plant weighted OEE metric based on actual planned production time.
3. **Downtime Pareto Chart (`src/components/oee/DowntimeParetoChart.tsx`)**:
   - Pareto 80/20 analysis ranking downtime categories (`MECHANICAL_FAILURE`, `ELECTRICAL_FAULT`, `MOLD_DAMAGE`, `HEATER_BAND_FAILURE`, `MATERIAL_STARVATION`, `SETUP_ADJUSTMENT`).
   - Cumulative percentage line.
4. **Scrap Pareto Chart (`src/components/oee/ScrapParetoChart.tsx`)**:
   - Top defect reasons ranked by scrap quantity.

---

### Stage 6: Digital Andon Center & Dispatch Workflow

_Objective: Incident response board with real-time alerting, operator dispatch, and technician resolution._

1. **Active Andon Alert Banner (`src/components/andon/AndonBanner.tsx`)**:
   - Prominent sticky top alert when any machine has an `OPEN` ticket.
   - Displays Machine ID, Category, elapsed duration, and quick "Acknowledge" button.
2. **Andon Board Kanban (`src/components/andon/AndonBoard.tsx`)**:
   - 3-column view:
     - `OPEN (Unassigned / Pending Response)`
     - `ACKNOWLEDGED (Technician In-Progress)`
     - `RESOLVED (Historical / Addressed Today)`
   - Cards display Machine ID, Category badge, Operator, Response elapsed timer, Root Cause.
3. **Operator "Call for Help" Modal (`src/components/andon/CreateAndonModal.tsx`)**:
   - Triggerable from any machine card or header button.
   - Category buttons: `MACHINE_FAULT`, `QUALITY_ISSUE`, `MATERIAL_SHORTAGE`, `SAFETY`, `PROCESS_DEVIATION`.
   - Description input.
4. **Technician Resolve Modal (`src/components/andon/ResolveAndonModal.tsx`)**:
   - Technician action to resolve ticket:
     - Select verified Downtime Classification (links directly to OEE downtime reason).
     - Corrective Action notes.
     - Logs exact resolution timestamp to compute MTTR.
5. **Andon Analytics Scorecards (`src/components/andon/AndonMetrics.tsx`)**:
   - Mean Time to Respond (MTTR_response) in minutes.
   - Mean Time to Resolve (MTTR_resolution) in minutes.
   - Ticket volume by category.

---

## 3. Verification & Acceptance Criteria

| Check | Tool / Command | Target / Acceptance Criteria |
| :--- | :--- | :--- |
| **Lint & Type Safety** | `pnpm --filter frontend lint` | 0 errors, 0 warnings across all `.ts` and `.tsx` files. |
| **Production Build** | `pnpm --filter frontend build` | Vite asset bundling completes without error, emitting HTML/JS/CSS assets. |
| **Monorepo Build** | `pnpm build` | Both backend (SWC) and frontend (Vite) build cleanly. |
| **Real-Time Responsiveness** | WebSocket stream | State changes on virtual machines reflect in UI in $<1000\text{ms}$. |
| **Accessibility & Overlays** | Native `<dialog>` | Esc key dismisses dialogs, backdrop contains scroll gestures, `aria-labelledby` present. |
| **Role Authorization** | UI Action Gates | Operators cannot release orders; Planners cannot resolve maintenance tickets. |

---

## 4. Suggested Implementation Stages

We will execute this workflow systematically in 3 manageable stages:
- **Stage A (Foundations & Machine Grid):** Layout shell, WebSocket client, API client, and Shop Floor Overview Matrix (10 IMM Cards).
- **Stage B (Machine Detail, Gauges & Scenario Controls):** Injection telemetry gauges, cycle phase visualization, and scenario injection controls.
- **Stage C (Production Execution, OEE Analytics & Andon Center):** Orders/runs management, scrap logging, ISO 22400-2 OEE scorecards & Pareto charts, and complete Digital Andon board.
