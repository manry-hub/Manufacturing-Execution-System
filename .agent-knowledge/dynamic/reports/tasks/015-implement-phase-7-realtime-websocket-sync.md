# 015 — Real-Time WebSocket Live Synchronization for Hybrid Modules

Date: 2026-10-29

## Checklist

- [x] Make `TelemetryModule` `@Global()` and expose generic module subscription handlers (`subscribe:module`, `unsubscribe:module`) on `TelemetryGateway`.
- [x] Implement broadcast methods on `TelemetryGateway` for Packaging, Maintenance, Quality, Materials, and Scheduling events with dual module/plant room delivery.
- [x] Inject `TelemetryGateway` with `@Optional()` into `PackagingService`, `MaintenanceService`, `QualityService`, `MaterialsService`, `SchedulingService`, and `RunsService`.
- [x] Emit domain events on business transactions (packaging creation & reconciliation, maintenance WO auto-trigger & completion, first-piece QC inspection signoff & quarantine interlock, hopper load & depletion, and scheduling timeline changes).
- [x] Expand `useTelemetrySocket` frontend hook with strictly-typed listeners and auto-reconnecting module/machine subscriptions.
- [x] Wire live updates and Atlassian "Live Sync" badges in `PackagingView`, `MaintenanceView`, `QualityView`, `MaterialsView`, and `SchedulingView`.
- [x] Implement Machine Quarantine Interlock visual states in `MachineCard` and `MachineDetailView` driven by `machine:interlock_state`.
- [x] Add unit test suite `telemetry.gateway.spec.ts` covering all room subscriptions and event broadcasts.
- [x] Verify monorepo: `pnpm lint` (0 warnings, 0 errors), Vitest (17 suites, 85 tests passing 100%), and production frontend/backend builds passing cleanly.

## Change Description

Engineered comprehensive end-to-end WebSocket real-time live synchronization across all Phase 5 hybrid modules (Packaging, Maintenance, Quality, Materials, and Scheduling). Connected backend domain services to `TelemetryGateway` to push real-time events on state modifications, eliminating manual refreshes across all shop floor and supervisor dashboards. On the client side, upgraded `useTelemetrySocket` to maintain room state through socket reconnections and wired reactive listeners into all 5 hybrid views with live status badges and visual lockout banners on quality quarantine interlocks.

## Modified Files

- `backend/src/modules/telemetry/telemetry.module.ts` — edit
- `backend/src/modules/telemetry/telemetry.gateway.ts` — edit
- `backend/src/modules/telemetry/telemetry.gateway.spec.ts` — add
- `backend/src/modules/packaging/packaging.service.ts` — edit
- `backend/src/modules/maintenance/maintenance.service.ts` — edit
- `backend/src/modules/quality/quality.service.ts` — edit
- `backend/src/modules/materials/materials.service.ts` — edit
- `backend/src/modules/scheduling/scheduling.service.ts` — edit
- `backend/src/modules/production/services/runs.service.ts` — edit
- `frontend/src/types/machine.ts` — edit
- `frontend/src/hooks/useTelemetrySocket.ts` — edit
- `frontend/src/App.tsx` — edit
- `frontend/src/components/machines/MachineCard.tsx` — edit
- `frontend/src/components/machines/detail/MachineDetailView.tsx` — edit
- `frontend/src/components/packaging/PackagingView.tsx` — edit
- `frontend/src/components/maintenance/MaintenanceView.tsx` — edit
- `frontend/src/components/quality/QualityView.tsx` — edit
- `frontend/src/components/materials/MaterialsView.tsx` — edit
- `frontend/src/components/scheduling/SchedulingView.tsx` — edit

## Review

- Result: Full-stack zero-latency real-time live synchronization successfully operational across all hybrid MES modules and shop floor views.
- Verification: `pnpm lint` passed with 0 warnings/0 errors; Vitest passed 17 test suites (85/85 tests passed 100%); Vite production client bundle built in 2.34s; NestJS SWC backend build compiled 85 files with 0 errors.
- Follow-up: None.

## UAT (User Acceptance Test) Verification

| # | Test | Result |
| --- | --- | --- |
| 1 | Module room subscription and unsubscription (`subscribe:module`, `unsubscribe:module`) | Pass |
| 2 | Packaging carton creation broadcast (`packaging:unit_created`) and reconciliation update (`packaging:reconciled`) | Pass |
| 3 | Tooling stroke counter accumulation (`mold:stroke_accumulated`) and auto-PM work order trigger (`maintenance:work_order_created`) | Pass |
| 4 | First-piece quality gate pass/quarantine broadcast (`quality:first_piece_status_changed`, `machine:interlock_state`) | Pass |
| 5 | Shop floor machine card and detail interlock lockout indicator ("QC Interlock" badge and "LOCKED OUT" banner) | Pass |
| 6 | Raw material hopper loading (`materials:hopper_loaded`) and lot stock deduction (`materials:lot_stock_updated`) | Pass |
| 7 | Multi-client scheduling timeline broadcast (`scheduling:timeline_updated`, `scheduling:order_rescheduled`) | Pass |
| 8 | Monorepo linting (`oxlint`) and unit test suite (17/17 suites, 85/85 tests) | Pass |
