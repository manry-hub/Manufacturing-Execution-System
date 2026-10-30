# Implementation Workflow 001: Foundation & Master Data (Phase 1)

**Status:** APPROVED FOR STAGED EXECUTION  
**Target Completion:** Phase 1 (Foundation & Master Data Baseline)  
**References:**

- Product Requirements: [PRD.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/.agent-knowledge/dynamic/docs/dev/PRD.md)
- Architecture Plan: [ARCHITECTURE.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/.agent-knowledge/dynamic/docs/dev/sdd/ARCHITECTURE.md)
- Database Plan: [DATABASE.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/.agent-knowledge/dynamic/docs/dev/sdd/DATABASE.md)
- Technology Stack: [TECHNOLOGYSTACK.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/.agent-knowledge/dynamic/docs/dev/sdd/TECHNOLOGYSTACK.md)
- Coding Standards: [TYPESCRIPT-NESTJS.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/.agent-knowledge/static/rules/codestyle/TYPESCRIPT-NESTJS.md)

---

## 1. Staging Strategy & Phased Execution Roadmap

The implementation follows a strict phased approach to ensure mathematical rigor, data integrity, and isolated testability at each step:

```text
Phase 1: Foundation & Master Data (Current Target: Workflow 001)
  ├── Stage 1: Local Infrastructure & Database Container (MS SQL Server 2022)
  ├── Stage 2: Prisma ORM Integration & Relational Schema Modeling
  ├── Stage 3: Database Seeding (9 Roles, 10 Machines, 4 Areas, Products & Molds)
  ├── Stage 4: Database Module & Core Shared Infrastructure
  ├── Stage 5: Authentication & RBAC Authorization Engine
  ├── Stage 6: Master Data Management Services & REST APIs
  └── Stage 7: Audit Logging Service & Test Verification
            │
            ▼
Phase 2: Multi-Machine Simulator & Telemetry Ingestion (Workflow 002)
  └── 10-Machine Simulator (8 Normal, 1 Slow Cycle, 1 Fault), Event Ingestion, State Projections
            │
            ▼
Phase 3: Production Execution, OEE Engine & Digital Andon (Workflow 003)
  └── Work Orders, Runs, ISO 22400 OEE Engine, Andon Tickets & Pareto Analytics
```

---

## 2. Granular Stage-by-Stage Implementation Plan

### Stage 1: Local Infrastructure & Environment Configuration

_Objective: Stand up the containerized database environment and environment variable contracts._

1. **Create Root `docker-compose.yml`**:
   - Image: `mcr.microsoft.com/mssql/server:2022-latest`
   - Port: `1433:1433`
   - Volume: `mssql_data` for persistence across container restarts.
   - Environment: `ACCEPT_EULA=Y`, `MSSQL_SA_PASSWORD`, `MSSQL_PID=Developer`.
   - Health check: `sqlcmd` ping to verify database readiness before application connection.
2. **Environment Variable Configuration**:
   - Update `.env.example` and generate local development `.env`:
     ```ini
     DATABASE_URL="sqlserver://localhost:1433;database=MES_DB;user=sa;password=YourStrong!Password;trustServerCertificate=true;encrypt=true"
     JWT_SECRET="mes_dev_jwt_secret_key_super_secure_32_bytes_min"
     JWT_EXPIRATION="8h"
     PORT=3000
     VITE_PORT=5173
     ```

### Stage 2: Prisma ORM Integration & Relational Schema Modeling

_Objective: Integrate Prisma ORM in the backend workspace and model Phase 1 entities._

1. **Add Dependencies to `@mes/backend`**:
   - Dependencies: `@prisma/client`
   - DevDependencies: `prisma`, `bcrypt`, `@types/bcrypt`
2. **Configure Prisma Schema (`backend/prisma/schema.prisma`)**:
   - Generator: `prisma-client-js`
   - Datasource: `sqlserver`
   - Entities to implement:
     - `User`: `id` (UUID), `username`, `email`, `passwordHash`, `isActive`, `createdAt`, `updatedAt`
     - `Role`: `id` (UUID), `name`, `description`
     - `UserRoleAssignment`: composite key (`userId`, `roleId`)
     - `Plant`: `id` (UUID), `code` (unique), `name`, `timezone`, `createdAt`
     - `ProductionArea`: `id` (UUID), `plantId`, `code`, `name`, `createdAt`
     - `Machine`: `id` (UUID), `areaId`, `code` (unique), `name`, `clampingTonnage`, `isVirtual`, `createdAt`
     - `Product`: `id` (UUID), `partNumber` (unique), `name`, `standardCycleTime`, `createdAt`
     - `Mold`: `id` (UUID), `code` (unique), `name`, `cavityCount`, `totalShots`, `status`
     - `MoldProductCompatibility`: `id` (UUID), `moldId`, `productId`, `idealCycleTime`
     - `AuditLog`: `id` (BigInt Identity), `userId`, `action`, `entityType`, `entityId`, `oldValues`, `newValues`, `createdAt`
3. **Execute Baseline Migration**:
   - Command: `pnpm --filter backend exec prisma migrate dev --name init_foundation`

### Stage 3: Database Seeder Pipeline

_Objective: Populate deterministic baseline records for 10 machines, areas, products, and roles._

1. **Implement `backend/prisma/seed.ts`**:
   - **RoleSeeder**:
     - `System Administrator`, `Production Planner`, `Production Supervisor`
     - `Machine Operator`, `Quality Inspector`, `Maintenance Technician`
     - `Maintenance Supervisor`, `Material Handler`, `Management / Read-only Analyst`
   - **AdminUserSeeder**: Default administrator account (`admin` / default hashed password).
   - **PlantHierarchySeeder**:
     - `Plant 01` (Code: `PLANT-01`, Timezone: `Asia/Jakarta` / `UTC`)
     - 4 Production Areas:
       1. `INJ-PROD` — Injection Production
       2. `FIN-INSP` — Finishing & Inspection
       3. `MAT-PREP` — Material & Mold Preparation
       4. `Q-MAINT` — Quality & Maintenance
     - 10 Virtual Machines (`IMM-01` through `IMM-10`) assigned to `INJ-PROD`.
   - **ProductAndMoldSeeder**:
     - 2 Products: e.g., `PRD-BUMPER-FRONT` (Ideal CT: 25.0s), `PRD-DOOR-TRIM` (Ideal CT: 18.0s).
     - 2 Molds: `MOLD-BUMP-01` (2-cavity), `MOLD-TRIM-01` (4-cavity).
     - Mold-Product compatibility mapping with explicit `ideal_cycle_time`.
2. **Configure Package Seed Script**:
   - Add `"prisma": { "seed": "node --loader ts-node/esm prisma/seed.ts" }` (or tsx execution) in `backend/package.json`.

### Stage 4: Database Module & Core Infrastructure

_Objective: Build standard NestJS providers for Prisma and global lifecycle handlers._

1. **`PrismaService` & `PrismaModule` (`backend/src/database/`)**:
   - Lifecycle hook: `onModuleInit()` for explicit database connection with retry policy.
   - Global module export for seamless dependency injection across domain modules.
2. **Global Pipes, Interceptors & Filters**:
   - `ValidationPipe`: Whitelist filtering, automatic DTO transformation, and bad payload rejection.
   - `LoggingInterceptor`: Request execution duration, HTTP method, URL, and status logging.
   - `AllExceptionsFilter`: Uniform error structure: `{ statusCode, timestamp, path, message, errors }`.

### Stage 5: Authentication & RBAC Authorization Engine

_Objective: Secure all incoming API requests using stateless JWT and role-based guards._

1. **Module Structure (`backend/src/modules/auth/` & `users/`)**:
   - `AuthModule`: `PassportModule`, `JwtModule.registerAsync()` reading from `ConfigService`.
   - `JwtStrategy`: Extracts and validates Bearer token from headers.
   - `AuthService`: Validates credentials, executes password verification (`bcrypt.compare`), and signs JWT payloads.
   - `AuthController`:
     - `POST /api/v1/auth/login` — Public endpoint returning `{ accessToken, user, roles }`.
     - `GET /api/v1/auth/me` — Authenticated endpoint returning active user profile.
2. **Decorators & Guards**:
   - `@Roles(...roles: RoleEnum[])`: Custom metadata decorator.
   - `RolesGuard`: Verifies whether the authenticated user possesses the required role; returns HTTP 403 Forbidden on violation.
   - `@CurrentUser()`: Parameter decorator extracting user payload from `request.user`.

### Stage 6: Master Data Management Services & REST APIs

_Objective: Expose validated, protected REST APIs for factory topology and tooling._

1. **Module Structure (`backend/src/modules/master-data/`)**:
   - `PlantsController` & `PlantsService` (`/api/v1/plants`):
     - `GET /api/v1/plants` — List plants with area counts.
     - `GET /api/v1/plants/:id` — Get plant hierarchy details.
   - `AreasController` & `AreasService` (`/api/v1/areas`):
     - `GET /api/v1/areas` — List operational areas filtered by plant.
   - `MachinesController` & `MachinesService` (`/api/v1/machines`):
     - `GET /api/v1/machines` — List all 10 machines with current area assignment and virtual status.
     - `GET /api/v1/machines/:id` — Machine specifications and tonnages.
   - `ProductsController` & `ProductsService` (`/api/v1/products`):
     - `GET /api/v1/products` — Catalog of manufactured parts and nominal cycle times.
   - `MoldsController` & `MoldsService` (`/api/v1/molds`):
     - `GET /api/v1/molds` — Mold registry, cavity counts, and cumulative stroke tracking.
2. **DTOs & Input Validation**:
   - Strictly typed DTOs using `class-validator` (`@IsString()`, `@IsUUID()`, `@IsNumber()`, `@Min()`).

### Stage 7: Audit Logging Service & Test Verification

_Objective: Record audit trails for administrative actions and verify the entire Phase 1 test suite._

1. **`AuditService` (`backend/src/modules/audit/`)**:
   - Records mutations to `audit_logs` table (user ID, action name, entity type, entity ID, pre/post JSON).
2. **Unit & Integration Test Suite (`backend/test/` & `src/**/*.spec.ts`)**:
   - Unit tests: `AuthService.spec.ts`, `MachinesService.spec.ts`, `RolesGuard.spec.ts`.
   - E2E tests: `auth.e2e-spec.ts` (login, invalid password, token verification), `master-data.e2e-spec.ts` (role authorization checks).

---

## 3. Observable Completion Criteria (Phase 1 Definition of Done)

Phase 1 is complete and verified when:

1. [ ] Docker Compose starts Microsoft SQL Server 2022 and reports healthy status.
2. [ ] Prisma migrations apply cleanly to `MES_DB` with zero errors.
3. [ ] Database seeder successfully inserts 9 canonical roles, 1 default admin, Plant 01, 4 areas, 10 virtual machines (`IMM-01` to `IMM-10`), products, and molds.
4. [ ] `POST /api/v1/auth/login` returns a signed JWT token for valid credentials and HTTP 401 for invalid credentials.
5. [ ] Authenticated requests with `Operator` role attempting to mutate master data are blocked with HTTP 403 Forbidden.
6. [ ] `GET /api/v1/machines` returns all 10 virtual machines with area relationships.
7. [ ] Unit and E2E test suites pass with 100% success rate via `pnpm test`.
8. [ ] Static analysis passes with 0 warnings/errors via `pnpm lint`.
9. [ ] Monorepo build passes via `pnpm build`.

---

## 4. Next Step Transition (Phase 2 Preview)

Upon validation of Phase 1:

- **Proceed to Workflow 002: Multi-Machine Simulator & Telemetry Ingestion Engine**.
- Connect the 10 virtual machines to the deterministic simulator with baseline steady-state flow (8 machines), triggerable slow-cycle scenario (1 machine), and triggerable fault scenario (1 machine).
