# Database Plan — Manufacturing Execution System (MES)

> **Status:** `PLANNING` — New Project Mode (Candidate Schemas, Relational Model, and Indexing Strategy)  
> **Output:** `.agent-knowledge/dynamic/docs/dev/sdd/DATABASE.md`  
> **Purpose:** Database blueprint: topology, table schemas, entity relationships, and indexing strategy.

---

## 1. Database Topology

| Connection | DB Engine                 | Database Name | Purpose                                                                                                                                    |
| ---------- | ------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `default`  | Microsoft SQL Server 2022 | `MES_DB`      | Primary data store: master data, work orders, production runs, immutable telemetry event logs, OEE rollups, Andon tickets, and audit logs. |

---

## 2. Table Schemas

### 2.1 Factory Hierarchy & Master Data

#### `plants`

| Column       | Type           | Constraints                      | Index           | Notes                                        |
| ------------ | -------------- | -------------------------------- | --------------- | -------------------------------------------- |
| `id`         | `VARCHAR(36)`  | PK, UUID                         | PRIMARY         | Unique facility identifier                   |
| `code`       | `VARCHAR(50)`  | NOT NULL, UNIQUE                 | `uq_plant_code` | Human-readable plant code (e.g., `PLANT-01`) |
| `name`       | `VARCHAR(150)` | NOT NULL                         |                 | Plant facility name                          |
| `timezone`   | `VARCHAR(50)`  | NOT NULL, DEFAULT `'UTC'`        |                 | Operational facility timezone                |
| `created_at` | `DATETIME2`    | NOT NULL, DEFAULT `GETUTCDATE()` |                 | Record creation timestamp                    |
| `updated_at` | `DATETIME2`    | NOT NULL, DEFAULT `GETUTCDATE()` |                 | Record update timestamp                      |

#### `production_areas`

| Column       | Type           | Constraints                      | Index                | Notes                                                            |
| ------------ | -------------- | -------------------------------- | -------------------- | ---------------------------------------------------------------- |
| `id`         | `VARCHAR(36)`  | PK, UUID                         | PRIMARY              | Unique area identifier                                           |
| `plant_id`   | `VARCHAR(36)`  | NOT NULL, FK `plants(id)`        | `idx_area_plant`     | Parent plant association                                         |
| `code`       | `VARCHAR(50)`  | NOT NULL                         | `uq_area_plant_code` | Unique per plant (`INJ-PROD`, `FIN-INSP`, `MAT-PREP`, `Q-MAINT`) |
| `name`       | `VARCHAR(150)` | NOT NULL                         |                      | Area display name                                                |
| `created_at` | `DATETIME2`    | NOT NULL, DEFAULT `GETUTCDATE()` |                      |                                                                  |

#### `machines`

| Column             | Type           | Constraints                         | Index              | Notes                                                        |
| ------------------ | -------------- | ----------------------------------- | ------------------ | ------------------------------------------------------------ |
| `id`               | `VARCHAR(36)`  | PK, UUID                            | PRIMARY            | Internal primary key                                         |
| `area_id`          | `VARCHAR(36)`  | NOT NULL, FK `production_areas(id)` | `idx_machine_area` | Current operating area                                       |
| `code`             | `VARCHAR(50)`  | NOT NULL, UNIQUE                    | `uq_machine_code`  | Permanent physical machine code (e.g., `IMM-01` to `IMM-10`) |
| `name`             | `VARCHAR(150)` | NOT NULL                            |                    | Equipment model name                                         |
| `clamping_tonnage` | `INT`          | NULL                                |                    | Machine clamp capacity (tons)                                |
| `is_virtual`       | `BIT`          | NOT NULL, DEFAULT `1`               |                    | Distinguishes virtual simulator nodes from physical hardware |
| `created_at`       | `DATETIME2`    | NOT NULL, DEFAULT `GETUTCDATE()`    |                    |                                                              |

---

### 2.2 Products, Molds & Process Recipes

#### `products`

| Column                | Type           | Constraints                      | Index                    | Notes                                 |
| --------------------- | -------------- | -------------------------------- | ------------------------ | ------------------------------------- |
| `id`                  | `VARCHAR(36)`  | PK, UUID                         | PRIMARY                  |                                       |
| `part_number`         | `VARCHAR(100)` | NOT NULL, UNIQUE                 | `uq_product_part_number` | Unique manufacturing part number      |
| `name`                | `VARCHAR(200)` | NOT NULL                         |                          | Product description                   |
| `standard_cycle_time` | `DECIMAL(8,2)` | NOT NULL                         |                          | Baseline nominal cycle time (seconds) |
| `created_at`          | `DATETIME2`    | NOT NULL, DEFAULT `GETUTCDATE()` |                          |                                       |

#### `molds`

| Column         | Type           | Constraints                     | Index          | Notes                                   |
| -------------- | -------------- | ------------------------------- | -------------- | --------------------------------------- |
| `id`           | `VARCHAR(36)`  | PK, UUID                        | PRIMARY        |                                         |
| `code`         | `VARCHAR(50)`  | NOT NULL, UNIQUE                | `uq_mold_code` | Tooling asset identification tag        |
| `name`         | `VARCHAR(150)` | NOT NULL                        |                | Mold name                               |
| `cavity_count` | `INT`          | NOT NULL, DEFAULT `1`           |                | Number of parts produced per shot cycle |
| `total_shots`  | `BIGINT`       | NOT NULL, DEFAULT `0`           |                | Cumulative lifetime shot strokes        |
| `status`       | `VARCHAR(30)`  | NOT NULL, DEFAULT `'AVAILABLE'` |                | `AVAILABLE`, `IN_USE`, `MAINTENANCE`    |

#### `mold_product_compatibilities`

| Column             | Type           | Constraints                 | Index              | Notes                                                     |
| ------------------ | -------------- | --------------------------- | ------------------ | --------------------------------------------------------- |
| `id`               | `VARCHAR(36)`  | PK, UUID                    | PRIMARY            |                                                           |
| `mold_id`          | `VARCHAR(36)`  | NOT NULL, FK `molds(id)`    | `idx_comp_mold`    |                                                           |
| `product_id`       | `VARCHAR(36)`  | NOT NULL, FK `products(id)` | `idx_comp_product` |                                                           |
| `ideal_cycle_time` | `DECIMAL(8,2)` | NOT NULL                    |                    | Theoretic target cycle time for this specific combination |

---

### 2.3 Production Execution & Work Orders

#### `production_orders`

| Column               | Type          | Constraints                      | Index             | Notes                                                                   |
| -------------------- | ------------- | -------------------------------- | ----------------- | ----------------------------------------------------------------------- |
| `id`                 | `VARCHAR(36)` | PK, UUID                         | PRIMARY           |                                                                         |
| `order_number`       | `VARCHAR(50)` | NOT NULL, UNIQUE                 | `uq_order_number` | Work order reference code                                               |
| `product_id`         | `VARCHAR(36)` | NOT NULL, FK `products(id)`      | `idx_po_product`  | Product to manufacture                                                  |
| `target_quantity`    | `INT`         | NOT NULL                         |                   | Total units demanded                                                    |
| `status`             | `VARCHAR(30)` | NOT NULL, DEFAULT `'DRAFT'`      | `idx_po_status`   | `DRAFT`, `RELEASED`, `IN_PROGRESS`, `COMPLETED`, `ON_HOLD`, `CANCELLED` |
| `planned_start_time` | `DATETIME2`   | NOT NULL                         |                   | Scheduled start                                                         |
| `actual_start_time`  | `DATETIME2`   | NULL                             |                   | Production execution start                                              |
| `actual_end_time`    | `DATETIME2`   | NULL                             |                   | Production order close                                                  |
| `created_at`         | `DATETIME2`   | NOT NULL, DEFAULT `GETUTCDATE()` |                   |                                                                         |

#### `production_runs`

| Column                | Type          | Constraints                          | Index            | Notes                                          |
| --------------------- | ------------- | ------------------------------------ | ---------------- | ---------------------------------------------- |
| `id`                  | `VARCHAR(36)` | PK, UUID                             | PRIMARY          |                                                |
| `production_order_id` | `VARCHAR(36)` | NOT NULL, FK `production_orders(id)` | `idx_pr_order`   | Executing work order                           |
| `machine_id`          | `VARCHAR(36)` | NOT NULL, FK `machines(id)`          | `idx_pr_machine` | Assigned machine                               |
| `mold_id`             | `VARCHAR(36)` | NOT NULL, FK `molds(id)`             |                  | Mounted mold tooling                           |
| `status`              | `VARCHAR(30)` | NOT NULL, DEFAULT `'SETUP'`          | `idx_pr_status`  | `SETUP`, `RUNNING`, `PAUSED`, `COMPLETED`      |
| `total_shots`         | `INT`         | NOT NULL, DEFAULT `0`                |                  | Total machine shot cycles executed in this run |
| `good_quantity`       | `INT`         | NOT NULL, DEFAULT `0`                |                  | Conforming finished output                     |
| `reject_quantity`     | `INT`         | NOT NULL, DEFAULT `0`                |                  | Scrap output count                             |
| `start_time`          | `DATETIME2`   | NOT NULL, DEFAULT `GETUTCDATE()`     |                  |                                                |
| `end_time`            | `DATETIME2`   | NULL                                 |                  |                                                |

---

### 2.4 Machine Integration & Telemetry Projections

#### `machine_current_states` (Read-Optimized Single Row per Machine)

| Column                 | Type           | Constraints                      | Index   | Notes                                                                     |
| ---------------------- | -------------- | -------------------------------- | ------- | ------------------------------------------------------------------------- |
| `machine_id`           | `VARCHAR(36)`  | PK, FK `machines(id)`            | PRIMARY | Fixed 1-to-1 projection row                                               |
| `normalized_status`    | `VARCHAR(30)`  | NOT NULL                         |         | `RUNNING`, `STOPPED`, `FAULT`, `SETUP`, `IDLE`, `DISCONNECTED`, `UNKNOWN` |
| `raw_status`           | `VARCHAR(100)` | NULL                             |         | Unprocessed controller state string                                       |
| `active_run_id`        | `VARCHAR(36)`  | NULL, FK `production_runs(id)`   |         | Currently active production run                                           |
| `current_cycle_time`   | `DECIMAL(8,2)` | NULL                             |         | Duration of most recent stroke cycle (seconds)                            |
| `last_event_timestamp` | `DATETIME2`    | NOT NULL                         |         | Timestamp of latest processed event                                       |
| `connection_status`    | `VARCHAR(30)`  | NOT NULL, DEFAULT `'ONLINE'`     |         | `ONLINE`, `DEGRADED`, `OFFLINE`                                           |
| `updated_at`           | `DATETIME2`    | NOT NULL, DEFAULT `GETUTCDATE()` |         |                                                                           |

#### `machine_event_logs` (Append-Only Event Store)

| Column               | Type            | Constraints                      | Index                  | Notes                                               |
| -------------------- | --------------- | -------------------------------- | ---------------------- | --------------------------------------------------- |
| `id`                 | `BIGINT`        | PK, IDENTITY(1,1)                | PRIMARY                | Sequential primary key                              |
| `event_id`           | `VARCHAR(64)`   | NOT NULL, UNIQUE                 | `uq_event_uuid`        | Client-generated UUID for idempotency deduplication |
| `machine_id`         | `VARCHAR(36)`   | NOT NULL, FK `machines(id)`      | `idx_mel_machine_time` | Optimized for historical machine queries            |
| `event_type`         | `VARCHAR(50)`   | NOT NULL                         | `idx_mel_type`         | `CYCLE_COMPLETED`, `FAULT_STARTED`, etc.            |
| `normalized_status`  | `VARCHAR(30)`   | NOT NULL                         |                        | Mapped operational state                            |
| `source_timestamp`   | `DATETIME2`     | NOT NULL                         | `idx_mel_source_time`  | Hardware clock timestamp on machine/simulator       |
| `received_timestamp` | `DATETIME2`     | NOT NULL, DEFAULT `GETUTCDATE()` |                        | Ingestion gateway arrival timestamp                 |
| `cycle_counter`      | `BIGINT`        | NULL                             |                        | Hardware shot counter reading                       |
| `fault_code`         | `VARCHAR(50)`   | NULL                             |                        | Diagnostic alarm code if in fault state             |
| `raw_payload`        | `NVARCHAR(MAX)` | NULL                             |                        | Full raw JSON event payload for auditability        |
| `is_simulated`       | `BIT`           | NOT NULL, DEFAULT `1`            |                        | Data provenance flag                                |

---

### 2.5 OEE & Downtime Management

#### `machine_time_segments` (Time Conservation Segments)

| Column               | Type          | Constraints                     | Index                    | Notes                                                                  |
| -------------------- | ------------- | ------------------------------- | ------------------------ | ---------------------------------------------------------------------- |
| `id`                 | `BIGINT`      | PK, IDENTITY(1,1)               | PRIMARY                  |                                                                        |
| `machine_id`         | `VARCHAR(36)` | NOT NULL, FK `machines(id)`     | `idx_mts_machine_window` | Time-range evaluation index                                            |
| `category`           | `VARCHAR(30)` | NOT NULL                        |                          | `OPERATING`, `PLANNED_DOWNTIME`, `UNPLANNED_DOWNTIME`, `SETUP`, `IDLE` |
| `start_time`         | `DATETIME2`   | NOT NULL                        |                          | Discrete segment start                                                 |
| `end_time`           | `DATETIME2`   | NOT NULL                        |                          | Discrete segment end (strictly non-overlapping)                        |
| `duration_seconds`   | `INT`         | NOT NULL                        |                          | Wall-clock elapsed duration in seconds                                 |
| `downtime_reason_id` | `VARCHAR(36)` | NULL, FK `downtime_reasons(id)` |                          | Assigned root-cause reason                                             |

#### `oee_results`

| Column               | Type           | Constraints                    | Index            | Notes                                              |
| -------------------- | -------------- | ------------------------------ | ---------------- | -------------------------------------------------- |
| `id`                 | `VARCHAR(36)`  | PK, UUID                       | PRIMARY          |                                                    |
| `machine_id`         | `VARCHAR(36)`  | NOT NULL, FK `machines(id)`    | `idx_oee_lookup` |                                                    |
| `run_id`             | `VARCHAR(36)`  | NULL, FK `production_runs(id)` |                  | Associated production run                          |
| `calculation_window` | `VARCHAR(20)`  | NOT NULL                       |                  | `RUN`, `SHIFT`, `DAY`                              |
| `availability`       | `DECIMAL(5,4)` | NOT NULL                       |                  | Operating Time / Planned Production Time           |
| `performance`        | `DECIMAL(5,4)` | NOT NULL                       |                  | (Ideal Cycle Time * Total Output) / Operating Time |
| `quality`            | `DECIMAL(5,4)` | NOT NULL                       |                  | Good Count / Total Output Count                    |
| `oee`                | `DECIMAL(5,4)` | NOT NULL                       |                  | A * P * Q                                          |
| `timestamp`          | `DATETIME2`    | NOT NULL                       |                  | Evaluation cut-off timestamp                       |

---

### 2.6 Digital Andon & Downtime Tickets

#### `andon_tickets`

| Column                 | Type            | Constraints                      | Index               | Notes                                                                  |
| ---------------------- | --------------- | -------------------------------- | ------------------- | ---------------------------------------------------------------------- |
| `id`                   | `VARCHAR(36)`   | PK, UUID                         | PRIMARY             |                                                                        |
| `ticket_number`        | `VARCHAR(50)`   | NOT NULL, UNIQUE                 | `uq_andon_number`   | Andon tracking identifier                                              |
| `machine_id`           | `VARCHAR(36)`   | NOT NULL, FK `machines(id)`      | `idx_andon_machine` | Machine experiencing issue                                             |
| `category`             | `VARCHAR(50)`   | NOT NULL                         |                     | `MACHINE_FAULT`, `QUALITY_DEFECT`, `MATERIAL_STARVATION`, `MOLD_ISSUE` |
| `status`               | `VARCHAR(30)`   | NOT NULL, DEFAULT `'OPEN'`       | `idx_andon_status`  | `OPEN`, `ACKNOWLEDGED`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`            |
| `reported_by_id`       | `VARCHAR(36)`   | NOT NULL, FK `users(id)`         |                     | Reporting operator                                                     |
| `assigned_to_id`       | `VARCHAR(36)`   | NULL, FK `users(id)`             |                     | Assigned technician                                                    |
| `report_time`          | `DATETIME2`     | NOT NULL, DEFAULT `GETUTCDATE()` |                     | Initial ticket trigger time                                            |
| `response_time`        | `DATETIME2`     | NULL                             |                     | Technician acknowledgement time                                        |
| `resolution_time`      | `DATETIME2`     | NULL                             |                     | Repair completion time                                                 |
| `confirmed_root_cause` | `NVARCHAR(500)` | NULL                             |                     | Verified diagnostic root cause                                         |
| `corrective_action`    | `NVARCHAR(500)` | NULL                             |                     | Remediation action executed                                            |

---

### 2.7 Security & Audit Trail

#### `users`, `roles`, & `user_role_assignments`

| Table                   | Key Fields                                              | Constraints                         | Notes                     |
| ----------------------- | ------------------------------------------------------- | ----------------------------------- | ------------------------- |
| `users`                 | `id`, `username`, `email`, `password_hash`, `is_active` | `username` & `email` UNIQUE         | Core user accounts        |
| `roles`                 | `id`, `name`, `description`                             | `name` UNIQUE                       | 9 Canonical roles per PRD |
| `user_role_assignments` | `user_id`, `role_id`                                    | Composite PK (`user_id`, `role_id`) | Many-to-many role mapping |

#### `audit_logs`

| Column        | Type            | Constraints                      | Index              | Notes                                                |
| ------------- | --------------- | -------------------------------- | ------------------ | ---------------------------------------------------- |
| `id`          | `BIGINT`        | PK, IDENTITY(1,1)                | PRIMARY            | Sequential primary key                               |
| `user_id`     | `VARCHAR(36)`   | NULL, FK `users(id)`             | `idx_audit_user`   | Actor executing mutation                             |
| `action`      | `VARCHAR(100)`  | NOT NULL                         |                    | `ORDER_STATUS_CHANGED`, `MASTER_DATA_MODIFIED`, etc. |
| `entity_type` | `VARCHAR(50)`   | NOT NULL                         | `idx_audit_entity` | Target table / aggregate root                        |
| `entity_id`   | `VARCHAR(36)`   | NOT NULL                         |                    | Target entity primary key                            |
| `old_values`  | `NVARCHAR(MAX)` | NULL                             |                    | Pre-mutation JSON snapshot                           |
| `new_values`  | `NVARCHAR(MAX)` | NULL                             |                    | Post-mutation JSON snapshot                          |
| `created_at`  | `DATETIME2`     | NOT NULL, DEFAULT `GETUTCDATE()` |                    | Immutable audit timestamp                            |

---

## 3. Relationships Summary

| Table A             | Relation  | Table B                        | Foreign Key                               |
| ------------------- | --------- | ------------------------------ | ----------------------------------------- |
| `plants`            | `hasMany` | `production_areas`             | `production_areas.plant_id`               |
| `production_areas`  | `hasMany` | `machines`                     | `machines.area_id`                        |
| `products`          | `hasMany` | `mold_product_compatibilities` | `mold_product_compatibilities.product_id` |
| `molds`             | `hasMany` | `mold_product_compatibilities` | `mold_product_compatibilities.mold_id`    |
| `products`          | `hasMany` | `production_orders`            | `production_orders.product_id`            |
| `production_orders` | `hasMany` | `production_runs`              | `production_runs.production_order_id`     |
| `machines`          | `hasMany` | `production_runs`              | `production_runs.machine_id`              |
| `machines`          | `hasOne`  | `machine_current_states`       | `machine_current_states.machine_id`       |
| `machines`          | `hasMany` | `machine_event_logs`           | `machine_event_logs.machine_id`           |
| `machines`          | `hasMany` | `machine_time_segments`        | `machine_time_segments.machine_id`        |
| `machines`          | `hasMany` | `oee_results`                  | `oee_results.machine_id`                  |
| `machines`          | `hasMany` | `andon_tickets`                | `andon_tickets.machine_id`                |
| `users`             | `hasMany` | `user_role_assignments`        | `user_role_assignments.user_id`           |
| `roles`             | `hasMany` | `user_role_assignments`        | `user_role_assignments.role_id`           |

---

## 4. Indexing Strategy

| Table                   | Index Name               | Columns                                     | Type     | Rationale                                                                                      |
| ----------------------- | ------------------------ | ------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------- |
| `machine_event_logs`    | `idx_mel_machine_time`   | `(machine_id, source_timestamp DESC)`       | `BTREE`  | Accelerates chronological event retrieval and windowed OEE calculations.                       |
| `machine_event_logs`    | `uq_event_uuid`          | `(event_id)`                                | `UNIQUE` | Enforces message deduplication and ingestion idempotency at the database constraint level.     |
| `machine_time_segments` | `idx_mts_machine_window` | `(machine_id, start_time, end_time)`        | `BTREE`  | Eliminates table scans when aggregating operating vs. downtime intervals across shift periods. |
| `production_runs`       | `idx_pr_active_lookup`   | `(machine_id, status)`                      | `BTREE`  | Provides $O(1)$ lookups for the active run running on an individual machine.                   |
| `andon_tickets`         | `idx_andon_active`       | `(machine_id, status)`                      | `BTREE`  | Prevents duplicate ticket spam when a machine fault alarm is continuously asserted.            |
| `audit_logs`            | `idx_audit_query`        | `(entity_type, entity_id, created_at DESC)` | `BTREE`  | Enables rapid historical audit inspections for any specific domain entity.                     |

---

## 5. Migration Plan

| #   | Migration Name                          | Impacted Tables                                                                               | Domain      | Scope                                                |
| --- | --------------------------------------- | --------------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------- |
| 1   | `001_create_identity_and_roles`         | `users`, `roles`, `user_role_assignments`                                                     | Security    | User authentication and RBAC authorization baseline  |
| 2   | `002_create_plant_and_master_data`      | `plants`, `production_areas`, `machines`, `products`, `molds`, `mold_product_compatibilities` | Master Data | Factory physical topology and product/tooling matrix |
| 3   | `003_create_production_tables`          | `production_orders`, `production_runs`                                                        | Production  | Work order lifecycle tracking and shot counters      |
| 4   | `004_create_machine_integration_tables` | `machine_current_states`, `machine_event_logs`                                                | Telemetry   | Ingestion event log and real-time state projection   |
| 5   | `005_create_oee_and_andon_tables`       | `machine_time_segments`, `downtime_reasons`, `oee_results`, `andon_tickets`                   | OEE & Andon | Downtime loss accounting and Digital Andon workflows |
| 6   | `006_create_audit_log_table`            | `audit_logs`                                                                                  | Governance  | Immutable change tracking across all domain models   |

---

## 6. Seed Data Specification

| Seeder Class              | Target Domain    | Seed Content & Initial Scenario Baseline                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RoleSeeder`              | Security         | Populates the 9 canonical roles: `System Administrator`, `Production Planner`, `Production Supervisor`, `Machine Operator`, `Quality Inspector`, `Maintenance Technician`, `Maintenance Supervisor`, `Material Handler`, and `Management / Read-only Analyst`.                                                                                                                                                                                                                                             |
| `AdminUserSeeder`         | Security         | Initial `admin` account with hashed password for first-time login and setup.                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `PlantTopologySeeder`     | Master Data      | **Plant 01** with 4 operational areas (`Injection Production`, `Finishing & Inspection`, `Material & Mold Preparation`, `Quality & Maintenance`) and **10 Virtual Injection Molding Machines** (`IMM-01` through `IMM-10`).                                                                                                                                                                                                                                                                                |
| `ProductAndMoldSeeder`    | Master Data      | Automotive and industrial plastic parts, multi-cavity molds (`2-cavity`, `4-cavity`), and declared `ideal_cycle_time` baselines.                                                                                                                                                                                                                                                                                                                                                                           |
| `DowntimeReasonSeeder`    | OEE              | Standardized ISO 22400 loss codes: Planned (Mold Changeover, Maintenance, Cleaning) and Unplanned (Hydraulic Jam, Heater Zone Fault, E-Stop, Resin Starvation).                                                                                                                                                                                                                                                                                                                                            |
| `SimulatorScenarioSeeder` | Simulator Engine | **Default Initial State:**<br>• 10 Virtual Machines total.<br>• **8 Machines:** Steady-state normal operating flow (continuous cycle completion).<br>• **1 Machine (e.g., IMM-09):** Triggerable slow-cycle scenario (cycle time expands beyond ideal target to demonstrate Performance loss).<br>• **1 Machine (e.g., IMM-10):** Triggerable fault scenario (hydraulic pressure trip generating an automated Andon ticket to demonstrate Availability loss).<br>• Seed scenario reset and replay support. |
