# Architecture Plan — OpenMES

> **Output:** `.agent-knowledge/dynamic/docs/dev/sdd/ARCHITECTURE.md`
> **Purpose:** Technical blueprint for system design, components, data flow, security, deployment, and key decisions.
> **Status:** `CURRENT`

## Project Type Declaration

| Item | Value |
|------|-------|
| Project Type | Fullstack Monolith (Modular Laravel 12 Backend + React 19/Inertia.js SPA & Blade UI + Reverb WebSocket Live Sync) |
| Git Location | Single repository (`backend/`, `packages/`, `desktop/`, `mobile/`, `opcua-gateway/`) |

---

## 1. System Design

### Architecture Pattern

**Modular Monolith with High-Concurrency In-Memory Runtime (Octane/RoadRunner), Event-Driven WebSocket Live Sync (Laravel Reverb), and Containerized IoT Connectivity Sidecars.**

**Rationale:**
1. **Operational Simplicity for On-Premise Plants:** Small and mid-sized manufacturing facilities need a system that can be deployed via Docker Compose on commodity hardware (single mini-PC, local server, or NAS) with minimal maintenance overhead.
2. **Sub-Second Shop-Floor Reactivity:** Operators on shop-floor tablets require real-time updates when work orders move, counters increment, or Andon issues trigger. Combining Laravel Reverb with TanStack DB enables a snapshot-plus-delta synchronization model that eliminates page reloads and heavy polling.
3. **In-Memory Concurrency:** Running Laravel under Octane / RoadRunner provides multi-threaded request processing with low CPU/RAM footprint, keeping the framework booted in-memory between requests.
4. **Coexistence and Incremental Modernization:** The architecture seamlessly supports server-rendered Blade + Livewire 4 alongside React 19 + Inertia.js components, allowing progressive frontend migration without system rewrites.
5. **Decoupled Machine Telemetry:** Machine communication protocols (MQTT, Modbus TCP, OPC UA) run in dedicated background processes or sidecars, preventing slow industrial protocols from blocking web requests while feeding live data directly into the central database.

### High-Level Diagram

```text
                                  ┌─────────────────────────────────────────┐
                                  │           Industrial Floor / Clients    │
                                  │  - Tablet PWA (Operators)               │
                                  │  - Desktop Browser (Supervisors/Admins) │
                                  │  - Mobile Expo App / Desktop Tauri App  │
                                  └────────────────────┬────────────────────┘
                                                       │
                                            HTTP/HTTPS & WSS (:80, :443)
                                                       │
                                  ┌────────────────────▼────────────────────┐
                                  │           Caddy Reverse Proxy           │
                                  │  - Automatic TLS / Self-Signed CA       │
                                  │  - Static Asset / Proxy Routing         │
                                  └──────────┬───────────────────┬──────────┘
                                             │                   │
                        WebSocket (/app/*)   │                   │  All Web & API Traffic
                                             │                   │  (Port 8000)
                                  ┌──────────▼──────────┐ ┌──────▼─────────────────────┐
                                  │   Laravel Reverb    │ │    Laravel Octane App      │
                                  │  (WebSocket Daemon) │ │   (RoadRunner Runtime)     │
                                  │  - Pusher Protocol  │ │  - React 19 / Inertia.js   │
                                  │  - Private Channels │ │  - Blade / Livewire Views  │
                                  │    col.{tenant}.{ch}│ │  - REST API v1 (/api/v1)   │
                                  └──────────▲──────────┘ │  - ShapeRegistry Sync      │
                                             │            │  - Spatie RBAC / Sanctum   │
                                    Broadcast│Events      └──────────┬─────────────────┘
                                             │                       │
                                  ┌──────────┴───────────────────────▼─────────┐
                                  │               PostgreSQL 17                │
                                  │  - Relational Schema (Tables, Foreign Keys)│
                                  │  - Immutable Audit Logs (audit_logs)       │
                                  │  - Logical WAL Replication Configuration   │
                                  │  - Session and Queue Driver Storage        │
                                  └──────────▲───────────────────────▲─────────┘
                                             │                       │
                    Queue Jobs               │                       │ Ingest Counts
          ┌──────────────────────────────────┴─────┐   ┌─────────────┴─────────────────┐
          │         queue-worker Daemon            │   │ Machine Connectivity Layer    │
          │  - CSV/Excel Bulk Imports              │   │  - mqtt-listener (Artisan)    │
          │  - Webhook Delivery                    │   │  - modbus-poller (Artisan)    │
          │  - Telemetry Reporting                 │   │  - opcua-gateway (Node.js)    │
          └────────────────────────────────────────┘   └───────────────────────────────┘
```

---

## 2. Component Breakdown

| Component | Type | Responsibility | Technology |
|----------|------|----------------|------------|
| `backend` | Backend Application Server | Serves HTTP web routes, Inertia.js props, REST API v1 endpoints, database migrations, authorization, and event broadcasting. | Laravel 12, PHP 8.3, RoadRunner / Laravel Octane |
| `reverb` | Live-Sync WebSocket Server | Manages persistent client WebSocket connections, authenticates private tenant channels, and broadcasts real-time delta payloads. | Laravel Reverb 1.10 (Pusher protocol) |
| `caddy` | Edge Reverse Proxy & TLS | Terminates TLS, handles HTTP-to-HTTPS redirects, routes `/app/*` WebSockets to Reverb, and proxies web/API traffic to RoadRunner. | Caddy 2 (Alpine) |
| `postgres` | Primary Relational Database | Persistent data store for manufacturing models, users, configurations, sessions, jobs, and immutable audit logs. | PostgreSQL 17 (Alpine) |
| `queue-worker` | Asynchronous Background Worker | Processes asynchronous jobs including CSV/Excel imports, webhook dispatches, and periodic telemetry. | Laravel Queue Worker (`queue:work`) |
| `mqtt-listener` | IoT Ingestion Daemon | Subscribes to MQTT machine topics and translates machine messages into counter increments and step progress. | Artisan Command (`mqtt:listen`), `php-mqtt/client` |
| `modbus-poller` | Machine Ingestion Daemon | Polls industrial Modbus TCP registers across configured connections to record machine cycles and status. | Artisan Command (`modbus:poll`), `aldas/modbus-tcp-client` |
| `opcua-gateway` | IoT Sidecar Gateway | Connects to industrial OPC UA servers, monitors node variables, and posts updates into the OpenMES REST API. | Node.js, `node-opcua`, Docker |
| `@openmes/ui` | Frontend Component Library | Reusable React UI primitives (buttons, dialogs, inputs, tables, badges, toasts, snackbars) for MES screens. | React 19, Tailwind CSS 4 |
| `@openmes/module` | Extension Framework | Client-side SDK and contracts for third-party and custom module extensions. | TypeScript / JavaScript |
| `desktop` | Native Desktop Shell | Cross-platform desktop application packaging OpenMES for supervisors and planners on Windows/Linux/macOS. | Tauri (Rust + Vite) |
| `mobile` | Mobile Shop-Floor Client | Mobile application for operators, barcode scanning, and shop-floor inventory moves. | Expo / React Native, TypeScript |

---

## 3. Routing & Middleware Strategy

### Monolith (Laravel/Blade & Inertia.js)

- **Route Groups by Role Domain (`routes/web.php`):**
  - Public / Auth routes: `/login`, `/register`, `/two-factor-challenge`, `/onboarding`.
  - Operator routes: `/operator/*` guarded by `role:Operator|Supervisor|Admin`, line assignments, and session auth.
  - Supervisor routes: `/supervisor/*` guarded by `role:Supervisor|Admin`.
  - Admin routes: `/admin/*` guarded by `role:Admin`.
  - Packaging station: `/operator/packaging` and `/packaging/*`.
- **Middleware Pipeline:**
  - `web` group: Encrypted cookies, session start, CSRF verification (`VerifyCsrfToken`), Inertia middleware (`HandleInertiaRequests`).
  - Role verification: `spatie/laravel-permission` middleware (`role:Admin`, `role:Supervisor|Admin`, `permission:*`).
  - Tenant scoping: Automatic tenant binding based on user session or domain.
  - Reverse proxy trust: `TrustProxies(at: '*')` configured in `bootstrap/app.php` for Caddy forwarded headers.

### Fullstack (REST API & SPA Live Sync)

- **API Prefix:** `/api/v1/` (`routes/api.php`) for programmatic operations, mobile apps, and machine ingestion.
- **Collection Snapshots:** `GET /api/collections/{name}` handled by `CollectionController` to serve initial read snapshots based on `ShapeRegistry`.
- **Authentication:**
  - Web & Inertia SPA: Session-based cookie auth via Laravel Sanctum (stateful domains configured via `SANCTUM_STATEFUL_DOMAINS` and `APP_URL`).
  - External API / Mobile / Gateway: Bearer tokens via Laravel Sanctum (`personal_access_tokens` / API keys).
- **CORS Policy:** Stateful SPA domains whitelisted in Sanctum configuration; API token endpoints permit designated integration hosts.
- **WebSocket Channel Authorization (`routes/channels.php`):**
  - Tenant collection channels: `col.{tenantKey}.{collection}` authorized via session cookie against the requested tenant.
  - Private user notification channels: `private-App.Models.User.{id}`.

---

## 4. Data Flow

### Live Sync Read Path (Snapshot + WebSocket Delta)

```text
[Client: Browser/Tablet]
       │
       ├─► 1. Initial Load: GET /api/collections/{shape_name}
       │      │
       │      ▼
       │   [Laravel: CollectionController]
       │      │ Validates tenant access & queries ShapeRegistry column allowlist
       │      ▼
       │   [PostgreSQL 17]
       │      │ Returns current rows + snapshot timestamp
       │      ▼
       │   [Client receives snapshot] ──► Hydrates TanStack DB Collection
       │
       └─► 2. Live Subscription: WebSocket connects to Caddy (/app/*)
              │
              ▼
           [Laravel Reverb: joins private channel col.{tenant}.{shape_name}]
              ▲
              │ Broadcasts CollectionChanged payload (type: insert|update|delete, row: {...})
              │
           [Backend: Eloquent Mutation] ──► ShouldBroadcastNow Event fired
              │
           [Client receives delta] ──► TanStack DB updates local store ──► React view re-renders (~50ms)
```

### Command / Write Path

```text
[Operator / User Action: Submit Form or Scan Barcode]
       │
       ▼ (HTTP POST / PUT / DELETE)
[Caddy Reverse Proxy]
       │
       ▼
[Laravel Octane / RoadRunner Worker]
       │
       ├─► Middleware: Session Auth, CSRF Check, Tenant Resolution
       ├─► FormRequest Validation (e.g., StoreWorkOrderRequest, ScanPackagingRequest)
       ├─► Controller / Service Execution inside DB Transaction
       │      │
       │      ├─► Write to PostgreSQL (Entity update + Immutable audit_logs trigger)
       │      ├─► Dispatch Domain Events (e.g. WorkOrderCompleted, StepStarted)
       │      └─► Fire CollectionChanged (ShouldBroadcastNow)
       │             │
       │             ▼
       │         [Laravel Reverb publishes delta to WebSocket channel]
       │
       └─► Returns HTTP Redirect (with flash message) OR JSON Response
```

---

## 5. Security Plan

| Area | Strategy | Codebase Reference |
|------|----------|-------------------|
| Authentication | Multi-guard authentication via Laravel Sanctum. Session cookie authentication for browser/Inertia clients; Bearer personal access tokens for API integrations and machine gateways; Time-based One-Time Password (TOTP) two-factor authentication via `pragmarx/google2fa-laravel`; quick operator PIN switching. | `app/Http/Controllers/Web/AuthController.php`, `TwoFactorController.php`, `config/sanctum.php` |
| Authorization | Granular Role-Based Access Control (RBAC) powered by `spatie/laravel-permission` with roles `Admin`, `Supervisor`, `Operator`. Model policies for fine-grained entity ownership; line-level access restrictions for operators. | `app/Models/User.php`, `database/seeders/RolePermissionSeeder.php`, `app/Http/Requests/*` |
| CSRF Protection | Enforced on all web form submissions and Inertia mutations via encrypted CSRF tokens validated by Laravel default middleware. | `bootstrap/app.php`, Inertia Axios default headers |
| XSS Defense | Automatic contextual output escaping in Blade templates (`{{ }}`) and React JSX DOM bindings. Raw HTML injection (`dangerouslySetInnerHTML` / `{!! !!}`) is prohibited by linting and architectural convention. | `CLAUDE.md`, `resources/js/Pages/*` |
| SQL Injection Prevention | Absolute ban on raw SQL concatenation with user parameters. All database interactions strictly execute through Eloquent ORM or parameterized PDO query builders. | `CLAUDE.md`, `app/Models/*` |
| File Upload Security | Rigorous Form Request validation on MIME types, file extensions, and maximum file sizes. Stored outside the public web root in private storage (`storage/app/private`); served exclusively via authenticated streaming controllers with download permission checks. | `app/Http/Controllers/EngineeringViewerController.php`, `app/Http/Controllers/Api/V1/AttachmentController.php` |
| Immutable Audit Logging | Complete, tamper-proof historical tracking enforced at the database level. All mutating actions capture actor ID, action type, IP address, before/after JSON states, and timestamps. Hard deletes are forbidden across business models via `SoftDeletesWithAudit`. | `app/Models/Concerns/SoftDeletesWithAudit.php`, `app/Models/AuditLog.php`, `database/migrations/*audit_logs*` |
| Shape Sync Security | Clients subscribe strictly by shape name, never arbitrary SQL tables. Column projection is hardcoded in `ShapeRegistry` (sensitive attributes like password hashes, PINs, and webhook secrets are strictly omitted); server-enforced tenant WHERE clauses prevent data leakage. | `app/Sync/ShapeRegistry.php`, `app/Sync/Shape.php`, `app/Http/Controllers/Api/V1/CollectionController.php` |

---

## 6. Deployment Architecture

```text
Git Repository (develop/main)
       │
       ├─► GitHub Actions CI (.github/workflows/tests.yml)
       │      ├─ Code Style (Pint)
       │      ├─ Static Security Audit (composer audit, npm audit)
       │      └─ Test Suite (phpunit, vitest)
       │
       ├─► Automated Container Build (ghcr.io/mes-open/openmes)
       │
       └─► Plant Deployment: Single-command installer (install.sh / install.ps1)
              │
              ▼
       Docker Compose Stack (Local Server / Host Machine)
          ├── caddy (:80, :443)
          ├── backend (Laravel Octane on RoadRunner :8000)
          ├── reverb (WebSocket daemon :8080)
          ├── postgres (PostgreSQL 17 :5432)
          ├── queue-worker (Laravel background worker)
          └── Optional connectivity profiles:
                ├── mqtt-listener
                ├── modbus-poller
                └── opcua-gateway
```

| Environment | Server | Domain | Branch |
|------------|--------|--------|--------|
| Local Development | Developer Workstation (Docker Compose with `docker-compose.dev.yml` overlay, Vite HMR watcher, bind mounts) | `http://localhost:8000` or `http://localhost` | Feature branches / `develop` |
| Continuous Integration (CI) | GitHub Actions Runner (Ubuntu Linux, PHP 8.3, PostgreSQL 17 service container) | N/A | `develop`, Pull Requests |
| Staging / Live Demo | Cloud VM / Demo Server | `demo.getopenmes.com` | `develop` |
| Production On-Premise | Plant edge server / bare metal / on-premise VM / NAS | Configurable plant hostname (e.g. `mes.plant.local`) or LAN IP | `main` (tagged release `vX.Y.Z`) |

---

## 7. Key Decisions

| # | Decision | Rationale | ADR |
|---|----------|-----------|-----|
| 1 | Hybrid Laravel 12 Monolith with React 19 / Inertia.js and Octane / RoadRunner | Preserves monolithic deployment simplicity while providing modern, highly reactive UI components and high-concurrency request throughput on edge hardware. | [.agent-knowledge/dynamic/docs/notes/ADR-001-hybrid-laravel-react-live-sync-architecture.md](file:///home/ughway/Debiancode/Notmyprojects/OpenMes/.agent-knowledge/dynamic/docs/notes/ADR-001-hybrid-laravel-react-live-sync-architecture.md) |
| 2 | Immutable PostgreSQL Audit Logs and Soft Deletes with Audit | Guarantees regulatory compliance under ISO 9001 and AS9100 manufacturing standards by ensuring non-repudiation and preventing data destruction. | [.agent-knowledge/dynamic/docs/notes/ADR-002-immutable-postgresql-audit-logs-and-change-control.md](file:///home/ughway/Debiancode/Notmyprojects/OpenMes/.agent-knowledge/dynamic/docs/notes/ADR-002-immutable-postgresql-audit-logs-and-change-control.md) |
| 3 | ShapeRegistry Snapshot-Plus-Delta WebSocket Synchronization | Delivers sub-200ms reactive shop-floor updates to tablets over a single multiplexed connection without allowing clients to query raw database tables or leak multi-tenant records. | [.agent-knowledge/dynamic/docs/notes/ADR-003-shape-registry-websocket-data-sync.md](file:///home/ughway/Debiancode/Notmyprojects/OpenMes/.agent-knowledge/dynamic/docs/notes/ADR-003-shape-registry-websocket-data-sync.md) |
| 4 | Decoupled Machine Connectivity Daemons (MQTT, Modbus TCP, OPC UA) | Isolates slow, poll-based, and persistent industrial machine communication protocols into independent background containers, preventing web request worker starvation. | In-code architecture (`docker-compose.yml`, `backend/app/Console/Commands/MqttListenCommand.php`) |
