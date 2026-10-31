# 034 — Production Calendar, Shift Management, ISO 22400-2 OEE Engine Refactoring, and 30-Day Operational Seed

Date: 2026-10-31

## Checklist

- [x] Expanded database schema with `FactoryCalendarDay`, `ShiftDefinition`, and `MachineOperatingSchedule` models
- [x] Generated Prisma client and applied T-SQL DDL migration `20261031174500_add_calendar_shift_schedules` to Microsoft SQL Server (`MES_DB`)
- [x] Refactored `OeeService.getExecutiveAnalytics` to separate Total Calendar Time from Planned Production Time (PPT), Non-Scheduled Time, and Unallocated Time
- [x] Corrected theoretical operating time and cycle time calculation across multiple machines and cavity multipliers
- [x] Implemented deterministic 30-day realistic operational seed generator (`backend/prisma/seed-realistic-month.ts`) for October 1 to 31, 2026
- [x] Aligned frontend KPI ring label from `EFF` to standard ISO 22400-2 `PER` (Performance Rate)
- [x] Resolved SVG Trend Over Time chart label collisions and removed static mockup fallback dataset
- [x] Added Non-Scheduled time account row to `OeeTimeAccountsCard.tsx`
- [x] Verified full test suite (183 unit tests, 37 E2E tests) and production Vite build (0 errors)

## Change Description

Implemented the automotive operational scheduling architecture in the MES, separating employee shifts, factory calendar, and machine operating schedules. Resolved the executive analytics discrepancies (where availability collapsed to 1% and undefined hours blew up to 6,943 hours due to treating off-shift and weekend time as downtime) by adhering to SEMI E10 and ISO 22400-2 time categorization standards.

Populated the system with an authentic 30-day operational history across all 10 injection molding machines for October 1–31, 2026, delivering benchmark-grade metrics (~74.2% OEE, 86.7% Availability, 88.8% Performance, 96.4% Quality, >2.09 million parts). All Master Data, Factory Topology, Users, Roles, and Scoped RBAC permissions were 100% preserved.

## Modified Files

- `backend/prisma/schema.prisma` — Added `FactoryCalendarDay`, `ShiftDefinition`, `MachineOperatingSchedule` models and relations
- `backend/prisma/migrations/20261031174500_add_calendar_shift_schedules/migration.sql` — Applied SQL Server DDL migration
- `backend/prisma/seed.ts` — Integrated transactional execution wipe and realistic month seeder
- `backend/prisma/seed-realistic-month.ts` — Created deterministic 30-day operational dataset generator
- `backend/src/modules/oee/oee.service.ts` — Refactored ISO 22400-2 time accounts, PPT derivation, compatibility cycles, and trend aggregation
- `backend/src/modules/oee/oee.service.spec.ts` — Added mocks for schedule and compatibility queries
- `backend/src/modules/production/services/runs.service.ts` — Added `status: 'ACTIVE'` support and cycle counter updates for active runs
- `backend/test/production-oee-andon.e2e-spec.ts` — Added test isolation cleanup in `beforeAll` and async ticks for event propagation
- `frontend/src/types/oee.ts` — Added `nonScheduledSeconds` and `calendarSeconds` to `timeAccounts` interface
- `frontend/src/components/oee/OeeKpiRingsCard.tsx` — Updated center ring label from `EFF` to `PER` and supported sub-1% decimal precision
- `frontend/src/components/oee/OeeTrendOverTimeChart.tsx` — Removed static dummy dataset and fixed SVG keys to `<g key={`${d.date}-${i}`}>`
- `frontend/src/components/oee/OeeTimeAccountsCard.tsx` — Rendered hierarchical ISO 22400-2 time accounts including Non-Scheduled time
- `.agent-knowledge/dynamic/workflows/014-production-calendar-shift-schedule-and-realistic-oee-seed.md` — Updated workflow status to `COMPLETED`

## Review

- Result: Completed factory calendar, shift schedules, OEE calculation overhaul, and clean 30-day seed.
- Verification: 32/32 unit test suites (183 tests) passed; 4/4 E2E test suites (37 tests) passed; Frontend Vite build succeeded with 0 errors; API returns Availability 86.7%, Performance 88.8%, Quality 96.4%, OEE 74.2%, and 0.0h undefined time.
- Follow-up: None.

## UAT (User Acceptance Test) Verification

| # | Test | Result |
| --- | --- | --- |
| 1 | SQL Server DDL Migration for Calendar & Shift Models | Pass |
| 2 | OEE Calculation with Non-Scheduled Time Exclusion | Pass |
| 3 | 30-Day Operational Seed Generation (Oct 1–31, 2026) | Pass |
| 4 | KPI Ring Label Displayed as `PER` (Performance Rate) | Pass |
| 5 | Trend Over Time SVG Label Collisions & Dot Glitch Resolved | Pass |
| 6 | Full Backend Unit Test Suite (183 tests) | Pass |
| 7 | Full Backend E2E Test Suite (37 tests) | Pass |
| 8 | Frontend Production Vite Build | Pass |
