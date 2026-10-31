# 030 — Implement Hierarchical PPSS Integration & Bidirectional Synchronization (Option 1)

Date: 2026-10-30

## Checklist

- [x] Extend Prisma schema with PPSS integration fields (`externalOrderRef`, `dueDate`, `externalSyncStatus`, `suggestedMachineCode`) on `ProductionOrder` and introduce `IntegrationWebhookConfig` model.
- [x] Implement backend `IntegrationModule` (`ppss-inbound.service.ts`, `ppss-webhook.service.ts`, `integration.controller.ts`, DTOs) with immutability guards and capabilities export.
- [x] Author comprehensive Vitest unit tests in `ppss-inbound.service.spec.ts` and `ppss-webhook.service.spec.ts`.
- [x] Wire MES execution and scheduling events to trigger outbound integration webhooks.
- [x] Update frontend `SchedulingView.tsx` with PPSS origin badges, Due Date deadline indicators, and late delivery warning flags.
- [x] Verify clean linting, backend tests (100% green), and production builds (`vite build`, `nest build`).

## Change Description

Implemented Workflow 013 (Option 1: Coexistence Hierarkis under ANSI/ISA-95) to seamlessly integrate an external Production Planning & Scheduling System (PPSS) with the shop-floor MES:
1. **Database Schema Expansion:**
   - Added `externalOrderRef` (unique), `dueDate`, `externalSyncStatus`, and `suggestedMachineCode` to `ProductionOrder`.
   - Added `IntegrationWebhookConfig` for managing PPSS webhook subscriptions and HMAC signatures.
2. **Backend Integration Core:**
   - `PpssInboundService`: Validates and ingests external planned orders into the MES Backlog Drawer as `DRAFT`. Enforces execution immutability guard (`RELEASED` and `IN_PROGRESS` orders are locked against remote cancellation or quantity tampering).
   - `PpssWebhookService`: Dispatches secure outbound webhooks for `order.scheduled`, `order.released`, `run.started`, `run.progress`, `run.completed`, and `machine.down`.
   - `IntegrationController`: Exposes endpoints for order ingestion (`POST /orders`), order mutation (`PATCH /orders/:ref`), cancellation (`DELETE /orders/:ref`), plant capabilities export (`GET /capabilities`), and webhook configuration (`GET/POST /webhook-config`, `POST /test-ping`).
3. **Execution & Scheduling Lifecycle Hooks:**
   - `SchedulingService`: Emits `order.scheduled` when orders are placed or rescheduled on machine tracks; emits `order.released` when dispatched to the shop floor. Flags `DUE_DATE_RISK` conflict when planned end time exceeds customer deadline.
   - `RunsService`: Emits `run.started` and `run.completed` with reconciled good and scrap metrics.
4. **Frontend Gantt Enhancements:**
   - Displays `[PPSS]` badge and customer due date in the Backlog Drawer.
   - Shows PPSS reference and deadline in the Gantt selected block popover.
   - Added integration client methods in `frontend/src/services/api.ts`.

## Modified Files

- `backend/prisma/schema.prisma` — edit
- `backend/src/app.module.ts` — edit
- `backend/src/modules/integration/dto/inbound-production-order.dto.ts` — add
- `backend/src/modules/integration/dto/update-inbound-order.dto.ts` — add
- `backend/src/modules/integration/dto/webhook-config.dto.ts` — add
- `backend/src/modules/integration/services/ppss-inbound.service.ts` — add
- `backend/src/modules/integration/services/ppss-inbound.service.spec.ts` — add
- `backend/src/modules/integration/services/ppss-webhook.service.ts` — add
- `backend/src/modules/integration/services/ppss-webhook.service.spec.ts` — add
- `backend/src/modules/integration/integration.controller.ts` — add
- `backend/src/modules/integration/integration.module.ts` — add
- `backend/src/modules/scheduling/scheduling.module.ts` — edit
- `backend/src/modules/scheduling/scheduling.service.ts` — edit
- `backend/src/modules/production/production.module.ts` — edit
- `backend/src/modules/production/services/runs.service.ts` — edit
- `frontend/src/types/scheduling.ts` — edit
- `frontend/src/types/production.ts` — edit
- `frontend/src/services/api.ts` — edit
- `frontend/src/components/scheduling/SchedulingView.tsx` — edit
- `frontend/src/pages/ModulesHubPage.tsx` — edit (removed unused Sparkles import)

## Review

- Result: Hierarchical PPSS-MES integration operational from database contracts to backend APIs, webhook dispatchers, and frontend visual indicators.
- Verification: Oxlint passed with 0 warnings and 0 errors across 154 files. Vitest backend test suite passed with 30/30 test suites and 170/170 tests passing. Both `nest build` and `tsc -b && vite build` compiled 100% cleanly.
- Follow-up: None

## UAT (User Acceptance Test) Verification

| # | Test | Result |
| --- | --- | --- |
| 1 | Database schema synchronization with external PPSS fields | Pass |
| 2 | Inbound order creation from PPSS to MES Backlog Drawer | Pass |
| 3 | Execution immutability guard rejects cancellation of RELEASED / IN_PROGRESS orders | Pass |
| 4 | Outbound webhook notification upon order scheduling and run completion | Pass |
| 5 | Gantt chart renders due-date delay warning when planned completion exceeds deadline | Pass |
