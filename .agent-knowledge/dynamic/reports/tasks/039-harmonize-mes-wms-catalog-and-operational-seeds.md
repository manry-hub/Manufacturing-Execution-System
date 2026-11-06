# 039 — Harmonize MES-WMS Catalog and Operational Seeds

Date: 2026-11-06

## Checklist

- [x] Align WMS operational seeder (`RealisticOperationsSeeder.php`) to stock MES-harmonized materials (`RES-PP-HOMO`, `RES-ABS-HI`, `MB-BLK-01`, `RES-PP-REGRIND`) and finished goods (`PRD-AUTO-BUMPER`, `PRD-DOOR-TRIM`, `PRD-HVAC-DUCT`).
- [x] Align material lot numbers in WMS (`LOT-PP-202610-01`, `LOT-ABS-202610-02`, `LOT-MB-202610-03`, `LOT-REG-202610-04`) and populate staging hoppers across work centers (`STG-IMM-01` through `STG-IMM-10`).
- [x] Expand WMS staging buffer topology in `WarehouseTopologySeeder.php` from 6 machines to all 10 machines (`STG-IMM-01` through `STG-IMM-10`).
- [x] Retain legacy WMS test items (`RAW-PP-INJ-503`, `RAW-ABS-HI-121`, etc.) to guarantee backward compatibility with existing WMS test suites.
- [x] Add `QA_HOLD` quality lifecycle status to MES `schema.prisma` and verify hard consumption gating in `materials.service.ts`.
- [x] Align vendor identifiers across MES and WMS (`VEND-LOTTE`, `VEND-INEOS`, `VEND-CLARIANT`, `INTERNAL-REGRIND`).
- [x] Verify NestJS backend build (`nest build`), TypeScript check, Vitest materials service tests, and PHP lint in WMS.

## Change Description

Harmonized master catalog identities, material lots, machine staging buffers, and quality hold states between the NestJS Manufacturing Execution System (MES) and Laravel Warehouse Management System (WMS) to prepare the foundational baseline for the Quality Management System (QMS):

1. **WMS Catalog & Operational Seeding (`RealisticOperationsSeeder.php`):**
   - Added catalog resolution and inventory balances for MES harmonized raw materials: `RES-PP-HOMO` (Prime PP Copolymer), `RES-ABS-HI` (High-Impact ABS), `MB-BLK-01` (Black Masterbatch), and `RES-PP-REGRIND` (In-House Regrind).
   - Added operational seed lots matching MES: `LOT-PP-202610-01` (Lotte Chemical), `LOT-ABS-202610-02` (Ineos), `LOT-MB-202610-03` (Clariant), and `LOT-REG-202610-04` (Reground from IMM-01).
   - Seeded Finished Goods packaging units: `PKG-AUTO-BUMPER-001` (`PRD-AUTO-BUMPER`), `PKG-DOOR-TRIM-001` (`PRD-DOOR-TRIM`), and `PKG-HVAC-DUCT-001` (`PRD-HVAC-DUCT`) in finished goods distribution racks (`FG-A-02-01`, `FG-A-02-02`).
   - Populated machine staging bins `STG-IMM-01`, `STG-IMM-02`, `STG-IMM-07`, and `STG-IMM-08` with harmonized active lots.
   - Retained legacy SKUs (`RAW-PP-INJ-503`, `PART-BZL-FR-LH`, etc.) to ensure zero test regressions for existing WMS feature suites.

2. **WMS Topology Alignment (`WarehouseTopologySeeder.php`):**
   - Expanded shop-floor staging buffer generation loop from 6 machines (`STG-IMM-01` to `STG-IMM-06`) to all 10 injection molding work centers (`STG-IMM-01` to `STG-IMM-10`).

3. **MES Quality Lifecycle State Gating (`schema.prisma` & `materials.service.spec.ts`):**
   - Updated `schema.prisma` `MaterialLot.status` documentation to formally include `QA_HOLD`.
   - Verified that `materials.service.ts` rejects hopper loading when lot status is `QA_HOLD` or `QUARANTINE`.
   - Added dedicated Vitest unit test in `materials.service.spec.ts` verifying that `QA_HOLD` lots throw `BadRequestException`.

## Modified Files

- `backend/prisma/schema.prisma` — edit (documented QA_HOLD status for MaterialLot)
- `backend/src/modules/materials/materials.service.spec.ts` — edit (added QA_HOLD loadHopper rejection unit test)
- `/home/ughway/Debiancode/Myprojects/Warehouse-Management-System/database/seeders/WarehouseTopologySeeder.php` — edit (expanded staging bins to 10 machines)
- `/home/ughway/Debiancode/Myprojects/Warehouse-Management-System/database/seeders/RealisticOperationsSeeder.php` — edit (stocked harmonized MES catalog, lots, and FG bins)
- `.agent-knowledge/dynamic/reports/tasks/039-harmonize-mes-wms-catalog-and-operational-seeds.md` — add (task record)

## Review

- Result: Complete parity achieved between MES and WMS catalogs, lots, and work center buffers.
- Verification:
  - `php -l` passed on all modified WMS seeders (0 syntax errors).
  - NestJS backend compiled successfully with 0 TypeScript issues (`nest build`).
  - Vitest `materials.service.spec.ts` passed 11/11 tests.
  - Frontend production build (`tsc -b && vite build`) passed with 0 compiler errors.
- Follow-up: Proceed to draft the canonical QMS PRD (`PRD.md`) following the 10 functional domains.

## UAT (User Acceptance Test) Verification

| # | Test | Result |
| --- | --- | --- |
| 1 | WMS seeder stocks harmonized materials (RES-PP-HOMO, RES-ABS-HI, MB-BLK-01, RES-PP-REGRIND) | Pass |
| 2 | WMS seeder stages harmonized lots (LOT-PP-202610-01, etc.) into STG-IMM-xx hoppers | Pass |
| 3 | WMS seeder stocks finished goods (PRD-AUTO-BUMPER, PRD-DOOR-TRIM, PRD-HVAC-DUCT) into FG bins | Pass |
| 4 | MES materials.service.ts blocks loading of QA_HOLD and QUARANTINE lots | Pass |
| 5 | MES and WMS align vendor codes (VEND-LOTTE, VEND-INEOS, VEND-CLARIANT) | Pass |
| 6 | WMS topology covers all 10 machine staging buffers (STG-IMM-01 to STG-IMM-10) | Pass |
| 7 | Existing MES backend build and materials test suites pass without regression | Pass |
