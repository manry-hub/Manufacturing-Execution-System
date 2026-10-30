# 021 — Implement Phase 13 Hard First-Piece QC Run Gating & CPK Process Capability Analytics

Date: 2026-10-29

## Checklist

- [x] Implement backend hard run gating in `RunsService.releaseRunToActive(runId)` checking First-Piece approval status before allowing transition from `SETUP` to `ACTIVE`
- [x] Expose `POST /production/runs/:id/release-to-active` and `GET /quality/cpk` REST endpoints
- [x] Implement statistical process capability ($C_p$, $C_{pu}$, $C_{pl}$, and $C_{pk}$) analytics engine in `QualityService.calculateCpk`
- [x] Author comprehensive Vitest unit tests in `runs.service.spec.ts` (10 tests) and `quality.service.spec.ts` (10 tests) verifying state transitions, blocking without approval, and CPK math
- [x] Add real-time WebSocket broadcast for `machine:interlock_state` and `production:run_released`
- [x] Update frontend `QualityView.tsx` with First-Piece state machine banner (gated setup, interlocked quarantine, serial active), one-click release action, and real-time tolerance delta preview
- [x] Add statistical process capability scorecards and tolerance distribution gauges for variable parameters in `QualityView.tsx`
- [x] Add "Release (Gated)" button in `ProductionOrdersView.tsx` for runs in `SETUP` status
- [x] Verify zero lint warnings across monorepo with `oxlint` and 100% green test suite (117 tests passing)

## Change Description

Implemented Phase 13 (Epic 8 — Quality Management, US-016, US-017, US-018) establishing IATF 16949 / ISO 9001 hard quality governance and statistical process capability ($C_p$ & $C_{pk}$) analysis for injection molding operations:
1. **Hard Run-State Gating (US-018)**: Machines in `SETUP` mode cannot transition to `ACTIVE` serial production without approved First-Piece Quality signoff (`disposition === 'RELEASED'`). Attempts to transition without approval throw `BadRequestException`. When First-Piece check fails (`QUARANTINE`), machine is interlocked and serial running is strictly blocked.
2. **Statistical Process Capability Engine**: Computes Mean ($\bar{x}$), Sample Standard Deviation ($\sigma$), $C_p$, $C_{pu}$, $C_{pl}$, and $C_{pk} = \min(C_{pu}, C_{pl})$ across historical inspection samples for variable dimensional parameters. Categorizes capability into `CAPABLE` ($C_{pk} \ge 1.33$), `MARGINAL` ($1.00 \le C_{pk} < 1.33$), and `INCAPABLE` ($C_{pk} < 1.00$).
3. **Interactive Quality View & Scorecards**:
   - First-Piece status banner dynamically reflects current interlock state (Gated in Setup, Interlocked in Quarantine, or Authorized Serial Running).
   - Process Capability ($C_p$ & $C_{pk}$) cards with visual tolerance distribution gauges $[LSL \dots T \dots USL]$ displaying sample mean positioning and recent sample readings.
   - Live tolerance delta calculation preview ($\Delta = x - T$) during inspection sample entry with automatic release toggle upon approval.

## Modified Files

- `backend/src/modules/production/dto/start-production-run.dto.ts` — edit (added optional `status` property)
- `backend/src/modules/production/services/runs.service.ts` — edit (injected `QualityService`, added `releaseRunToActive` with First-Piece check gating, and default status `SETUP`)
- `backend/src/modules/production/production.controller.ts` — edit (exposed `POST /production/runs/:id/release-to-active`)
- `backend/src/modules/production/production.module.ts` — edit (imported `QualityModule`)
- `backend/src/modules/quality/quality.service.ts` — edit (implemented `calculateCpk` process capability engine)
- `backend/src/modules/quality/quality.controller.ts` — edit (exposed `GET /quality/cpk` endpoint)
- `backend/src/modules/telemetry/telemetry.gateway.ts` — edit (added `broadcastProductionEvent` for run lifecycle events)
- `backend/src/modules/production/services/runs.service.spec.ts` — edit (added unit tests for `releaseRunToActive`)
- `backend/src/modules/quality/quality.service.spec.ts` — edit (added unit tests for `calculateCpk`)
- `frontend/src/types/quality.ts` — edit (defined `CpkMetric` and `CpkAnalyticsResponse` interfaces)
- `frontend/src/services/api.ts` — edit (added `releaseRunToActive` and `getCpkAnalytics` methods)
- `frontend/src/hooks/useTelemetrySocket.ts` — edit (added `onProductionRunReleased` handler)
- `frontend/src/components/quality/QualityView.tsx` — edit (integrated CPK scorecards, tolerance distribution gauges, First-Piece interlock banners, and automated release)
- `frontend/src/components/production/ProductionOrdersView.tsx` — edit (added "Release (Gated)" action for runs in `SETUP` mode)
- `frontend/src/App.tsx` — edit (connected `onProductionRunReleased` socket event and passed `onRefreshRuns` to `QualityView`)
- `.agent-knowledge/dynamic/workflows/012-hard-first-piece-qc-run-gating.md` — add (implementation specification and architecture workflow)

## Review

- Result: Phase 13 Hard First-Piece Run Gating and CPK Capability Analytics successfully implemented across backend and frontend.
- Verification: Monorepo linting passed cleanly with 0 errors/0 warnings (`oxlint`). Vitest backend test suite passed 100% (20 test suites, 117 tests passing). Backend and frontend production builds (`nest build`, `vite build`) cleanly compiled with zero issues.
- Follow-up: Proceed to next roadmap priority: Epic 12 (Phase 14 — Industrial IoT Protocol Connectors: MQTT Ingestion & Modbus TCP Gateway / Field Protocol Bridge).

## UAT (User Acceptance Test) Verification

| # | Test | Result |
| --- | --- | --- |
| 1 | Attempt transitioning run in `SETUP` to `ACTIVE` without First-Piece approval (verifies HTTP 400 rejection with explanatory error message) | Pass |
| 2 | Record First-Piece check with out-of-spec variable values (verifies auto-disposition to `QUARANTINE` and machine interlock event emission) | Pass |
| 3 | Record First-Piece check with in-spec values and sign off (verifies `RELEASED` disposition and unlocks `releaseRunToActive`) | Pass |
| 4 | Transition run from `SETUP` to `ACTIVE` with verified approval (verifies state update, socket broadcast, and cycle accumulation unlock) | Pass |
| 5 | Verify CPK calculation engine: handles $N < 2$ as `INSUFFICIENT_DATA`, correctly calculates $\mu, \sigma, C_p, C_{pk}$ and assigns `CAPABLE`, `MARGINAL`, or `INCAPABLE` | Pass |
| 6 | Render CPK Scorecards and Tolerance Distribution Gauge on frontend | Pass |
| 7 | Full monorepo build and linting verification (`oxlint`, `vitest`, `tsc`, `vite`) | Pass |
