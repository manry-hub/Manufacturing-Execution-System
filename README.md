# Manufacturing Execution System (MES) — Injection Molding Plant

Unified Manufacturing Execution System (MES) platform built for discrete injection molding manufacturing. Designed according to the **Hybrid ISA-95 Work Center Architecture**, seamlessly interconnecting multi-machine telemetry, production orders, real-time ISO 22400-2 OEE, Digital Andon dispatch, material lot genealogy, quality gates, mold preventive maintenance, and visual drag-and-drop Gantt scheduling.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Monorepo** | [pnpm workspaces](https://pnpm.io/), Node.js $\ge 20$, [Oxlint](https://oxc.rs/) (0 warnings/errors) |
| **Backend** | [NestJS 12](https://nestjs.com/) (TypeScript ESM), [Socket.IO](https://socket.io/) Gateway |
| **Database & ORM** | [Microsoft SQL Server 2022](https://www.microsoft.com/sql-server/) (Docker), [Prisma ORM 6](https://www.prisma.io/) |
| **Frontend** | [React 19](https://react.dev/), [Vite 8](https://vitejs.dev/), [Tailwind CSS 4](https://tailwindcss.com/), [Lucide React](https://lucide.dev/) |
| **Design System** | [Atlassian Design System](https://atlassian.design/) tokens (Neutral `#292A2E`, Brand `#1868DB`, WCAG AA) |
| **Testing** | [Vitest](https://vitest.dev/) (Unit/Integration, 16 suites / 76 passing tests), [Playwright](https://playwright.dev/) (E2E) |

---

## 📋 Prerequisites

Before starting, ensure you have the following installed on your workstation:

- **Node.js**: `v20.x` or later (`node -v`)
- **pnpm**: `v9.x` or later (`pnpm -v`, project specifies `pnpm@12.6.0`)
- **Docker & Docker Compose**: For running the local Microsoft SQL Server 2022 instance (`docker compose version`)

---

## 🚀 Local Development Setup

Follow these step-by-step instructions to get the entire MES running locally:

### 1. Clone & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/manry-hub/Manufacturing-Execution-System.git
cd Manufacturing-Execution-System

# Install all workspace dependencies
pnpm install
```

### 2. Configure Environment Variables

Copy the example environment configuration into `.env`:

```bash
cp .env.example .env
```

Review `.env` settings (default configuration works out-of-the-box for local Docker development):

```env
# Database Settings (MS SQL Server)
MSSQL_SA_PASSWORD=YourStrong!Password2026
MSSQL_PORT=1433
MSSQL_DB=MES_DB
DATABASE_URL="sqlserver://localhost:1433;database=MES_DB;user=sa;password=YourStrong!Password2026;trustServerCertificate=true;encrypt=true"

# Backend & JWT
PORT=3000
JWT_SECRET=mes_dev_super_secret_jwt_key_at_least_32_characters_long
JWT_EXPIRATION=8h

# Frontend Port
VITE_PORT=5173
```

### 3. Start Database Container (MS SQL Server 2022)

Start the local database container via Docker Compose:

```bash
docker compose up -d
```

Verify the container is healthy:

```bash
docker ps --filter name=mes-mssql
```

### 4. Push Schema & Seed Initial Master Data

Synchronize the Prisma schema with SQL Server and populate initial master data (plants, 10 injection machines, molds, products, changeover matrix, backlog orders, and demo users):

```bash
# Push schema to database
pnpm --filter backend exec prisma db push

# Populate seed data
pnpm --filter backend exec prisma db seed
```

### 5. Launch the Development Servers

You can start both backend and frontend concurrently using the root script:

```bash
# Run both Backend (:3000) and Frontend (:5173) concurrently
pnpm dev
```

Alternatively, run them in separate terminal tabs:

```bash
# Terminal 1: NestJS Backend API & Simulator Engine
pnpm dev:be

# Terminal 2: Vite Frontend Application
pnpm dev:fe
```

---

## 🌐 Endpoints & Ports

| Service | URL / Port | Description |
|---|---|---|
| **Frontend Web HMI** | [http://localhost:5173](http://localhost:5173) | Interactive shop floor dashboard & Gantt board |
| **Backend REST API** | [http://localhost:3000/api/v1](http://localhost:3000/api/v1) | NestJS RESTful API endpoints |
| **WebSocket Telemetry** | `ws://localhost:3000/telemetry` | Socket.IO real-time machine event stream |
| **MS SQL Server** | `localhost:1433` | Relational database (SA user) |

---

## 👥 Default Roles & Test Credentials

The system comes pre-seeded with canonical manufacturing roles. You can test role-based views using the role switcher dropdown in the sidebar:

| Role | Username | Password | Scope / Permissions |
|---|---|---|---|
| **Supervisor** | `supervisor` | `Password123!` | Full shop floor oversight, order dispatch, Andon triage |
| **Operator** | `operator` | `Password123!` | Machine workstation view, scrap logging, manual Andon trigger |
| **Technician** | `technician` | `Password123!` | Maintenance work orders, mold PM reset, fault diagnostics |
| **Planner** | `planner` | `Password123!` | Production orders, Gantt drag-and-drop scheduling, mold matrix |
| **Quality** | `quality` | `Password123!` | First-piece approval checks, inspection plans, quarantine |
| **Admin** | `admin` | `Password123!` | Full administrative access, audit logs, system configuration |

---

## 🧰 Development Commands

| Command | Description |
|---|---|
| `pnpm dev` | Starts backend and frontend concurrently with live reloading |
| `pnpm dev:be` | Starts only the NestJS backend in watch mode |
| `pnpm dev:fe` | Starts only the Vite frontend dev server |
| `pnpm lint` | Runs ultra-fast Oxlint across all TypeScript and TSX files |
| `pnpm test` | Executes all 16 Vitest backend unit and integration test suites |
| `pnpm build` | Compiles both backend NestJS distribution and frontend Vite client |
| `pnpm --filter backend exec prisma studio` | Opens Prisma Studio web UI at `http://localhost:5555` |
| `pnpm format` | Formats codebase using Prettier |

---

## 📁 Repository Structure

```text
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # MS SQL Server relational schema
│   │   └── seed.ts             # Deterministic seed data (molds, machines, backlog)
│   ├── src/
│   │   ├── common/             # Guards (JWT, RBAC), filters, interceptors
│   │   ├── database/           # Prisma service integration
│   │   └── modules/
│   │       ├── andon/          # Digital Andon ticketing & dispatch
│   │       ├── auth/           # JWT authentication & user accounts
│   │       ├── maintenance/    # Mold stroke tracking & PM work orders
│   │       ├── master-data/    # Machines, molds, products, areas, plants
│   │       ├── materials/      # Raw resin lot management & genealogy
│   │       ├── oee/            # ISO 22400-2 OEE calculation engine
│   │       ├── packaging/      # Carton packaging units & reconciliation
│   │       ├── production/     # Production orders, operations, runs
│   │       ├── quality/        # Inspection plans, sample checks, first-piece
│   │       ├── scheduling/     # Visual Gantt, cycle calculation, changeover matrix
│   │       ├── simulator/      # 10 virtual injection molding machines simulator
│   │       └── telemetry/      # Ingestion service & Socket.IO gateway
│   └── test/                   # Integration and E2E test specs
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── andon/          # Digital Andon triage board
│   │   │   ├── layout/         # Atlassian nested sidebar & navigation
│   │   │   ├── machines/       # Shop floor grid & machine detail views
│   │   │   ├── maintenance/    # Tooling PM & mold work orders
│   │   │   ├── materials/      # Resin lots & genealogy view
│   │   │   ├── oee/            # OEE scorecards & downtime Pareto charts
│   │   │   ├── packaging/      # Packaging station & shot-to-pack reconciliation
│   │   │   ├── production/     # Production orders & run management
│   │   │   ├── quality/        # Quality gates & first-piece inspection
│   │   │   └── scheduling/     # Visual Gantt timeline with Drag & Drop
│   │   ├── services/           # Typed API service & Socket.IO client
│   │   └── types/              # Domain TypeScript interfaces
├── .agent-knowledge/           # Dynamic workflows, task reports, architecture docs
├── docker-compose.yml          # Microsoft SQL Server 2022 service
└── package.json                # Monorepo scripts & workspaces
```

---

## 🧪 Verifying the Setup

To verify that your local environment is completely healthy:

```bash
# 1. Run linter (must report 0 warnings and 0 errors)
pnpm lint

# 2. Run backend test suite (all 76 tests should pass)
pnpm --filter backend test

# 3. Test production build
pnpm build
```

---

## 📄 License

Internal project / Proprietary. All rights reserved.
