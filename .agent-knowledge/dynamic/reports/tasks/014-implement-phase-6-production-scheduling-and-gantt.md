# 014 — Implement Phase 6 Production Scheduling & Gantt Timeline

Date: 2026-10-28

## Checklist

- [x] Extend Prisma schema with scheduling targets on `ProductionOrder` (`assignedMachineId`, `assignedMoldId`, `plannedEndTime`, `priority`, `sequenceOrder`) and sync with MS SQL Server.
- [x] Seed realistic mold changeover pairs (`MoldChangeover`) and initial scheduled & backlog orders in `seed.ts`.
- [x] Implement backend `SchedulingModule` (`scheduling.service.ts`, `scheduling.controller.ts`, DTOs) with runtime projection, conflict audits, and changeover insertion.
- [x] Write backend unit tests in `scheduling.service.spec.ts` covering runtime calculations, changeover insertions, tonnage mismatches, and tooling collisions (16 suites, 76 tests passing).
- [x] Create frontend `SchedulingView.tsx` with interactive multi-horizon Gantt board (Shift, Day, Week), machine tracks with tonnage badges, diagonal changeover blocks, backlog drawer, and changeover matrix modal.
- [x] Integrate `SchedulingView` into Atlassian sidebar under "Execution & routing" and wire view in `App.tsx`.
- [x] Verify monorepo health with `pnpm lint` (0 warnings, 0 errors across 148 files) and `pnpm --filter frontend build` clean compilation.
- [x] Conduct live browser verification via Playwright (Gantt board rendering, backlog drawer toggle, order detail bottom sheet, changeover modal).

## Change Description

Implemented Phase 6 / Epic 10 (Production Scheduling & Mold Changeover Matrix) to provide production planners with full visibility and control over machine dispatch and mold changeovers across all 10 injection molding machines.

1. **Database Schema & Seed Expansion:**
   - Updated `ProductionOrder` model in `backend/prisma/schema.prisma` with `plannedEndTime`, `assignedMachineId`, `assignedMoldId`, `priority` (1: Urgent, 2: High, 3: Normal, 4: Low), and `sequenceOrder`.
   - Seeded pairwise `MoldChangeover` rules mapping setup and purge minutes between molds.
   - Seeded initial scheduled timeline orders on `IMM-01`, `IMM-03`, and `IMM-07` and unscheduled backlog orders (`WO-BACKLOG-001`, `002`, `003`).

2. **Backend Scheduling Core:**
   - `SchedulingService`: Calculates runtime duration $\Delta T = ((Q \times 1.02) / C) \times t_{\text{cycle}}$, dynamically generates `MOLD_CHANGEOVER` blocks between adjacent orders with different molds, and detects `TONNAGE_MISMATCH` and concurrent `TOOLING_COLLISION` conflicts.
   - `SchedulingController`: Endpoints for timeline query, backlog retrieval, order scheduling, rescheduling, unscheduling, release, and changeover matrix upsert.
   - Verified with 5 unit tests in `scheduling.service.spec.ts`.

3. **Frontend Gantt HMI:**
   - Built `SchedulingView.tsx` with Shift (8h), Day (24h), and Week (7d) horizon switches.
   - Sticky left column for machines with clamping tonnage badges (`150T`, `200T`, `350T`, `500T`) and live status dots.
   - Atlassian-styled order blocks with priority indicators and progress meters, paired with diagonal striped changeover blocks.
   - Interactive slide-over backlog drawer and Changeover Matrix modal.

## Modified Files

- `backend/prisma/schema.prisma` — edit (added scheduling fields and machine/mold relations to ProductionOrder)
- `backend/prisma/seed.ts` — edit (seeded scheduled orders, backlog orders, and changeover matrix)
- `backend/src/app.module.ts` — edit (imported SchedulingModule)
- `backend/src/modules/scheduling/dto/schedule-order.dto.ts` — add (order scheduling payload DTO)
- `backend/src/modules/scheduling/dto/reschedule-slot.dto.ts` — add (order rescheduling DTO)
- `backend/src/modules/scheduling/dto/upsert-changeover.dto.ts` — add (mold changeover rule DTO)
- `backend/src/modules/scheduling/dto/schedule-query.dto.ts` — add (timeline query params DTO)
- `backend/src/modules/scheduling/scheduling.service.ts` — add (scheduling engine, runtime calculations, and conflict guards)
- `backend/src/modules/scheduling/scheduling.controller.ts` — add (REST controller for timeline, backlog, and changeover matrix)
- `backend/src/modules/scheduling/scheduling.module.ts` — add (NestJS scheduling module)
- `backend/src/modules/scheduling/scheduling.service.spec.ts` — add (unit test suite for scheduling engine)
- `frontend/src/types/scheduling.ts` — add (scheduling TypeScript interfaces)
- `frontend/src/types/production.ts` — edit (added scheduling target fields)
- `frontend/src/types/machine.ts` — edit (added clampingTonnage field)
- `frontend/src/services/api.ts` — edit (added scheduling API client methods)
- `frontend/src/components/layout/Sidebar.tsx` — edit (added Production scheduling nav item to Execution group)
- `frontend/src/components/scheduling/SchedulingView.tsx` — add (interactive Gantt timeline board and backlog drawer)
- `frontend/src/App.tsx` — edit (registered scheduling view)

## Review

- Result: Visual Production Scheduling & Mold Changeover Matrix fully operational from database to interactive Gantt board.
- Verification: `pnpm lint` passed with 0 warnings and 0 errors across 148 files. Vitest backend test suite passed with 16/16 test suites and 76/76 unit tests. `pnpm --filter frontend build` succeeded in 2.33s. Playwright verified timeline rendering, backlog drawer, order action popover, and changeover modal.
- Follow-up: None

## UAT (User Acceptance Test) Verification

| # | Test | Result |
| --- | --- | --- |
| 1 | Database schema synchronization and seeding of changeover matrix and scheduled orders | Pass |
| 2 | Backend calculation of planned runtime duration and automatic mold changeover insertion | Pass |
| 3 | Tonnage mismatch and concurrent tooling collision conflict detection | Pass |
| 4 | Timeline Gantt rendering across Shift (8h), Day (24h), and Week (7d) horizons | Pass |
| 5 | Unscheduled backlog drawer slide-over with "Schedule onto machine" action | Pass |
| 6 | Order detail selection and "Release to shop floor" action | Pass |
| 7 | Mold changeover transition matrix modal display and pairwise rule configuration | Pass |
