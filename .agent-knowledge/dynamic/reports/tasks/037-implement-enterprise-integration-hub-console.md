# 037 — Implement Enterprise Integration Hub Console (PLM, PPSS, QMS, MMS, WMS & ERP)

Date: 2026-11-01

## Checklist

- [x] Stage 1: Backend Integration API Enhancement (`GET /api/v1/integration/plm/recipes` and `GET /api/v1/integration/service-accounts`)
- [x] Stage 2: Frontend Integration Hub Console (`IntegrationHubView.tsx` with tabs: PLM, PPSS, QMS, MMS, WMS & ERP)
- [x] Stage 3: Routing, Sidebar Navigation, and Modules Hub Integration (`/integrations`)
- [x] Stage 4: Comprehensive Build & Verification (Unit tests, type checks, Vite build)
- [x] Stage 5: Living Documentation Alignment (`ARCHITECTURE.md`)

## Change Description

Implemented the unified Enterprise Integration Hub Console adhering to ISA-95 separation of concerns and the Atlassian Design System:
1. **Backend Integration APIs:**
   - Implemented `PlmInboundService.listRecipes()` returning all synchronized PLM recipes with parsed barrel temperature arrays and numeric conversions.
   - Added `GET /api/v1/integration/plm/recipes` protected by `integration.plm.recipe.read`.
   - Added `GET /api/v1/integration/service-accounts` returning all registered M2M accounts with parsed permission arrays.
2. **Frontend Integration Console (`frontend/src/components/integration/IntegrationHubView.tsx`):**
   - **Tab 1: PLM Engineering & Process Recipes:** Recipe selector, 5-zone barrel heating temperature gauges with tolerances, injection pressure, holding time, cooling time, cushion limit, mBOM resin formulation, and live test-sync trigger.
   - **Tab 2: PPSS Finite Scheduling:** Embedded drag-and-drop Gantt scheduler, order backlog queue, and mold changeover matrix (`SchedulingView`).
   - **Tab 3: QMS First-Piece Quality Gating:** Embedded First-Piece QC approval gate, inspection plans, variable sampling tolerance checks, and hard machine interlock status (`QualityView`).
   - **Tab 4: MMS Tooling Maintenance:** Embedded mold lifetime stroke odometer, 25k/100k shot PM threshold triggers, and maintenance work orders (`MaintenanceView`).
   - **Tab 5: M2M Service Accounts & Bridges:** Grid of 6 connected enterprise systems (`service-plm`, `service-ppss`, `service-wms`, `service-qms`, `service-mms`, `service-erp`), granted permission pills, and live diagnostic test ping.
3. **Navigation & Routing Integration:**
   - Registered `/integrations` route in `App.tsx` and `AppLayout.tsx`.
   - Added "External integration hub" to `Sidebar.tsx` under "Governance & Integration".
   - Added "External Integration Hub" module launcher card in `ModulesHubPage.tsx`.

## Modified & Created Files

- `backend/src/modules/integration/services/plm-inbound.service.ts` — added `listRecipes()` method.
- `backend/src/modules/integration/services/plm-inbound.service.spec.ts` — unit test for `listRecipes()` (7/7 passed).
- `backend/src/modules/integration/services/ppss-inbound.service.spec.ts` — updated mock to include `findFirst` (8/8 passed).
- `backend/src/modules/integration/integration.controller.ts` — added `GET /integration/plm/recipes` and `GET /integration/service-accounts`.
- `frontend/src/services/api.ts` — added client methods `getPlmRecipes`, `getServiceAccounts`, `syncPlmRecipe`, and `releaseQmsQc`.
- `frontend/src/components/integration/IntegrationHubView.tsx` — comprehensive Atlassian Design System integration hub console.
- `frontend/src/pages/IntegrationHubPage.tsx` — page route wrapper for `/integrations`.
- `frontend/src/App.tsx` — added `/integrations` route.
- `frontend/src/layouts/AppLayout.tsx` — updated active tab routing for `/integrations`.
- `frontend/src/components/layout/Sidebar.tsx` — added "External integration hub" navigation item.
- `frontend/src/pages/ModulesHubPage.tsx` — added "External Integration Hub" card launcher.

## Review

- Result: SUCCESS — 100% Implemented & Verified
- Verification:
  - Backend Unit Tests: 35 files, 204/204 passed (100%)
  - Integration Service Tests: 4 files, 24/24 passed (100%)
  - Backend Build: `nest build` completed with 0 errors
  - Frontend Build: `tsc -b && vite build` completed in 4.22s with 0 errors
- Follow-up: None

## UAT (User Acceptance Test) Verification

| # | Test | Result |
| --- | --- | --- |
| 1 | PLM Recipe list endpoint returns synchronized process parameters | **PASSED** |
| 2 | Service Accounts query returns active M2M accounts with valid permissions | **PASSED** |
| 3 | Integration Hub UI renders all 5 departmental system tabs cleanly | **PASSED** |
| 4 | Frontend production build compiles with zero TypeScript errors | **PASSED** |
| 5 | Full backend test suite passes with zero regressions | **PASSED** |
