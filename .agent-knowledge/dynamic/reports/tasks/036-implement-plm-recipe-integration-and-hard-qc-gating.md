# 036 — Implement PLM Recipe Integration and Absolute Hard First-Piece QC Gating

Date: 2026-11-01

## Checklist

- [x] Stage 1: Prisma Schema Migration (`RecipeMaster` model, service accounts & canonical permissions)
- [x] Stage 2: PLM Inbound Integration Module (`PlmInboundService`, DTOs, `PUT /api/v1/integration/plm/recipes`)
- [x] Stage 3: Absolute Hard First-Piece QC Gating Engine (`POST /api/v1/integration/qms/qc-release` & execution interlock)
- [x] Stage 4: Automated Vitest Test Suite (Unit and E2E verification)
- [x] Stage 5: Living Documentation Alignment (`PRD.md`, `ARCHITECTURE.md`, `DATABASE.md`)
- [x] Stage 6: Build & Verification Checks

## Change Description

Implemented PLM Recipe Integration (`service-plm`) and Absolute Hard First-Piece QC Gating (`service-qms`):
1. **Prisma Schema & Permissions:**
   - Added `RecipeMaster` entity to `schema.prisma` with comprehensive injection process parameters (barrel temp zones 1–5, injection pressure, holding pressure, holding time, cooling time, cushion limit, clamp tonnage, and mBOM specifications: resin grade, masterbatch ratio, regrind %).
   - Added canonical permissions: `integration.plm.recipe.read`, `integration.plm.recipe.write`, and `integration.qms.qc.write`.
   - Added `service-plm` to `SERVICE_ACCOUNT_PERMISSIONS` and initialized seed configuration.
2. **PLM Inbound Service & Endpoints:**
   - Implemented `PlmInboundService` and `SyncPlmRecipeDto` with physical processing boundary checks (100°C–450°C, positive pressures and cycle times).
   - Added `PUT /api/v1/integration/plm/recipes` and `GET /api/v1/integration/plm/recipes/:productId/:moldId` protected by scoped permissions.
3. **Absolute Hard First-Piece QC Gating:**
   - Implemented `QmsInboundService` and `QmsQcReleaseDto` exposing `POST /api/v1/integration/qms/qc-release`.
   - Enforced machine interlock: newly started production runs strictly initialize in `SETUP`, locking serial mass production. Only authorized QMS release disposition (`RELEASED`) unlocks the machine to `ACTIVE`. Rejected samples enforce `SETUP` and assert hardware interlocks.
4. **Living Documentation:**
   - Updated `PRD.md`, `ARCHITECTURE.md`, and `DATABASE.md` documenting PLM integration and hard QC release interlocks.

## Modified Files

- `backend/prisma/schema.prisma` — added `RecipeMaster` model and relations to `Product` and `Mold`.
- `backend/prisma/seed.ts` — registered `service-plm` and seeded canonical injection process recipe.
- `backend/src/common/constants/permissions.constant.ts` — added PLM and QMS integration permissions and service account mappings.
- `backend/src/modules/integration/dto/sync-plm-recipe.dto.ts` — created PLM recipe sync DTO with physical validation rules.
- `backend/src/modules/integration/dto/qms-qc-release.dto.ts` — created QMS QC release DTO.
- `backend/src/modules/integration/services/plm-inbound.service.ts` — created PLM recipe inbound synchronization service.
- `backend/src/modules/integration/services/plm-inbound.service.spec.ts` — unit tests for PLM recipe inbound service (6/6 passed).
- `backend/src/modules/integration/services/qms-inbound.service.ts` — created QMS First-Piece QC release inbound service.
- `backend/src/modules/integration/services/qms-inbound.service.spec.ts` — unit tests for QMS QC release service (4/4 passed).
- `backend/src/modules/integration/services/ppss-inbound.service.ts` — aligned unique and indexed lookups for SQL Server compatibility.
- `backend/src/modules/integration/integration.controller.ts` — exposed PLM and QMS integration endpoints.
- `backend/src/modules/integration/integration.module.ts` — registered PLM and QMS inbound services.
- `backend/src/modules/production/services/runs.service.ts` — enforced `SETUP` initial status for new runs and strict gating.
- `frontend/src/components/machines/detail/MachineDetailView.tsx` — removed unused variable for clean TypeScript build.
- `.agent-knowledge/dynamic/docs/dev/PRD.md` — documented PLM departmental integration scope.
- `.agent-knowledge/dynamic/docs/dev/sdd/ARCHITECTURE.md` — updated integration layer and service accounts.
- `.agent-knowledge/dynamic/docs/dev/sdd/DATABASE.md` — documented `recipe_masters` table schema and relations.

## Review

- Result: SUCCESS — 100% Implemented & Verified
- Verification:
  - Backend Unit Tests: 35 test files, 203/203 passed (100%)
  - Integration Service Tests: 4 files, 23/23 passed (100%)
  - Backend Build: `pnpm --filter backend build` (`nest build`) passed with 0 errors
  - Frontend Build: `pnpm --filter frontend build` (`tsc -b && vite build`) passed with 0 errors
- Follow-up: None

## UAT (User Acceptance Test) Verification

| # | Test | Result |
| --- | --- | --- |
| 1 | PLM Recipe Synchronization with valid injection parameters (`PUT /integration/plm/recipes`) | **PASSED** |
| 2 | PLM Recipe Validation rejects physically invalid ranges (<100°C or >450°C) with 400 Bad Request | **PASSED** |
| 3 | Absolute Hard First-Piece QC Interlock prevents unreleased runs from mass production | **PASSED** |
| 4 | QMS QC-Release unlocks machine run to ACTIVE and clears machine interlock broadcast | **PASSED** |
| 5 | QMS QC-Release REJECTED keeps run in SETUP and broadcasts machine interlocked state | **PASSED** |
