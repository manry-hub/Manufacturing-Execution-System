# Implementation Workflow 014: Production Calendar, Shift Management, Machine Operating Schedule, and 30-Day Realistic Operational Seed

> **Status:** `COMPLETED`  
> **Target Outcome:** Complete operational time management architecture (Factory Calendar + Shift Management + Machine Operating Schedule), ISO 22400-2 OEE engine refactoring with true Non-Scheduled Time handling, and a realistic 30-day deterministic operational database seed yielding benchmark-grade OEE analytics (~75% OEE, 86% AVA, 90% PER, 97% QUA).  
> **Owner:** MES Core Team & Architecture  
> **References:**
>
> - `docs/notes/MES-OEE-CALCULATION-SPEC.md` — ISO 22400-2 & SEMI E10 mathematical formulations
> - `.agent-knowledge/dynamic/docs/dev/sdd/ARCHITECTURE.md` — ISA-95 system boundaries (PPSS vs MES vs WMS vs QMS vs MMS vs ERP)
> - `.agent-knowledge/dynamic/workflows/013-ppss-external-integration-hierarchical-scheduling.md` — PPSS production orders & schedule integration
> - User Operational Guide on Automotive Manufacturing MES Time Concepts & Shift Management (October 31, 2026)

---

## 1. Objective and Scope

### Objective

Deliver a comprehensive refactoring of production time management and OEE calculations in the MES, separating employee shifts, production schedules, and machine operating schedules. Populate the system with a complete 30-day realistic operational seed (October 1 to October 31, 2026) across 10 Injection Molding Machines (IMM-01 to IMM-10), demonstrating authentic automotive factory execution with benchmark-grade KPI analytics.

### In Scope

1. **Database Schema Expansion (`schema.prisma` & SQL Server DDL)**:
   - `FactoryCalendarDay`: Models working days, weekends, plant holidays, and shutdown periods.
   - `ShiftDefinition`: Models 3 standard daily production shifts (Shift 1: 07:00–15:00, Shift 2: 15:00–23:00, Shift 3: 23:00–07:00) with scheduled meal/rest breaks (e.g. 60 min).
   - `MachineOperatingSchedule`: Models individual machine planned operating windows per shift, dissociating machine schedule from calendar time.
2. **ISO 22400-2 OEE Engine Refactoring (`oee.service.ts` & `oee-calculator.ts`)**:
   - Calculate Planned Production Time (PPT) strictly from `MachineOperatingSchedule` minus scheduled breaks.
   - Categorize unallocated off-shift time as **Non-Scheduled Time** (excluded from PPT), eliminating the artificial collapse of Availability to 1% over multi-week evaluation windows.
   - Aggregate parts produced from verified `ProductionRun` records and raw telemetry `CYCLE_COMPLETED` events.
   - Attribute downtime during scheduled production strictly to Availability Loss (Breakdown, Changeover, Material Shortage).
3. **Deterministic 30-Day Realistic Operational Seed Generator**:
   - Safely clear transactional execution tables (runs, time segments, event logs, andon tickets, quality checks, packaging units, scrap logs) while strictly preserving Master Data, Factory Topology, Users, Roles, and Scoped RBAC permissions.
   - Generate realistic 30-day history (Oct 1 – Oct 31, 2026) across 10 machines:
     - ~8,000 to ~12,000 parts per day plant-wide.
     - Scheduled changeovers, occasional tooling breakdowns with Andon tickets, MTTR/MTBF logs.
     - True-to-life OEE metrics: Availability ~84–88%, Performance ~88–92%, Quality ~96–98%, overall OEE ~74–80%.
4. **Executive Dashboard Alignment & Visual Bug Fixes**:
   - `OeeKpiRingsCard.tsx`: Correct center ring label from `EFF` to standard ISO 22400-2 `PER` (Performance Rate).
   - `OeeTimeAccountsCard.tsx`: Display hierarchical time loss model: Calendar Time (24h) $\rightarrow$ Non-Scheduled Time $\rightarrow$ Planned Production Time $\rightarrow$ Operating Time $\rightarrow$ Downtime Loss.
   - `OeeTrendOverTimeChart.tsx`: Remove static fallback mockup data, fix SVG keying to prevent label collisions, and eliminate stray disconnected markers.

### Out of Scope

- Modifying external ERP/PPSS core databases (PPSS remains the operational master for master scheduling; MES models the received calendar and shift contracts).
- Adding complex manual overtime request approval workflows (overtime is modeled directly via schedule extensions).

### Assumptions and Open Questions

- **Tooling Cavity Multiplier:** For machine cycles monitored via IoT telemetry outside of a dedicated work order run, the default cavity multiplier matches the mold currently installed on the machine (defaulting to 2 if unassigned).
- **Scheduled Break Exclusions:** In accordance with automotive manufacturing standards, scheduled meal breaks (60 min per 8h shift) are excluded from Planned Production Time.
- **Calendar Basis:** Standard 5-day manufacturing work week (Monday–Friday) with Saturday partial shifts and Sunday planned shutdowns.

---

## 2. Staged Execution Plan

### Stage 1: Schema Modeling & SQL Server DDL Migration

**Objective:** Model Factory Calendar, Shift Management, and Machine Operating Schedules in Prisma and apply physical DDL migrations to Microsoft SQL Server.

1. Add models to `backend/prisma/schema.prisma`:
   ```prisma
   model FactoryCalendarDay {
     id        String   @id @default(uuid())
     plantId   String   @map("plant_id")
     date      DateTime @db.Date
     dayType   String   @default("WORKDAY") @map("day_type") @db.VarChar(30) // WORKDAY, WEEKEND, HOLIDAY, SHUTDOWN
     notes     String?  @db.VarChar(255)
     createdAt DateTime @default(now()) @map("created_at")

     plant Plant @relation(fields: [plantId], references: [id], onDelete: Cascade)

     @@unique([plantId, date], name: "uq_plant_calendar_date")
     @@map("factory_calendar_days")
   }

   model ShiftDefinition {
     id                   String   @id @default(uuid())
     plantId              String   @map("plant_id")
     code                 String   @db.VarChar(30) // SHIFT_1, SHIFT_2, SHIFT_3
     name                 String   @db.VarChar(100)
     startTime            String   @map("start_time") @db.VarChar(10) // "07:00"
     endTime              String   @map("end_time") @db.VarChar(10)   // "15:00"
     breakDurationMinutes Int      @default(60) @map("break_duration_minutes")
     isOvernight          Boolean  @default(false) @map("is_overnight")
     isActive             Boolean  @default(true) @map("is_active")
     createdAt            DateTime @default(now()) @map("created_at")

     plant Plant @relation(fields: [plantId], references: [id], onDelete: Cascade)

     @@unique([plantId, code], name: "uq_plant_shift_code")
     @@map("shift_definitions")
   }

   model MachineOperatingSchedule {
     id                      String   @id @default(uuid())
     machineId               String   @map("machine_id")
     calendarDate            DateTime @map("calendar_date") @db.Date
     shiftCode               String   @map("shift_code") @db.VarChar(30)
     isScheduled             Boolean  @default(true) @map("is_scheduled")
     plannedOperatingMinutes Int      @default(420) @map("planned_operating_minutes") // 7h (8h - 1h break)
     notes                   String?  @db.VarChar(255)
     createdAt               DateTime @default(now()) @map("created_at")

     machine Machine @relation(fields: [machineId], references: [id], onDelete: Cascade)

     @@unique([machineId, calendarDate, shiftCode], name: "uq_machine_date_shift")
     @@map("machine_operating_schedules")
   }
   ```
2. Create DDL migration script `backend/prisma/migrations/20261031174500_add_calendar_shift_schedules/migration.sql`.
3. Apply migration to SQL Server (`MES_DB`) and run `pnpm --filter backend exec prisma generate`.

**Exit Criteria:**
- [ ] SQL Server contains `factory_calendar_days`, `shift_definitions`, and `machine_operating_schedules` tables.
- [ ] Prisma Client compiles with typed models.

---

### Stage 2: ISO 22400-2 OEE Calculation Engine Refactoring

**Objective:** Align OEE calculation with automotive manufacturing time hierarchy (Calendar Time $\rightarrow$ Non-Scheduled Time $\rightarrow$ PPT $\rightarrow$ Operating Time $\rightarrow$ Net Operating Time $\rightarrow$ Fully Productive Time).

1. Update `backend/src/modules/oee/oee.service.ts`:
   - Compute `plannedProductionTimeSeconds` from `MachineOperatingSchedule`:
     - Sum `plannedOperatingMinutes * 60` for scheduled shifts within $[T_{\text{start}}, T_{\text{end}}]$.
     - Non-Scheduled Time = $\text{Total Calendar Capacity} - \text{PPT} - \text{Scheduled Breaks}$.
   - Aggregate actual production output per machine:
     - For formal runs: extract `goodQuantity` and `rejectQuantity`.
     - For standalone/telemetry operations: aggregate `CYCLE_COMPLETED` events $\times$ mold cavity count.
   - Calculate Performance via weighted theoretical operating time:
     $$\text{Theoretical Operating Time} = \sum (\text{Parts Produced}_i \times \text{StandardCycleTime}_i)$$
     $$\text{Performance} = \frac{\text{Theoretical Operating Time}}{\text{Actual Operating Time}}$$
   - Partition `trendOverTime` into clean daily or multi-day intervals across $[T_{\text{start}}, T_{\text{end}}]$ with authentic aggregated metrics.

**Exit Criteria:**
- [ ] 30-day evaluation window correctly identifies non-scheduled days and yields realistic Availability (~84–88%).
- [ ] `oee.service.spec.ts` unit tests pass with 100% assertions.

---

### Stage 3: Deterministic 30-Day Operational Seed Generator

**Objective:** Build a robust, repeatable seeder that clears transactional clutter and seeds an authentic 30-day manufacturing history (October 1–31, 2026).

1. Develop `backend/prisma/seed-realistic-month.ts` (integrated into `seed.ts`):
   - **Data Reset (Transactional Only)**:
     - `DELETE FROM packaging_units`
     - `DELETE FROM run_material_consumptions`
     - `DELETE FROM quality_checks` / `quality_check_samples`
     - `DELETE FROM andon_tickets`
     - `DELETE FROM production_runs`
     - `DELETE FROM machine_time_segments`
     - `DELETE FROM machine_event_logs`
     - `DELETE FROM oee_results`
     - *Preserve*: `users`, `roles`, `permissions`, `plants`, `production_areas`, `machines`, `molds`, `products`, `downtime_reasons`.
   - **Calendar & Shifts**:
     - 31 days in October 2026: 22 Workdays, 8 Weekend shutdown days, 1 National holiday.
     - 3 Shifts: Shift 1 (07:00–15:00), Shift 2 (15:00–23:00), Shift 3 (23:00–07:00).
   - **Machine Operating Schedules**:
     - IMM-01 to IMM-06: 3 shifts/day on workdays (21 operating hours/day, 3 hours scheduled breaks).
     - IMM-07 & IMM-08: 2 shifts/day (14 operating hours/day).
     - IMM-09 & IMM-10: 1–2 shifts/day with maintenance allocation.
   - **Production Runs & Telemetry**:
     - Seed ~120 realistic production runs across bumper, door trim, and center console parts.
     - Generate time segments: ~85% Operating, ~7% Changeover, ~5% Unplanned Breakdown, ~3% Minor Stoppage.
     - Generate ~75,000 `CYCLE_COMPLETED` event logs.
     - Seed Andon tickets for breakdown segments with complete MTTR response/resolution timestamps.
     - Pre-calculate daily `oee_results` matching realistic operational targets:
       - Availability: $86.5\%$
       - Performance: $89.8\%$
       - Quality: $97.2\%$
       - OEE: $75.5\%$

**Exit Criteria:**
- [ ] `pnpm --filter backend exec prisma db seed` runs successfully and populates 30 days of clean manufacturing history.
- [ ] Database contains ~75k telemetry events, ~120 completed runs, and accurate time segments.

---

### Stage 4: Frontend Alignment & Visual Bug Fixes

**Objective:** Eliminate UI glitches in the Executive Dashboard, align KPI labels to ISO 22400-2, and render clear time categorization.

1. `frontend/src/components/oee/OeeKpiRingsCard.tsx`:
   - Replace label `EFF` with `PER` (Performance Rate).
   - Format sub-1% decimal precision (e.g. `0.2%` instead of `0%`).
2. `frontend/src/components/oee/OeeTimeAccountsCard.tsx`:
   - Clarify time accounts:
     - **Active (Run Time)**
     - **Downtime (Unplanned)**
     - **Setup (Changeover)**
     - **Scheduled Breaks**
     - **Non-Scheduled Time** (Holidays / Off-shift)
     - **Total Calendar Time**
3. `frontend/src/components/oee/OeeTrendOverTimeChart.tsx`:
   - Remove static fallback dataset (`10/24`–`10/30`).
   - Use composite keys `<g key={`${d.date}-${i}`}>` to eliminate label collisions on X-axis.
   - Ensure circle points and SVG paths share identical coordinate mappings to eliminate stray/disconnected markers.
4. `frontend/src/components/oee/OeeExecutiveFilterBar.tsx`:
   - Verify clean 5-column layout: Area, Machine, Start Time, End Time, Update.

**Exit Criteria:**
- [ ] `pnpm --filter frontend build` completes with 0 errors.
- [ ] Executive Analytics UI displays `PER` ring, non-colliding date labels, and true-to-life metrics.

---

### Stage 5: Verification & End-to-End Validation

**Objective:** Validate math, database integrity, and UI rendering across all test suites.

1. Execute backend unit test suites: `pnpm --filter backend test`.
2. Execute E2E test suites: `pnpm --filter backend test:e2e`.
3. Validate API query for October 1–30, 2026:
   - Output parts $\ge 50,000$.
   - Availability $\ge 80\%$.
   - Performance $\ge 85\%$.
   - Quality $\ge 95\%$.
   - Overall OEE $\ge 70\%$.
   - Zero overlapping text in trend chart.

**Exit Criteria:**
- [ ] 100% test pass rate across unit and E2E suites.
- [ ] Verified operational dashboard reflecting 1 full month of realistic automotive manufacturing.

---

## 3. Dependencies, Risks, and Rollback

### Dependencies

- Microsoft SQL Server (`MES_DB`) container running on port 1433.
- Prisma ORM 6.19 and NestJS backend framework.

### Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Clearing transactional tables deletes user-created demo test runs | Low | Only operational data is cleared; Master Data, factory assets, products, molds, users, and RBAC permissions are strictly preserved. |
| Generating 75k event logs slows down seeder execution | Medium | Use batch insertion (`createMany`) and transactions with chunkSize of 5,000 records. Seeder completes in $<15$ seconds. |
| Timezone offset shifts dates across month boundaries | Medium | Use strict UTC midnight (`T00:00:00.000Z`) for calendar dates and explicit ISO strings for timestamp calculations. |

### Rollback or Recovery

If seeding or migration fails:
1. Schema changes are additive and backward-compatible.
2. The foundational seed `backend/prisma/seed.ts` can be rerun at any time to restore the initial baseline.

---

## 4. Verification and Acceptance Criteria

| Check | Method | Acceptance Criteria |
| --- | --- | --- |
| Database Migration | `pnpm --filter backend exec prisma db push` | Tables `factory_calendar_days`, `shift_definitions`, `machine_operating_schedules` exist in SQL Server. |
| 30-Day Operational Seed | `pnpm --filter backend exec tsx prisma/seed.ts` | Completes successfully; populates 31 calendar days, 3 shifts, 10 machine operating schedules, and 30 days of execution data. |
| OEE Calculation Rigor | Query `GET /api/v1/oee/executive?startDate=2026-10-01T00:00:00Z&endDate=2026-10-31T23:59:59Z` | Returns Availability ~84–88%, Performance ~88–92%, Quality ~96–98%, OEE ~74–80%. Actual quantity $>50,000$ units. |
| Dashboard UI & Visuals | Browser review / Vitest frontend build | Center ring displays `PER`. Trend chart X-axis labels are cleanly spaced with 0 overlapping text and 0 stray points. |
| Automated Unit Tests | `pnpm --filter backend test` | 100% pass rate across 32 test suites. |

---

## 5. Completion and Handoff

- [ ] All staged exit criteria and acceptance criteria are met.
- [ ] Relevant living documentation (`PRD.md`, `ARCHITECTURE.md`, `DATABASE.md`) is updated.
- [ ] Task report `034` records actual implementation changes and verification results.

Next transition: Execute Stage 1 (Schema Modeling & Migration) upon user approval.
