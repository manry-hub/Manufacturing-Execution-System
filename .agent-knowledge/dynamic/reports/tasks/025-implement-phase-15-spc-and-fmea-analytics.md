# 025 — Implement Phase 15: Statistical Process Control (SPC) & FMEA Analytics Dashboard

Date: 2026-10-30

## Checklist

- [x] Create Backend Analytics Module (`backend/src/modules/analytics/`)
- [x] Implement `SpcCalculatorService` with Shewhart X-bar & R algorithms, Nelson Rules, and Cp/Cpk capabilities
- [x] Implement `FmeaAnalyticsService` with dynamic Occurrence calculation from Andon and scrap reject records
- [x] Implement `AnalyticsController` with `/analytics/spc`, `/analytics/fmea`, and `/analytics/cycle-time-distribution`
- [x] Write Vitest Unit Tests for `SpcCalculatorService` and `FmeaAnalyticsService` (133/133 tests passed)
- [x] Create Frontend Analytics View with Shewhart X-bar/R Control Charts, 2D FMEA Risk Matrix, and Cycle Time Histogram
- [x] Integrate 'analytics' tab into Sidebar navigation and `App.tsx`
- [x] Verify builds (`nest build`, `vite build`) and linter (`oxlint`) with 0 errors

## Change Description

Implemented Epic 13 (Post-MVP #7): Statistical Process Control (SPC) and Failure Mode and Effects Analysis (FMEA) Analytics Dashboard.
- **Backend Analytics Engine:**
  - `SpcCalculatorService`: ASTM/ISO 7870-compliant Shewhart $\bar{X}$-chart and $R$-chart algorithms with standard factors ($A_2, D_3, D_4, d_2$). Calculates $C_p$ and $C_{pk}$ capability indices against specification limits. Evaluates Nelson Out-of-Control Rules 1–4 (beyond $3\sigma$, run of 9 on same side, trend of 6, alternating 14).
  - `FmeaAnalyticsService`: AIAG & VDA aligned Failure Mode and Effects Analysis engine for Plastic Injection Molding Machines. Dynamically calculates Occurrence ($O$) scale (1-10) weighted by live MES `AndonTicket` incident categories and production scrap reject logs, generating real-time Risk Priority Numbers ($RPN = S \times O \times D$) and 10x10 Severity vs Occurrence matrix heatmaps.
  - Cycle time distribution histogram service calculating Gaussian normal curve overlays and tolerance boundaries ($\pm 5\%$).
  - `AnalyticsController` protected by `JwtAuthGuard`.
- **Frontend Interactive Analytics:**
  - `AnalyticsView.tsx`: Tabbed dashboard with machine selector (`IMM-01` to `IMM-10`), parameter selector, subgroup size slider ($n=3,4,5,8$), and sample horizon controls.
  - `SpcControlChartView.tsx`: High-precision interactive SVG Shewhart $\bar{X}$-chart with UCL, LCL, Center Line, USL, LSL tolerance bands, and out-of-control point highlighting; Subgroup Range ($R$) chart; Process Capability ($C_p, C_{pk}$) KPI scorecards.
  - `FmeaRiskView.tsx`: Interactive 2D Risk Matrix Heatmap (Severity vs Occurrence), RPN summary badges, Pareto ranking table with risk level filtering (`ALL`, `HIGH`, `MEDIUM`, `LOW`), and detail panel for engineering countermeasures.
  - `CycleTimeDistributionView.tsx`: Frequency distribution histogram with Gaussian bell curve overlay, nominal target line, and jitter standard deviation metrics.
  - Added "SPC & FMEA analytics" navigation item to Atlassian sidebar under "Performance & Engineering" group.

## Modified Files

- `backend/src/app.module.ts` — edit (registered AnalyticsModule)
- `backend/src/modules/analytics/dto/analytics.dto.ts` — add
- `backend/src/modules/analytics/services/spc-calculator.service.ts` — add
- `backend/src/modules/analytics/services/spc-calculator.service.spec.ts` — add
- `backend/src/modules/analytics/services/fmea-analytics.service.ts` — add
- `backend/src/modules/analytics/services/fmea-analytics.service.spec.ts` — add
- `backend/src/modules/analytics/analytics.controller.ts` — add
- `backend/src/modules/analytics/analytics.module.ts` — add
- `frontend/src/types/analytics.ts` — add
- `frontend/src/services/api.ts` — edit (added `getSpcData`, `getFmeaData`, `getCycleTimeDistribution`)
- `frontend/src/components/layout/Sidebar.tsx` — edit (added `analytics` tab to ActiveTab and NAV_GROUPS)
- `frontend/src/components/analytics/AnalyticsView.tsx` — add
- `frontend/src/components/analytics/SpcControlChartView.tsx` — add
- `frontend/src/components/analytics/FmeaRiskView.tsx` — add
- `frontend/src/components/analytics/CycleTimeDistributionView.tsx` — add
- `frontend/src/App.tsx` — edit (wired AnalyticsView)
- `.agent-knowledge/dynamic/docs/dev/sdd/ARCHITECTURE.md` — edit (updated components & diagram)

## Review

- Result: Completed successfully
- Verification: 24/24 Vitest suites passed (133/133 tests), oxlint 0 warnings / 0 errors, `nest build` passed, `vite build` passed
- Follow-up: None

## UAT (User Acceptance Test) Verification

| # | Test | Result |
| --- | --- | --- |
| 1 | SPC Shewhart X-bar & R chart calculations with UCL, LCL, CL | Pass |
| 2 | Process capability metrics Cp, Cpk calculation with rating classification | Pass |
| 3 | Nelson Rules 1-4 out-of-control detection | Pass |
| 4 | FMEA RPN calculation and dynamic correlation with Andon/rejects | Pass |
| 5 | Cycle time distribution histogram generation with Gaussian bell curve overlay | Pass |
| 6 | Frontend interactive dashboard rendering with Atlassian design tokens | Pass |
