# Technology Stack — OpenMES

> **Output:** `.agent-knowledge/dynamic/docs/dev/sdd/TECHNOLOGYSTACK.md`
> **Purpose:** Canonical list of technologies, versions, and their roles in the system.
> **Status:** `CURRENT`

| Layer | Technology | Version | Role |
|-------|------------|---------|------|
| Backend Runtime | PHP | ^8.2 (Container uses 8.3) | Core server execution language for manufacturing domain logic, controllers, and services. |
| Backend Framework | Laravel Framework | ^12.0 (`laravel/framework`) | Web and REST API framework providing routing, Eloquent ORM, event bus, validation, and container services. |
| Application Server | Laravel Octane + RoadRunner | Octane ^2.17, RoadRunner HTTP ^3.3 / CLI ^2.6 | High-concurrency in-memory application runtime serving requests without per-request PHP bootstrapping. |
| Frontend SPA Layer | React | ^19.2.6 (`react`, `react-dom`) | Modern component-driven UI for workstation screens, Gantt scheduler, and management tables. |
| Frontend Integration | Inertia.js React Adapter | ^3.3.0 (`@inertiajs/react`), ^3.1 (`inertiajs/inertia-laravel`) | Monolithic SPA bridge connecting Laravel controllers directly to React page components without client-side routing. |
| Legacy Frontend | Blade Templates & Livewire | Livewire ^4.0, Alpine.js ^3.15.8 | Server-rendered templates and reactive components being progressively ported to Inertia.js React. |
| Styling & UI Utilities | Tailwind CSS | ^4.0.0 (`tailwindcss`, `@tailwindcss/vite`) | Utility-first styling framework with full dark-mode support across all operator and supervisor interfaces. |
| Shared UI Components | `@openmes/ui` | Workspace package (`packages/ui`) | Internal component library providing accessible design tokens, buttons, dialogs, inputs, snackbars, and toasts. |
| Reactive Client Store | TanStack DB | ^0.6.7 (`@tanstack/db`), ^0.1.85 (`@tanstack/react-db`) | Client-side reactive collection store receiving real-time WebSocket deltas for instant UI rendering. |
| Data Tables & Flowcharts | TanStack Table, Dagre, XYFlow | TanStack Table ^8.21.3, `@xyflow/react` ^12.11.5, `@dagrejs/dagre` ^3.1.1 | Complex grid data tables and visual process flow / node diagram modeling. |
| Live Sync Broadcasting | Laravel Reverb | ^1.10 (`laravel/reverb`) | High-performance, first-party WebSocket server handling client connections via Pusher protocol. |
| Client WebSocket Driver | Laravel Echo & Pusher JS | Echo ^2.3.7 (`laravel-echo`), Pusher JS ^8.5.0 (`pusher-js`) | Browser WebSocket connection manager maintaining a single multiplexed live connection to Reverb. |
| Database Engine | PostgreSQL | 17+ (Docker: `postgres:17-alpine`) | Relational ACID database with logical WAL replication, soft-delete audit constraints, and JSONB custom field storage. |
| Cache & Session Storage | PostgreSQL Database Driver | PostgreSQL 17 / Laravel Database Cache | Server-side session and application caching stored in database tables (`cache`, `sessions`) to avoid Redis dependency. |
| Queue Driver | Laravel Database Queue | PostgreSQL 17 (`jobs`, `failed_jobs`) | Asynchronous job execution for CSV/Excel data imports, outgoing webhooks, and telemetry dispatches. |
| Search Engine | PostgreSQL Full-Text & Indexes | PostgreSQL 17 (B-Tree, Partial Unique Indexes, ILIKE / Full-Text) | In-database search for work orders, customers, materials, and batch steps. |
| File & Attachment Storage | Local Filesystem / Docker Volumes | Local disk (`backend_storage` mounted to `/var/www/html/storage`) | Private storage for engineering drawings, work order attachments, and generated PDF reports. |
| Web Server & Reverse Proxy | Caddy | 2.x (`caddy:2-alpine`) | Unified reverse proxy terminating TLS, routing `/app/*` WebSockets to Reverb, and proxying HTTP traffic to RoadRunner. |
| Authentication & Permissions | Laravel Sanctum & Spatie Permission | Sanctum ^4.3, Spatie Permission ^7.1, Google2FA ^3.0 | Multi-guard authentication (session cookies, API tokens), RBAC roles (`Admin`, `Supervisor`, `Operator`), and TOTP 2FA. |
| Machine IoT (MQTT) | PHP MQTT Client | ^2.0 (`php-mqtt/client`) | Artisan daemon (`mqtt:listen`) connecting to plant MQTT brokers for machine cycle counts and state changes. |
| Machine IoT (Modbus) | Modbus TCP Client | ^3.6 (`aldas/modbus-tcp-client`) | Artisan daemon (`modbus:poll`) polling industrial PLC registers over Ethernet Modbus TCP. |
| Machine IoT (OPC UA) | Node OPC UA Gateway | `node-opcua` (Node.js 20 Alpine Sidecar) | Sidecar container bridging OPC UA server nodes into OpenMES REST ingestion endpoints. |
| Barcode & QR Generation | Barcode & QR Code Generators | `picqer/php-barcode-generator ^3.2`, `endroid/qr-code ^5.0` | Server-side generation of Code128, EAN-13 barcodes, and QR codes for packaging labels and job travelers. |
| Excel & CSV Processing | PhpSpreadsheet & League CSV | `maatwebsite/excel ^3.1`, `league/csv ^9.28` | High-throughput parsing and generation of spreadsheets for work order and master data imports/exports. |
| PDF Reporting | Laravel DomPDF | ^3.1 (`barryvdh/laravel-dompdf`) | Server-side PDF generation for work order travelers, production batch records, and OEE audit reports. |
| Analytics Visualization | Chart.js | ^4.5.1 (`chart.js`) | Client-side canvas charts rendering throughput, OEE trends, and downtime distribution. |
| Cross-Platform Desktop | Tauri | Tauri v2 (Rust + Vite) | Native lightweight desktop wrapper for Windows, Linux, and macOS planners and supervisors (`desktop/`). |
| Cross-Platform Mobile | React Native & Expo | Expo SDK 52+, React Native | Mobile tablet and handheld shop-floor inventory and barcode scanning application (`mobile/`). |
| Frontend Build Tool | Vite | ^7.0.7 (`vite`), Vitest ^3.2.7 | Rapid asset compilation and hot module replacement (HMR) for React, Inertia, and Tailwind CSS. |
| Testing Frameworks | PHPUnit & Vitest | PHPUnit ^11.5.3, Vitest ^3.2.7 | Comprehensive feature/unit test suites across backend domain logic and frontend components. |
| Code Quality & Linter | Laravel Pint & ESLint | Pint ^1.24, ESLint | Automated code formatting enforcing PSR-12 conventions on PHP and strict linting on JavaScript/JSX. |
