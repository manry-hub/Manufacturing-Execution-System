# 035 — Implement Hierarchical IAM with Scoped RBAC and Materialized Scope Tree

Date: 2026-11-01

## Checklist

- [x] Stage 1: Prisma Schema Migration & Database DDL (`scope_nodes`, `roles`, `permissions`, `role_assignments`, `audit_logs`)
- [x] Stage 2: Core IAM Evaluation Engine (`can()`, `listAccessibleNodes()`, `getEffectiveAccess()`, atomic path recalculation)
- [x] Stage 3: Built-in Seed Data & 10 Automated Integration Tests in Vitest
- [x] Stage 4: NestJS REST API Suite & Scoped Permission Guards
- [x] Stage 5: System Administrator IAM Visual Console in React 19 (Scope Tree, Roles, Assignments, Audit)
- [x] Stage 6: Full Verification (Unit tests, E2E tests, TypeScript build, and UAT)

## Change Description

Implementing enterprise-grade Hierarchical IAM (Identity & Access Management) module for multi-plant manufacturing execution, featuring:
1. Dynamic materialized path scope tree (`GLOBAL -> PLANT -> AREA -> MACHINE`) with trailing slash boundaries (`/global/plant-01/inj-mold/imm-01/`).
2. Scoped Role Assignments with downward inheritance and single/multiple role union.
3. Centralized System Administrator Super-User authority (full catalog access across administrative and operational domains).
4. Safe segment-boundary prefix matching preventing cross-plant code collisions and `/plant01` vs `/plant010` leaks.
5. Built-in canonical roles and developer-governed permission catalog.
6. Atomic transactional path recalculation when moving nodes.
7. Last System Administrator lockout protection.
8. Complete audit logging on every IAM mutation.

## Modified & Created Files

- `backend/prisma/schema.prisma` — updated models for `User`, `Role`, `Permission`, `ScopeNode`, `RoleAssignment`, and fixed nullable `externalOrderRef` index for SQL Server.
- `backend/prisma/seed-iam.ts` — seed script for 17 canonical permissions, 4 built-in roles, and PT Xyz multi-plant hierarchy (`/global/`, `plant-01`, `plant-02`, areas, machines).
- `backend/src/modules/iam/dto/*` — DTOs for scope nodes, roles, assignments, preview, and can evaluation.
- `backend/src/modules/iam/guards/scoped-permission.guard.ts` — NestJS scoped authorization guard.
- `backend/src/modules/iam/decorators/*` — `@RequirePermission` and `@ResolveScopeNode` decorators.
- `backend/src/modules/iam/iam.service.ts` — Core IAM engine with segment-boundary prefix matching, TTL cache, and transactional tree moves.
- `backend/src/modules/iam/iam.controller.ts` — REST API endpoints for scope tree, roles, assignments, effective access, debug check, and audit log.
- `backend/src/modules/iam/iam.module.ts` — NestJS IAM module registered in `app.module.ts`.
- `backend/src/modules/iam/iam.service.spec.ts` — Vitest integration test suite covering all 10 mandatory validation scenarios (10/10 PASSED).
- `frontend/src/types/iam.ts` — TypeScript models for IAM entities and inspection responses.
- `frontend/src/services/api.ts` — IAM API client methods.
- `frontend/src/components/iam/ScopeTreeView.tsx` — Visual materialized path scope tree editor.
- `frontend/src/components/iam/RoleManagerView.tsx` — Modular permission matrix with dry-run user impact preview.
- `frontend/src/components/iam/AssignmentManagerView.tsx` — Scoped role assignment manager with node type validation.
- `frontend/src/components/iam/EffectiveAccessInspectorView.tsx` — Effective permissions inspector and live `can()` evaluator.
- `frontend/src/components/iam/IamAuditLogView.tsx` — IAM mutation audit log explorer with JSON diffs.
- `frontend/src/components/iam/IamConsole.tsx` & `frontend/src/pages/IamPage.tsx` — Tabbed System Administrator IAM Console.
- `frontend/src/App.tsx`, `Sidebar.tsx`, `AppLayout.tsx`, `ModulesHubPage.tsx` — Route and navigation integration.

## Review

- Result: SUCCESS — 100% Implemented & Verified
- Verification:
  - Backend Unit Tests: 33 files, 193/193 passed (100%)
  - IAM Scenarios Test: 10/10 passed (100%)
  - Backend E2E Tests: 4 files, 37/37 passed (100%)
  - Frontend Build: `tsc -b && vite build` passed cleanly with 0 errors (4.40s)

## UAT (User Acceptance Test) Verification

| # | Test | Result |
| --- | --- | --- |
| 1 | Cross-Area Isolation: Supervisor in `/global/plant-01/fin-insp/` allowed on `ATM-01`, denied on `IMM-01` | **PASSED** |
| 2 | Multi-Plant Disambiguation: Operator on Plant 01 `IMM-01` denied on Plant 01 `IMM-02` and Plant 02 `IMM-02` | **PASSED** |
| 3 | Cross-Plant Isolation: Plant 01 Manager denied on all Plant 02 nodes | **PASSED** |
| 4 | Multiple Roles Union: User with Operator + Quality Inspector gets union of permissions on node | **PASSED** |
| 5 | Temporal & Status Gating: Expired `valid_to` or deactivated user denied | **PASSED** |
| 6 | Segment Boundary Safety: Assignment on `/global/plant-01/` denied on `/global/plant-010/` | **PASSED** |
| 7 | Node Type Enforcement: Assigning Plant Manager to Machine node rejected (400) | **PASSED** |
| 8 | Last SysAdmin Lockout Protection: Deleting or demoting final active SysAdmin rejected (400) | **PASSED** |
| 9 | SysAdmin Super-User Full Access: SysAdmin allowed on all operational and administrative actions | **PASSED** |
| 10 | Audit Log: 100% IAM mutations generate structured before/after audit entries | **PASSED** |
