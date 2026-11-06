# Product Requirements Document — OpenMES

> **Status:** `CURRENT`
> **Purpose:** Single source of truth for product vision, user stories, and planned features.

---

## 1. Product Vision

### Elevator Pitch

**OpenMES is a self-hosted, tablet-first, open-source Manufacturing Execution System (MES) designed for small and mid-sized discrete and batch manufacturers (woodworking, metal fabrication, plastics, assembly) to plan, track, execute, and analyze shop-floor production in real time without enterprise complexity or per-seat licensing costs.**

### Problem Statement

Small and mid-sized manufacturing plants frequently rely on paper job travelers, physical whiteboards, and fragmented spreadsheets to manage shop-floor operations because commercial enterprise MES platforms (Siemens Opcenter, Rockwell Plex, SAP ME) carry prohibitive licensing fees, heavy hardware footprints, and lengthy implementation cycles. This creates severe operational visibility gaps: delayed problem reporting (Andon bottlenecks), unrecorded scrap and downtime causes, untracked component genealogy, manual double-entry into ERP systems, and audit compliance risks under standards such as ISO 9001 and AS9100.

### Target Users

| Role | Description | Primary Need |
|------|-------------|--------------|
| Shop-Floor Operator | Frontline machine and assembly operator on the plant floor. | Touch-friendly, high-contrast, step-by-step guidance on tablets with one-tap start/complete actions, machine-counter delta reporting, checklist sign-offs, and immediate Andon problem alerting. |
| Production Supervisor | Plant floor supervisor managing active shifts, worker assignments, and immediate production flow. | Real-time overview of active lines and workstations, instant notification of line blocks and scrap, shift reassignments, and rapid issue resolution. |
| Production Planner / Scheduler | Operations planner responsible for delivery commitments and machine capacity. | Visual drag-and-drop Gantt scheduling (hourly, daily, weekly), finite capacity modeling, changeover minimization rules, order priority queuing, and material readiness visibility. |
| Quality & Compliance Inspector | Quality assurance engineer ensuring specifications and regulatory compliance. | In-process quality checks, sampling plans, non-conformance logging, disposition workflows (quarantine/rework/scrap), and end-to-end forward/backward material lot genealogy. |
| Maintenance Technician | Plant technician servicing equipment, tooling, and workstations. | Recurrent preventive maintenance schedules, breakdown work order alerts, tool lifecycle monitoring, and machine downtime logging. |
| Plant Admin / IT Specialist | System administrator managing plant infrastructure and integrations. | Single-command Docker deployment on commodity hardware, line configuration, user roles (RBAC), machine connectivity (MQTT, Modbus TCP, OPC UA), and data import/export with ERP systems. |

---

## 2. User Stories / Use Cases

### Epic 1: Production Scheduling & Dispatching (ISA-95 Level 3)

| ID | User Story | Priority | Acceptance Criteria |
|----|-----------|----------|-------------------|
| US-001 | As a Production Planner, I want to schedule work orders across lines using a drag-and-drop Gantt chart so that I can optimize line utilization and resolve bottlenecks. | P0 | Visual Gantt supporting Weekly, Daily, and Hourly horizons; drag-and-drop move and duration resizing; visual indicator for overdue orders and unassigned backlog queue. |
| US-002 | As a Production Planner, I want automatic sequencing based on priority rules and customer tiers so that high-value orders meet delivery dates. | P1 | Dynamic calculation of priority scores from customer tier and delivery date; automated placement simulation respecting line capacity and changeover rules. |
| US-003 | As a Production Planner, I want to configure changeover rules between product types so that setup downtime is minimized on shared machinery. | P1 | Rules matrix mapping transition attributes (`from_value` to `to_value`) to setup minutes per workstation type; automatically inserted into schedule projections. |

### Epic 2: Work Order Execution & Shop-Floor Tracking

| ID | User Story | Priority | Acceptance Criteria |
|----|-----------|----------|-------------------|
| US-004 | As a Shop-Floor Operator, I want a dedicated workstation queue with step-by-step guidance so that I follow the approved process template in strict sequence. | P0 | Touch-optimized UI (48px+ tap targets); sequential step gating preventing advancement until preceding steps and mandatory checklists are completed. |
| US-005 | As a Shop-Floor Operator, I want to report good quantities, scrap counts, and scrap reasons with minimal taps so that production records reflect reality without slowing down my cycle time. | P0 | Support for running counter delta reporting, manual total entry, and scrap reason categorization; immediate update of work order and batch quantities. |
| US-006 | As a Packaging Station Operator, I want to scan finished goods barcodes (EAN/QR) with a handheld reader so that packed quantities increment automatically. | P0 | Dedicated `/operator/packaging` station; sub-second barcode lookup; automatic increment of `packed_qty`; live shift counter display and manual/scheduled reset. |

### Epic 3: Issue Management & Andon System

| ID | User Story | Priority | Acceptance Criteria |
|----|-----------|----------|-------------------|
| US-007 | As a Shop-Floor Operator, I want to raise an Andon issue directly from my active workstation step so that supervisors and maintenance are alerted instantly. | P0 | Quick-report modal with predefined issue categories (material shortage, tool failure, quality defect); optional photos/attachments; real-time broadcast to supervisor board. |
| US-008 | As a System/Supervisor, I want critical blocking issues to halt workstation operations automatically so that defective production does not continue. | P0 | If `is_blocking` is true on issue creation, the associated work order/workstation status transitions to blocked; step completion is disabled until acknowledged or resolved. |
| US-009 | As a Production Supervisor, I want to track issue lifecycle (Open -> Acknowledged -> Resolved -> Closed) and record root causes so that recurring faults are prevented. | P1 | Issue management dashboard with status transitions, assigned technician, corrective actions (CAPA), non-conformance records, and duration metrics. |

### Epic 4: Quality Management & Material Traceability

| ID | User Story | Priority | Acceptance Criteria |
|----|-----------|----------|-------------------|
| US-010 | As a Shop-Floor Operator, I want to scan and consume specific material lots against my batch step so that component usage is accurately traced. | P0 | Allocation and consumption of material lots; stock deduction from line-side inventory; validation against material requirements and expiration dates. |
| US-011 | As a Quality Inspector, I want to query complete forward and backward genealogy for any material lot or serial unit so that recalls or audits are bounded instantly. | P0 | API and UI endpoints `/api/v1/material-lots/{lot}/genealogy/{forward,backward}` displaying supplier lot origin, batch consumption, parent work orders, and packed pallets. |
| US-012 | As a Quality Inspector, I want to record quality check samples against inspection plans with synchronized disposition actions so that out-of-spec lots are held. | P1 | Inspection plans with measurable criteria; disposition triggers (`accept`, `rework`, `quarantine`, `scrap`) that automatically update `MaterialLot.status`. |

### Epic 5: Machine Connectivity & Telemetry

| ID | User Story | Priority | Acceptance Criteria |
|----|-----------|----------|-------------------|
| US-013 | As a Plant Admin, I want machines to transmit cycle counts over MQTT and Modbus TCP so that production output is captured automatically without manual operator entry. | P0 | Background listener daemons (`mqtt:listen`, `modbus:poll`); topic-to-line/workstation mapping; automated `machine_counters` and work order progress increments. |
| US-014 | As a Plant Admin, I want to connect legacy industrial PLCs via OPC UA so that machine states (running, idle, fault) are integrated into OEE metrics. | P1 | Node.js `opcua-gateway` sidecar translating OPC UA node variables into authenticated OpenMES REST API payloads. |

### Epic 6: Analytics, OEE & Operational Reporting

| ID | User Story | Priority | Acceptance Criteria |
|----|-----------|----------|-------------------|
| US-015 | As a Production Supervisor, I want live Overall Equipment Effectiveness (OEE) metrics computed per line so that availability, performance, and quality losses are identified. | P0 | Real-time calculation of Availability (run time vs planned), Performance (actual rate vs ideal cycle), and Quality (good vs total count); dashboard gauges and historical charts. |
| US-016 | As an Operations Manager, I want exportable production, scrap, and downtime reports in CSV and PDF formats so that external stakeholders receive periodic reports. | P1 | Date-range and line-filtered reports with batch completion summaries, downtime breakdown by reason code, and one-click CSV/PDF export. |

---

## 3. Feature List

### MVP (Minimum Viable Product)

| # | Feature | Description | Epic |
|---|---------|-------------|------|
| 1 | Work Order Lifecycle Management | Multi-line work order creation, approval, dispatching, execution, and closure with partial batch tracking. | Epic 2 |
| 2 | Visual Multi-Horizon Production Planner | Interactive weekly, daily, and hourly Gantt chart with drag-and-drop scheduling, backlog panel, and overdue tracking. | Epic 1 |
| 3 | Operator Workstation Interface (PWA) | Tablet-optimized touch UI with sequential step enforcement, digital checklists, and instructions. | Epic 2 |
| 4 | Output & Scrap Reporting | Good output recording, machine counter start/end delta tracking, scrap logging with categorized reason codes. | Epic 2 |
| 5 | Packaging Station Module | Barcode/EAN scanning station, work order lookup, shift counter tracking, pallet and unit carton packaging. | Epic 2 |
| 6 | Real-Time Andon & Problem Reporting | Operator issue reporting, automatic line blocking for critical issues, supervisor acknowledgment and resolution flow. | Epic 3 |
| 7 | Material Management & Genealogy | Material catalog, lot allocation, lot consumption tracking, and bidirectional genealogy query tree. | Epic 4 |
| 8 | Quality Control & Inspection Plans | Inspection plan definitions, sample measurement logging, and disposition synchronized to material lot status. | Epic 4 |
| 9 | Preventive & Corrective Maintenance | Recurring maintenance schedules, breakdown event tickets, tool lifecycle management, and cost tracking. | Epic 5 |
| 10 | IoT Machine Telemetry (MQTT & Modbus) | Native background daemons ingesting MQTT messages and Modbus TCP registers into machine counters. | Epic 5 |
| 11 | OPC UA Gateway Sidecar | Containerized Node.js bridge translating OPC UA node values into OpenMES API calls. | Epic 5 |
| 12 | OEE & Performance Dashboard | Real-time OEE gauges, throughput charts, downtime distribution, and supervisor metrics. | Epic 6 |
| 13 | Real-Time Live Sync (Reverb + TanStack DB) | Reactive WebSocket broadcast of server mutations (`CollectionChanged`) syncing client collections without page refresh. | Epic 1 & 2 |
| 14 | Immutable Audit Logging | Database-enforced audit logs in PostgreSQL tracking all CRUD events, timestamps, and user IDs. | Epic 4 |
| 15 | Granular RBAC & Line Filtering | Spatie permission-backed roles (Admin, Supervisor, Operator) with workstation/line isolation. | Epic 2 |
| 16 | Bulk Data Import / Export | Unified CSV/Excel importer with column mapping profiles, dry-run validation, and background queued execution. | Epic 7 |

### Post-MVP / Future

| # | Feature | Description | Priority |
|---|---------|-------------|----------|
| 1 | Unified Production & Scrap Reporting | Consolidated single-screen operator action submitting good parts and scrap with reason codes simultaneously without tab navigation. | High |
| 2 | Dedicated Role-Based Landing Views | Decision-first landing screens: Operator lands directly on assigned active job; Supervisor lands on shift board. | High |
| 3 | Shift Board for Labor & Mid-Shift Reassignments | Visual board with line columns and operator cards for drag-and-drop reassignments and call-off replacements. | High |
| 4 | Multi-Day Gantt with Material Readiness Signals | Planner Gantt with integrated MRP material availability indicators (e.g. green ready, red shortage). | High |
| 5 | Procurement & Purchase Order Management | Supplier catalog, RFQ generation from material shortages, and purchase order tracking linked to work orders. | Medium |
| 6 | Subcontracting / Outside Processing (Kooperacja) | Tracking operations performed by external partners, material shipment documents, and external lead times. | Medium |
| 7 | Production Cost Accounting & Order Profitability | Calculation of actual BOM material consumption, labor hours, and machine overhead compared against planned estimates. | Medium |
| 8 | Statistical Process Control (SPC) Quality Charts | X-bar, R charts, histogram distributions, and Cpk/Ppk process capability calculations. | Low |
| 9 | Warehouse Bin & Storage Location Management | Detailed storage locations, bin-level transfers, and automated min/max safety stock replenishment alerts. | Low |
| 10 | Native B2MML XML Message Ingestion | Direct XML message processing according to ANSI/ISA-95 Part 5 standards. | Low |

---

## 4. Constraints & Assumptions

### Constraints

- **On-Premises / Edge Deployment:** Must deploy seamlessly via Docker Compose on commodity hardware (single mini-PC, NAS, or local VM) without cloud dependency.
- **Low-Bandwidth / LAN Resiliency:** The shop-floor environment relies on local Wi-Fi; operator screens must support PWA offline caching and minimize payload sizes via WebSocket live sync.
- **Stateless Application Concurrency:** The backend runs under Laravel Octane on RoadRunner; application state must avoid persistent request leaks in static variables or singletons.
- **Dual Licensing Obligations:** Core platform remains AGPL-3.0 with strict copyleft boundaries, while optional external modules follow AFL-3.0 / commercial licensing.
- **Immutable Traceability:** Audit records and finalized work order snapshots cannot be altered or hard-deleted; all user-facing deletions must enforce `SoftDeletesWithAudit`.

### Assumptions

- Production plants provide a local area network (LAN) connecting shop-floor tablets, workstations, and the OpenMES host server.
- Shop-floor devices are modern tablets or touch monitors running contemporary WebKit or Chromium browsers supporting WebSockets and PWA standards.
- Production machine telemetry interfaces (PLCs, IoT relays, sensors) support MQTT brokers, Modbus TCP over Ethernet, or OPC UA endpoints.
- External ERP integration occurs primarily via standard JSON REST API endpoints, webhooks, or scheduled CSV/Excel bulk exchanges.

---

## 5. Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| Installation & Boot Time | < 10 minutes | Time elapsed from git clone to live login via `./install.sh`. |
| Operator Action Latency | < 3 seconds | Total time required for an operator to log an output counter, scan a barcode, or report an issue. |
| Live Data Sync Latency | < 200 ms | Time elapsed between database commit on server and DOM update on connected client workstations. |
| Shop-Floor Availability | ≥ 99.9% uptime | Availability percentage measured across active production shifts on the local plant server. |
| Test Coverage & CI Pass Rate | 100% passing | Automated PHPUnit feature/unit suite covering happy paths, 422 validations, RBAC guards, and edge cases. |
| Audit Trail Integrity | 100% non-repudiation | Full capture of critical state changes with user ID, timestamps, and delta payloads in PostgreSQL `audit_logs`. |

---

## 6. Out of Scope

**The following will not be built in this version:**

- **Full Enterprise Financial ERP:** General ledger accounting, accounts payable/receivable, financial payroll, and corporate tax compliance (OpenMES operates strictly at ISA-95 Level 3 MOM).
- **Direct Low-Level Proprietary PLC Bus Protocols:** In-process drivers for proprietary serial fieldbuses (e.g. Siemens MPI, Profibus DP, Allen-Bradley DH+) without an intermediate Ethernet gateway or OPC UA server.
- **Native B2MML XML Transaction Endpoints:** B2MML-compliant XML/SOAP envelope parsing; JSON REST API endpoints serve as the canonical interface.
- **Public Cloud Multi-Tenant SaaS Billing & Metering:** Automated credit-card processing and SaaS subscription billing engines inside the core on-premise distribution.
