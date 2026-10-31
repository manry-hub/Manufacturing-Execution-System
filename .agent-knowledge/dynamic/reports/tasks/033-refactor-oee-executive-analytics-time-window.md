# 033 — Audit and refactor OEE executive analytics to custom start/end time window without select view

Date: 2026-10-31

## Checklist

- [x] Audit ISO 22400-2 OEE Executive Analytics calculation logic for mathematical correctness and time conservation.
- [x] Fix temporal leakage by clipping machine time segments and live open elapsed durations to exact `[startTime, endTime]` boundaries.
- [x] Eliminate multi-product cycle time distortion by calculating weighted theoretical operating time across all production runs.
- [x] Remove the "Select View" dropdown from `OeeExecutiveFilterBar.tsx` and make `startTime` and `endTime` the primary temporal filter.
- [x] Dynamically compute historical trend series across 7 equal intervals within the user-specified start/end range.
- [x] Verify backend unit tests and frontend production build pass with zero errors.

## Change Description

Audited the OEE Executive Analytics implementation against ISO 22400-2 and the MES OEE calculation specification. Identified and resolved four mathematical and data retrieval issues:
1. Replaced boundary-excluding filters (`gte startTime, lte endTime`) with overlapping segment queries (`startTime < endTime, endTime > startTime`) and clipped durations to `[startTime, endTime]` to enforce the Zero Temporal Leakage axiom.
2. Replaced simple arithmetic mean standard cycle times with run-level weighted theoretical operating time (`sum(parts * cycleTime)`), ensuring accurate Performance calculation across mixed product runs.
3. Removed the "Select View" dropdown (`SHIFT`, `DAY`, `WEEK`) from the filter bar and frontend state, basing all analytics strictly on custom `Start Time` and `End Time` inputs.
4. Updated the trend-over-time calculation to partition the custom start/end window into 7 proportional buckets with real aggregated segments and dynamic time labels.

## Modified Files

- `backend/src/modules/oee/oee.service.ts` — refactored `getExecutiveAnalytics` for boundary clipping, weighted theoretical time, and dynamic 7-bucket trend over start/end range.
- `backend/src/modules/oee/oee.controller.ts` — prioritized `startDate` and `endDate` query parameters in `GET /api/v1/oee/executive`.
- `frontend/src/types/oee.ts` — made `window` parameter optional in `ExecutiveOeeFilterParams` and response metadata.
- `frontend/src/components/oee/OeeExecutiveFilterBar.tsx` — removed "Select View" dropdown and aligned filter bar to a responsive 5-column grid.
- `frontend/src/components/oee/OeeAnalyticsView.tsx` — initialized default filter to an 8-hour window with `startDate` and `endDate`, and dynamically derived window type for subordinate charts.

## Review

- Result: Completed audit, mathematical refactoring, and UI simplification to custom start/end times.
- Verification:
  - `pnpm --filter backend test`: All 32 test suites passed (183 tests).
  - `pnpm --filter frontend build`: TypeScript compilation and Vite bundle succeeded without errors.
- Follow-up: None

## UAT (User Acceptance Test) Verification

| # | Test | Result |
| --- | --- | --- |
| 1 | `OeeService.getExecutiveAnalytics` unit tests passing with ISO 22400-2 metrics and target filtering | Pass |
| 2 | Backend unit test suite (32 files, 183 tests) | Pass |
| 3 | Frontend TypeScript build and production bundling (`vite build`) | Pass |
| 4 | OEE Executive Filter Bar rendered with Area, Unit, Start Time, End Time, and Update action without Select View | Pass |
