# Database Plan — OpenMES

> **Output:** `.agent-knowledge/dynamic/docs/dev/sdd/DATABASE.md`
> **Purpose:** Database blueprint: ERD, schema, relationships, and indexing strategy.
> **Status:** `CURRENT`

## 1. Database Topology

| Connection | DB Engine | Database Name | Purpose |
|-----------|----------|---------------|---------|
| `pgsql` (default) | PostgreSQL 17 (`postgres:17-alpine`) | `openmmes` (configurable via `POSTGRES_DB`) | Primary relational store for manufacturing domain models, audit logs, user authentication, application cache, and queued jobs. |
| `sqlite` (dev/test) | SQLite 3 (in-memory or file) | `:memory:` / `database.sqlite` | Rapid automated test execution and local non-Docker development environments. |

> **PostgreSQL Configuration Note:** The production PostgreSQL container is configured with `wal_level=logical`, `max_replication_slots=10`, and `max_wal_senders=10` to support change-data-capture (CDC) and reliable streaming replication.

---

## 2. Table Schemas

### `users`

| Column | Type | Constraints | Index | Notes |
|--------|------|-------------|-------|-------|
| `id` | `bigint` | PK, auto-increment | PRIMARY | Primary identifier |
| `tenant_id` | `bigint` | nullable, FK -> `tenants.id` | INDEX | Multi-tenant isolation |
| `name` | `varchar(255)` | NOT NULL | | Full name |
| `username` | `varchar(255)` | NOT NULL | UNIQUE | Unique login identifier |
| `email` | `varchar(255)` | NOT NULL | UNIQUE | Contact email address |
| `password` | `varchar(255)` | NOT NULL | | Bcrypt password hash |
| `pin` | `varchar(255)` | nullable | | Operator quick-switching PIN |
| `account_type` | `varchar(50)` | NOT NULL, default `'standard'` | INDEX | User account type |
| `worker_id` | `bigint` | nullable, FK -> `workers.id` | INDEX | Associated shop-floor worker record |
| `workstation_id` | `bigint` | nullable, FK -> `workstations.id` | INDEX | Station assignment |
| `two_factor_secret` | `text` | nullable | | Encrypted TOTP secret |
| `remember_token` | `varchar(100)` | nullable | | Laravel remember token |
| `last_login_at` | `timestamp` | nullable | | Last activity timestamp |
| `created_at` | `timestamp` | nullable | | Record creation timestamp |
| `updated_at` | `timestamp` | nullable | | Record modification timestamp |
| `deleted_at` | `timestamp` | nullable | INDEX | Soft-delete timestamp |
| `deleted_by_id` | `bigint` | nullable, FK -> `users.id` | INDEX | Audit reference for deleting user |

### `lines`

| Column | Type | Constraints | Index | Notes |
|--------|------|-------------|-------|-------|
| `id` | `bigint` | PK, auto-increment | PRIMARY | Primary line identifier |
| `tenant_id` | `bigint` | nullable, FK -> `tenants.id` | INDEX | Multi-tenant isolation |
| `code` | `varchar(50)` | NOT NULL | UNIQUE | Unique line code (e.g. `L-01`) |
| `name` | `varchar(255)` | NOT NULL | | Human-readable line name |
| `description` | `text` | nullable | | Optional description |
| `is_active` | `boolean` | NOT NULL, default `true` | INDEX | Operational availability flag |
| `area_id` | `bigint` | nullable, FK -> `areas.id` | INDEX | ISA-95 Area grouping |
| `division_id` | `bigint` | nullable, FK -> `divisions.id` | INDEX | Workforce division grouping |
| `warehouse_id` | `bigint` | nullable, FK -> `warehouses.id` | INDEX | Dedicated line-side warehouse |
| `view_template_id` | `bigint` | nullable, FK -> `view_templates.id` | INDEX | Custom UI column layout template |
| `planning_efficiency_pct` | `decimal(5,2)` | NOT NULL, default `100.00` | | Efficiency factor for auto-scheduling |
| `custom_fields` | `jsonb` | nullable | | Dynamic tenant-defined attributes |
| `created_at` | `timestamp` | nullable | | Creation timestamp |
| `updated_at` | `timestamp` | nullable | | Modification timestamp |
| `deleted_at` | `timestamp` | nullable | INDEX | Soft-delete timestamp |
| `deleted_by_id` | `bigint` | nullable, FK -> `users.id` | INDEX | Deleting user audit reference |

### `workstations`

| Column | Type | Constraints | Index | Notes |
|--------|------|-------------|-------|-------|
| `id` | `bigint` | PK, auto-increment | PRIMARY | Primary station identifier |
| `tenant_id` | `bigint` | nullable, FK -> `tenants.id` | INDEX | Multi-tenant isolation |
| `line_id` | `bigint` | NOT NULL, FK -> `lines.id` | INDEX | Parent production line |
| `workstation_type_id` | `bigint` | nullable, FK -> `workstation_types.id` | INDEX | Station classification |
| `code` | `varchar(50)` | NOT NULL | UNIQUE | Station code (e.g. `WS-CUT-01`) |
| `name` | `varchar(255)` | NOT NULL | | Station name |
| `ideal_rate` | `decimal(10,2)` | nullable | | Design units per hour for OEE |
| `is_active` | `boolean` | NOT NULL, default `true` | INDEX | Station operational state |
| `custom_fields` | `jsonb` | nullable | | Dynamic custom fields |
| `created_at` | `timestamp` | nullable | | Creation timestamp |
| `updated_at` | `timestamp` | nullable | | Modification timestamp |
| `deleted_at` | `timestamp` | nullable | INDEX | Soft-delete timestamp |

### `work_orders`

| Column | Type | Constraints | Index | Notes |
|--------|------|-------------|-------|-------|
| `id` | `bigint` | PK, auto-increment | PRIMARY | Primary work order identifier |
| `tenant_id` | `bigint` | nullable, FK -> `tenants.id` | INDEX | Multi-tenant isolation |
| `order_no` | `varchar(100)` | NOT NULL | UNIQUE (partial) | Unique order reference (`WO-2026-0001`) |
| `customer_order_no` | `varchar(100)` | nullable | INDEX | External customer purchase order |
| `customer_id` | `bigint` | nullable, FK -> `customers.id` | INDEX | Customer reference |
| `line_id` | `bigint` | nullable, FK -> `lines.id` | INDEX | Primary assigned production line |
| `secondary_line_id` | `bigint` | nullable, FK -> `lines.id` | INDEX | Secondary/overflow production line |
| `product_type_id` | `bigint` | nullable, FK -> `product_types.id` | INDEX | Finished product definition |
| `product_revision_id` | `bigint` | nullable, FK -> `product_revisions.id` | INDEX | Engineering revision in production |
| `status` | `varchar(50)` | NOT NULL, default `'PENDING'` | INDEX | `PENDING`, `ACCEPTED`, `IN_PROGRESS`, `DONE`, `CANCELLED` |
| `planned_qty` | `integer` | NOT NULL | | Target production quantity |
| `produced_qty` | `integer` | NOT NULL, default `0` | | Total finished good parts reported |
| `packed_qty` | `integer` | NOT NULL, default `0` | | Total parts scanned at packaging station |
| `unit_price` | `decimal(12,2)` | nullable | | Selling unit price for revenue tracking |
| `priority` | `varchar(20)` | NOT NULL, default `'NORMAL'` | INDEX | `LOW`, `NORMAL`, `HIGH`, `URGENT` |
| `priority_score` | `integer` | NOT NULL, default `0` | INDEX | Computed scheduling priority |
| `snapshot_version` | `integer` | NOT NULL, default `1` | | Immutable recipe snapshot version |
| `planned_start_at` | `timestamp` | nullable | INDEX | Scheduled start date/time |
| `planned_end_at` | `timestamp` | nullable | INDEX | Scheduled completion date/time |
| `completed_at` | `timestamp` | nullable | | Actual completion date/time |
| `custom_fields` | `jsonb` | nullable | | Dynamic tenant custom fields |
| `created_at` | `timestamp` | nullable | | Creation timestamp |
| `updated_at` | `timestamp` | nullable | | Modification timestamp |
| `deleted_at` | `timestamp` | nullable | INDEX | Soft-delete timestamp |
| `deleted_by_id` | `bigint` | nullable, FK -> `users.id` | INDEX | Deleting user audit reference |

### `batches`

| Column | Type | Constraints | Index | Notes |
|--------|------|-------------|-------|-------|
| `id` | `bigint` | PK, auto-increment | PRIMARY | Primary batch identifier |
| `tenant_id` | `bigint` | nullable, FK -> `tenants.id` | INDEX | Multi-tenant isolation |
| `work_order_id` | `bigint` | NOT NULL, FK -> `work_orders.id` | INDEX | Parent work order |
| `batch_number` | `varchar(100)` | NOT NULL | UNIQUE (partial) | Unique lot/batch identifier |
| `quantity` | `integer` | NOT NULL | | Batch quantity |
| `status` | `varchar(50)` | NOT NULL, default `'PENDING'` | INDEX | Batch execution status |
| `lot_release_status` | `varchar(50)` | NOT NULL, default `'PENDING'` | INDEX | Quality disposition (`QUARANTINE`, `RELEASED`, `REJECTED`) |
| `started_at` | `timestamp` | nullable | | Production start timestamp |
| `completed_at` | `timestamp` | nullable | | Production completion timestamp |
| `created_at` | `timestamp` | nullable | | Creation timestamp |
| `updated_at` | `timestamp` | nullable | | Modification timestamp |
| `deleted_at` | `timestamp` | nullable | INDEX | Soft-delete timestamp |

### `batch_steps`

| Column | Type | Constraints | Index | Notes |
|--------|------|-------------|-------|-------|
| `id` | `bigint` | PK, auto-increment | PRIMARY | Primary step identifier |
| `tenant_id` | `bigint` | nullable, FK -> `tenants.id` | INDEX | Multi-tenant isolation |
| `batch_id` | `bigint` | NOT NULL, FK -> `batches.id` | INDEX | Parent batch |
| `template_step_id` | `bigint` | NOT NULL, FK -> `template_steps.id` | INDEX | Originating recipe step definition |
| `workstation_id` | `bigint` | nullable, FK -> `workstations.id` | INDEX | Assigned execution workstation |
| `sequence` | `integer` | NOT NULL | INDEX | Sequential order in process routing |
| `status` | `varchar(50)` | NOT NULL, default `'PENDING'` | INDEX | `PENDING`, `IN_PROGRESS`, `PAUSED`, `COMPLETED` |
| `quantity_passed` | `integer` | NOT NULL, default `0` | | Parts passed through this step |
| `quantity_scrapped` | `integer` | NOT NULL, default `0` | | Parts scrapped during this step |
| `started_at` | `timestamp` | nullable | | Step start timestamp |
| `completed_at` | `timestamp` | nullable | | Step completion timestamp |
| `created_at` | `timestamp` | nullable | | Creation timestamp |
| `updated_at` | `timestamp` | nullable | | Modification timestamp |
| `deleted_at` | `timestamp` | nullable | INDEX | Soft-delete timestamp |

### `materials` & `material_lots`

| Table | Column | Type | Constraints | Notes |
|-------|--------|------|-------------|-------|
| `materials` | `id` | `bigint` | PK | Primary material identifier |
| `materials` | `code` | `varchar(50)` | UNIQUE (partial) | Material/raw part code |
| `materials` | `material_type_id` | `bigint` | FK -> `material_types.id` | Category/classification |
| `materials` | `unit_of_measure` | `varchar(20)` | NOT NULL | e.g. `pcs`, `kg`, `meters` |
| `materials` | `stock_quantity` | `decimal(12,4)` | default `0` | Aggregate inventory count |
| `material_lots` | `id` | `bigint` | PK | Primary lot identifier |
| `material_lots` | `lot_number` | `varchar(100)` | UNIQUE (partial) | Unique supplier/plant lot number |
| `material_lots` | `material_id` | `bigint` | FK -> `materials.id` | Material reference |
| `material_lots` | `quantity_received`| `decimal(12,4)` | NOT NULL | Initial received quantity |
| `material_lots` | `quantity_available`| `decimal(12,4)`| NOT NULL | Remaining usable quantity |
| `material_lots` | `status` | `varchar(50)` | default `'received'`| `received`, `quarantine`, `released`, `consumed`, `rejected` |
| `material_lots` | `expiry_date` | `date` | nullable | Shelf life expiration |

### `issues`

| Column | Type | Constraints | Index | Notes |
|--------|------|-------------|-------|-------|
| `id` | `bigint` | PK, auto-increment | PRIMARY | Primary issue identifier |
| `tenant_id` | `bigint` | nullable, FK -> `tenants.id` | INDEX | Multi-tenant isolation |
| `work_order_id` | `bigint` | nullable, FK -> `work_orders.id` | INDEX | Linked work order |
| `issue_type_id` | `bigint` | NOT NULL, FK -> `issue_types.id` | INDEX | Category (shortage, tool, quality) |
| `title` | `varchar(255)` | NOT NULL | | Summary of the reported issue |
| `status` | `varchar(50)` | NOT NULL, default `'OPEN'` | INDEX | `OPEN`, `ACKNOWLEDGED`, `RESOLVED`, `CLOSED` |
| `disposition` | `varchar(50)` | nullable | | `quarantine`, `rework`, `scrap`, `return_to_supplier` |
| `reported_by_id` | `bigint` | NOT NULL, FK -> `users.id` | INDEX | Submitting operator |
| `assigned_to_id` | `bigint` | nullable, FK -> `users.id` | INDEX | Responsible supervisor/technician |
| `reported_at` | `timestamp` | NOT NULL | | Time problem reported |
| `resolved_at` | `timestamp` | nullable | | Time problem cleared |
| `created_at` | `timestamp` | nullable | | Creation timestamp |
| `updated_at` | `timestamp` | nullable | | Modification timestamp |

### `audit_logs`

| Column | Type | Constraints | Index | Notes |
|--------|------|-------------|-------|-------|
| `id` | `bigint` | PK, auto-increment | PRIMARY | Primary audit record |
| `tenant_id` | `bigint` | nullable | INDEX | Multi-tenant isolation |
| `user_id` | `bigint` | nullable, FK -> `users.id` | INDEX | Actor responsible for change |
| `auditable_type` | `varchar(255)` | NOT NULL | INDEX | Eloquent model class name |
| `auditable_id` | `bigint` | NOT NULL | INDEX | Model primary key |
| `action` | `varchar(50)` | NOT NULL | INDEX | `created`, `updated`, `deleted`, `restored` |
| `old_values` | `jsonb` | nullable | | State before mutation |
| `new_values` | `jsonb` | nullable | | State after mutation |
| `ip_address` | `varchar(45)` | nullable | | Client network IP address |
| `user_agent` | `text` | nullable | | Client user-agent string |
| `created_at` | `timestamp` | NOT NULL | INDEX | Immutable event timestamp |

---

## 3. Relationships Summary

| Table A | Relation | Table B | Foreign Key |
|---------|----------|---------|-------------|
| `companies` | `hasMany` | `sites` | `sites.company_id` |
| `sites` | `hasMany` | `areas` | `areas.site_id` |
| `areas` | `hasMany` | `lines` | `lines.area_id` |
| `lines` | `hasMany` | `workstations` | `workstations.line_id` |
| `lines` | `hasMany` | `work_orders` | `work_orders.line_id` |
| `product_types` | `hasMany` | `product_revisions` | `product_revisions.product_type_id` |
| `product_types` | `hasMany` | `process_templates` | `process_templates.product_type_id` |
| `process_templates` | `hasMany` | `template_steps` | `template_steps.process_template_id` |
| `process_templates` | `hasMany` | `bom_items` | `bom_items.process_template_id` |
| `work_orders` | `belongsTo` | `product_types` | `work_orders.product_type_id` |
| `work_orders` | `belongsTo` | `lines` | `work_orders.line_id` |
| `work_orders` | `belongsTo` | `customers` | `work_orders.customer_id` |
| `work_orders` | `hasMany` | `batches` | `batches.work_order_id` |
| `work_orders` | `hasMany` | `work_order_stops` | `work_order_stops.work_order_id` |
| `work_orders` | `hasMany` | `work_order_change_requests` | `work_order_change_requests.work_order_id` |
| `batches` | `hasMany` | `batch_steps` | `batch_steps.batch_id` |
| `batch_steps` | `belongsTo` | `workstations` | `batch_steps.workstation_id` |
| `batch_steps` | `belongsTo` | `template_steps` | `batch_steps.template_step_id` |
| `materials` | `belongsTo` | `material_types` | `materials.material_type_id` |
| `materials` | `hasMany` | `material_lots` | `material_lots.material_id` |
| `material_lots` | `hasMany` | `material_allocations` | `material_allocations.material_lot_id` |
| `batch_steps` | `hasMany` | `batch_step_lot_consumptions` | `batch_step_lot_consumptions.batch_step_id` |
| `issues` | `belongsTo` | `work_orders` | `issues.work_order_id` |
| `issues` | `belongsTo` | `issue_types` | `issues.issue_type_id` |
| `warehouses` | `hasMany` | `warehouse_stocks` | `warehouse_stocks.warehouse_id` |
| `warehouses` | `hasMany` | `stock_documents` | `stock_documents.warehouse_id` |
| `stock_documents` | `hasMany` | `stock_document_lines` | `stock_document_lines.stock_document_id` |

---

## 4. Indexing Strategy

| Table | Index | Columns | Type | Reason |
|-------|-------|---------|------|--------|
| `work_orders` | `work_orders_order_no_unique` | `order_no` (WHERE `deleted_at IS NULL`) | PARTIAL UNIQUE | Enforces unique order numbers while allowing soft-deleted numbers to be re-created. |
| `work_orders` | `work_orders_tenant_status_idx` | `tenant_id, status` | BTREE | Accelerates the active order list and supervisor dashboard queries. |
| `work_orders` | `work_orders_planned_start_idx` | `planned_start_at, planned_end_at` | BTREE | Fast date-window lookups for Gantt schedule planner rendering. |
| `lines` | `lines_code_unique` | `code` (WHERE `deleted_at IS NULL`) | PARTIAL UNIQUE | Ensures unique operational line codes per tenant without collision on deleted rows. |
| `material_lots` | `material_lots_lot_no_unique` | `lot_number` (WHERE `deleted_at IS NULL`) | PARTIAL UNIQUE | Uniqueness for lot tracking and regulatory traceability. |
| `material_lots` | `material_lots_mat_status_idx` | `material_id, status` | BTREE | Rapid lookup of released stock available for work order allocation. |
| `batch_steps` | `batch_steps_batch_seq_idx` | `batch_id, sequence` | BTREE | Fast retrieval of the sequential execution chain for operator workstations. |
| `audit_logs` | `audit_logs_auditable_idx` | `auditable_type, auditable_id` | BTREE | Instant historical audit inspection on any specific entity record. |
| `audit_logs` | `audit_logs_created_at_idx` | `created_at` | BTREE | Range-bounded chronological audit reporting and security review. |
| `custom_field_definitions` | `cfd_entity_key_unique` | `tenant_id, entity_type, key` | UNIQUE | Prevents conflicting custom field schema definitions on identical entity types. |

---

## 5. Migration Plan

| # | Migration | Table | Domain | Notes |
|---|-----------|-------|--------|-------|
| 1 | `0001_01_01_000000_create_users_table` | `users`, `password_reset_tokens`, `sessions` | Core / Auth | Base user accounts and database session storage. |
| 2 | `2026_02_16_210127_create_permission_tables` | Spatie RBAC tables (`roles`, `permissions`, pivots) | Security | Role-based authorization matrix. |
| 3 | `2026_02_16_210132_create_lines_table` | `lines` | Equipment | Production line foundation. |
| 4 | `2026_02_16_210133_create_workstations_table` | `workstations` | Equipment | Work unit equipment records. |
| 5 | `2026_02_16_210134_create_process_templates_table` | `process_templates` | Engineering | Standard operations and recipe routing. |
| 6 | `2026_02_16_210135_create_template_steps_table` | `template_steps` | Engineering | Step definitions and instructions. |
| 7 | `2026_02_16_210136_create_work_orders_table` | `work_orders` | Production | Work order tracking header. |
| 8 | `2026_02_16_210137_create_batches_table` | `batches` | Production | Lot/batch tracking under work orders. |
| 9 | `2026_02_16_210138_create_batch_steps_table` | `batch_steps` | Production | Execution tracking per workstation step. |
| 10 | `2026_02_16_210139_create_issues_table` | `issues` | Quality / Andon | Shop-floor issue and defect reporting. |
| 11 | `2026_02_16_210143_create_audit_logs_table` | `audit_logs` | Compliance | Tamper-evident operational audit trail. |
| 12 | `2026_03_20_000001_create_machine_connections_table` | `machine_connections`, `mqtt_connections`, `machine_topics` | IoT Connectivity | Machine telemetry and MQTT integration. |
| 13 | `2026_03_28_000001_create_work_order_eans_table` | `work_order_eans`, `packaging_scan_logs` | Packaging Module | Barcode scanning station and shift counters. |
| 14 | `2026_04_03_100001_create_tenants_table` | `tenants` | Multi-Tenancy | Tenant isolation infrastructure. |
| 15 | `2026_04_29_100001_create_material_types_table` | `material_types`, `materials`, `material_sources`, `bom_items` | Inventory / Materials | Raw materials catalog and Bill of Materials (BOM). |
| 16 | `2026_05_10_100001_create_downtime_reasons_table` | `downtime_reasons`, `production_downtimes`, `oee_records` | Analytics / OEE | Downtime tracking and OEE metrics engine. |
| 17 | `2026_07_06_100000_create_work_order_placements_table` | `work_order_placements`, `schedule_change_logs` | Planning | Multi-horizon Gantt scheduling engine. |
| 18 | `2026_08_03_100000_create_warehouses_table` | `warehouses`, `warehouse_stocks`, `stock_documents` | Warehousing / ERP | Warehouse balances and stock documents. |
| 19 | `2026_08_05_100000_create_work_order_snapshots_table` | `work_order_snapshots`, `work_order_stops`, `work_order_change_requests` | Change Control | Engineering change management during active production. |
| 20 | `2026_10_13_110000_create_schedule_simulations_table` | `schedule_simulations`, `scheduled_operations`, `changeover_rules` | Advanced Planning | Finite capacity auto-scheduling and setup rules. |

---

## 6. Seed Data

| Seeder | Purpose | Data Source |
|--------|---------|-------------|
| `DatabaseSeeder` | Master coordinator executing all base seeders during environment setup. | Code (`backend/database/seeders/DatabaseSeeder.php`) |
| `RolePermissionSeeder` | Populates default RBAC roles (`Admin`, `Supervisor`, `Operator`) and assigns granular permissions. | Code (`RolePermissionSeeder.php`) |
| `DefaultTenantSeeder` | Initializes the default tenant (`default`) ensuring all scoped tables have a valid tenant root. | Code (`DefaultTenantSeeder.php`) |
| `AdminUserSeeder` | Creates the root administrator user from environment variables (`ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`). | Environment variables / `.env` |
| `SampleDataSeeder` | Generates comprehensive sample production lines, process templates, product types, materials, and work orders for demonstration and testing. | Seed data factory (`SampleDataSeeder.php`) |
