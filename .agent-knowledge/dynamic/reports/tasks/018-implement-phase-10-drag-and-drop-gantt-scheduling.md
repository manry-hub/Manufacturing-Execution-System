# 018 — Implement Phase 10 Interactive Drag-and-Drop Gantt Scheduling with Real-Time Conflict Guards

Date: 2026-10-29

## Checklist

- [x] Implement backend order rescheduling validation in `SchedulingService.rescheduleOrder` (block shifting of `IN_PROGRESS` and `COMPLETED` runs, preserve order duration)
- [x] Broadcast WebSocket rescheduling event to all connected planner clients on order shift or re-allocation
- [x] Author comprehensive Vitest unit tests in `scheduling.service.spec.ts` (103 total backend assertions green)
- [x] Implement HTML5 drag-and-drop interactions in `SchedulingView.tsx` with 15-minute grid snapping
- [x] Implement live tonnage clamping compatibility guard (e.g. >= 450T molds flagged on smaller tonnage machines)
- [x] Implement tooling collision guard (same mold running concurrently across multiple machines)
- [x] Implement machine schedule slot overlap warning
- [x] Implement Backlog Drawer drag-and-drop onto empty machine timeline tracks
- [x] Render real-time color-coded Ghost Slot preview with duration and time range badges
- [x] Verify linting (`oxlint`, 0 warnings, 0 errors) and production builds (`tsc -b && vite build`, `nest build`)

## Change Description

Enhanced the multi-machine visual Gantt scheduling canvas across 10 injection molding machines (`IMM-01` to `IMM-10`) to support interactive, collision-aware drag-and-drop scheduling:
1. **Interactive Timeline Re-Allocation**: Both `SCHEDULED` and `RELEASED` production orders can be picked up and repositioned horizontally (shifting start time with 15-minute magnetic snap) or vertically (transferring to another machine track).
2. **Backlog Drawer Drag-and-Drop**: Unscheduled backlog orders can be dragged directly from the slide-out backlog drawer onto any machine timeline slot.
3. **Live Ghost Slot with Conflict Detection**:
   - Calculates target start/end timestamps on hover.
   - **Tonnage Mismatch Guard**: Flags deficit if mold requires >= 450T (e.g., bumper mold `MOLD-006`) on smaller tonnage machines (< 450T).
   - **Tooling Collision Guard**: Detects if the required mold is concurrently scheduled on another machine during the target window.
   - **Schedule Overlap Check**: Highlights active block collisions on the destination machine.
   - Renders red error preview with alert icon on conflict, or blue/amber slot indicator when placement is safe or overlapping.
4. **Backend Rescheduling Hardening & Real-Time Sync**:
   - `SchedulingService.rescheduleOrder` guards against shifting active (`IN_PROGRESS`) or closed (`COMPLETED`) orders.
   - Automatically preserves planned duration (`plannedEndTime = newStart + duration`).
   - Emits WebSocket event (`order:rescheduled`) notifying all active planner browser sessions.

## Modified Files

- `backend/src/modules/scheduling/scheduling.service.ts` — edit: Added order lifecycle validation for rescheduling
- `backend/src/modules/scheduling/scheduling.service.spec.ts` — edit: Added unit tests for time shifting, machine re-allocation, and active run immutability
- `frontend/src/components/scheduling/SchedulingView.tsx` — edit: Added drag-and-drop handlers, live conflict detection, ghost preview, and backlog drag support
- `.agent-knowledge/dynamic/workflows/009-interactive-drag-and-drop-gantt-scheduling.md` — add: Authored implementation workflow 009

## Review

- Result: Full interactive drag-and-drop Gantt scheduling operational with live validation and real-time synchronization.
- Verification: 103 backend unit tests passing (100%), Oxlint 0 warnings/0 errors, Vite & NestJS builds 100% green.
- Follow-up: None.

## UAT (User Acceptance Test) Verification

| # | Test | Result |
| --- | --- | --- |
| 1 | Reschedule order shifts start/end time preserving duration | Pass |
| 2 | Relocate order to different machine track | Pass |
| 3 | Reject rescheduling for `IN_PROGRESS` or `COMPLETED` order | Pass |
| 4 | Oxlint type-aware lint check (0 errors, 0 warnings) | Pass |
| 5 | Full frontend production build (`tsc -b && vite build`) | Pass |
| 6 | Full backend production build (`nest build`) | Pass |
