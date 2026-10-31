# 032 — Audit MES boundaries, revise responsibility matrix, and implement production scoped-RBAC, authentication, and security baseline

Date: 2026-10-31

## Checklist

- [x] Conduct architectural audit of the codebase against the 6 manufacturing systems (PPSS, MES, WMS, QMS, ERP, MMS).
- [x] Realign MES scope strictly to the Production department; external systems interact via dedicated Service Accounts.
- [x] Apply UI Option B: remove standalone scheduling (PPSS), quality inspection (QMS), and tooling PM (MMS) from the MES operator navigation and hub.
- [x] Update Prisma schema with canonical `Permission`, `RolePermission`, scoped `UserRoleAssignment` (`GLOBAL`, `PLANT`, `AREA`, `MACHINE`), `RefreshToken`, and `ServiceAccount`.
- [x] Implement dual-token authentication with short-lived JWT (15 min), opaque refresh token rotation, replay detection, and login rate limiting.
- [x] Implement Client Credentials service account authentication (`POST /api/v1/auth/token`) for PPSS, WMS, QMS, MMS, and ERP.
- [x] Implement `@RequirePermissions`, `@RequireScope`, `PermissionsGuard`, and `ScopeGuard` with System Administrator global full-access override.
- [x] Protect production and integration endpoints with explicit default-deny permission policies.
- [x] Update living documentation (`PRD.md`, `ARCHITECTURE.md`, `DATABASE.md`) and verify 100% test pass rate across 32 test suites (183 tests).

## Change Description

Audited the existing MES implementation, which previously conflated PPIC scheduling (PPSS), warehouse intake (WMS), quality inspection plans (QMS), and maintenance work orders (MMS) into an unbounded monolith. Realigned the architecture so that MES is solely operated by the Production department. External systems connect via dedicated Service Accounts with scoped client credentials (`service-ppss`, `service-wms`, `service-qms`, `service-mms`, `service-erp`).

Implemented the complete security architecture defined in `.reference/`:
1. **Otentikasi (`AUTHENTICATION.md`)**: Local bcrypt human login with brute-force rate-limiting and generic failure responses; 15-minute access JWTs; opaque refresh tokens with rotation and token-family replay revocation; service account client credentials flow.
2. **Otorisasi & Scoped-RBAC (`AUTHORIZATION.md`)**: 5 canonical production roles (`System Administrator`, `Production Manager`, `Production Supervisor`, `Machine Operator`, `Production Read-only Analyst`), application-owned permission catalog (33 keys), and scope hierarchy (`GLOBAL`, `PLANT`, `AREA`, `MACHINE`).
3. **Keamanan & Audit (`SECURITY.md`)**: Enforced default-deny API protection via `PermissionsGuard` and `ScopeGuard`, audit logging for all authentication and critical execution events, and protection preventing the disablement or removal of the final active System Administrator.
4. **Frontend Alignment (Option B)**: Focused the MES client UI strictly on production execution (Shop Floor Matrix, Machine Telemetry, Orders & Runs, Packaging, Traveler & CoC, Material Consumption, Digital Andon, OEE Analytics, and Governance/Audit).

## Modified Files

- `backend/prisma/schema.prisma` — added `Permission`, `RolePermission`, `RefreshToken`, `ServiceAccount`, scoped `UserRoleAssignment`, and enhanced `AuditLog`.
- `backend/prisma/seed.ts` — updated seed script with canonical permissions, production roles, scoped assignments, and 5 service accounts.
- `backend/src/common/constants/permissions.constant.ts` — added application-owned permissions catalog and default role mappings.
- `backend/src/common/enums/role.enum.ts` — updated to 5 canonical production roles.
- `backend/src/common/enums/scope-type.enum.ts` — added scope type enumeration (`GLOBAL`, `PLANT`, `AREA`, `MACHINE`).
- `backend/src/common/decorators/current-user.decorator.ts` — enhanced `CurrentUserPayload` with permissions and scoped assignments.
- `backend/src/common/decorators/permissions.decorator.ts` — added `@RequirePermissions` decorator.
- `backend/src/common/decorators/scope.decorator.ts` — added `@RequireScope` decorator.
- `backend/src/common/guards/permissions.guard.ts` — added permissions enforcement guard with System Administrator bypass.
- `backend/src/common/guards/scope.guard.ts` — added scope coverage guard.
- `backend/src/modules/auth/auth.service.ts` — implemented dual-token rotation, reuse detection, rate limiting, and client credentials.
- `backend/src/modules/auth/auth.controller.ts` — added `/auth/refresh`, `/auth/logout`, and `/auth/token` endpoints.
- `backend/src/modules/auth/dto/refresh-token.dto.ts` — added refresh token DTO.
- `backend/src/modules/auth/dto/client-credentials.dto.ts` — added client credentials DTO.
- `backend/src/modules/auth/jwt.strategy.ts` — validated permissions and scopes in JWT payload.
- `backend/src/modules/auth/services/users.service.ts` — added final active admin protection and session revocation on disable/reset.
- `backend/src/modules/production/production.controller.ts` — protected endpoints with permissions and machine scopes.
- `backend/src/modules/integration/integration.controller.ts` — protected endpoints with integration permissions.
- `backend/src/modules/audit/audit.service.ts` — enhanced audit recording with principal type, actor, scope, and status.
- `frontend/src/types/auth.ts` — aligned frontend user roles and login response with scoped assignments.
- `frontend/src/context/AuthContext.tsx` — updated demo roles to canonical production roles.
- `frontend/src/components/layout/Sidebar.tsx` — removed standalone PPSS/QMS/MMS items from sidebar navigation (Option B).
- `frontend/src/layouts/AppLayout.tsx` — streamlined active tabs for pure production execution.
- `frontend/src/pages/ModulesHubPage.tsx` — restructured module directory hub for pure production MES.
- `frontend/src/components/andon/AndonBoardView.tsx` — updated permission checks to production roles.
- `frontend/src/components/layout/AndonTopBanner.tsx` — updated permission checks to production roles.
- `frontend/src/components/production/ProductionOrdersView.tsx` — updated release permission checks to production roles.
- `.agent-knowledge/dynamic/docs/dev/PRD.md` — updated target users and system boundaries.
- `.agent-knowledge/dynamic/docs/dev/sdd/ARCHITECTURE.md` — updated system component breakdown and architecture diagram.
- `.agent-knowledge/dynamic/docs/dev/sdd/DATABASE.md` — updated schema documentation with identity and scoped-RBAC tables.

## Review

- Result: Completed full audit, responsibility boundary revision, and implementation of production scoped-RBAC, authentication, and security controls.
- Verification: 
  - `pnpm --filter backend test`: All 32 test suites passed (183 tests).
  - `pnpm --filter frontend build`: Built successfully with zero TypeScript or Vite errors.
- Follow-up: When database migrations are applied in production, run `pnpm --filter backend exec prisma db seed` to initialize canonical permissions and service credentials.

## UAT (User Acceptance Test) Verification

| # | Test | Result |
| --- | --- | --- |
| 1 | Backend unit tests covering authentication, refresh rotation, reuse detection, permissions guard, and scope guard | Pass |
| 2 | Frontend production build without TypeScript type mismatch or unused dependency errors | Pass |
| 3 | Option B UI verification: MES portal and navigation focused exclusively on Production execution | Pass |
