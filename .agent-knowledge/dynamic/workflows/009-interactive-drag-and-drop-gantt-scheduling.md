# Implementation Workflow 009: Interactive Drag-and-Drop Gantt Scheduling & Conflict Guard

**Status:** PROPOSED PLAN — READY FOR STAGED EXECUTION  
**Target Completion:** Phase 10 / Epic 10 (Interactive Visual Production Scheduling, Cross-Machine Drag-and-Drop Rescheduling, Snapping Grid, and Real-Time Tooling Conflict Guards)  
**References:**
- Product Requirements Document: [PRD.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/.agent-knowledge/dynamic/docs/dev/PRD.md) (`US-021`, `US-022`)
- System Architecture Document: [ARCHITECTURE.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/.agent-knowledge/dynamic/docs/dev/sdd/ARCHITECTURE.md)
- Existing Scheduling Service: [scheduling.service.ts](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/backend/src/modules/scheduling/scheduling.service.ts)
- Existing Gantt View: [SchedulingView.tsx](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/frontend/src/components/scheduling/SchedulingView.tsx)
- Design System Tokens: [DESIGN.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/DESIGN.md)

---

## 1. Executive Summary & Problem Statement

In plastics injection molding facilities, machine utilization is the most critical driver of plant profitability. When unexpected events occur (such as a machine trip, resin delay, or rush order), production planners need to reshuffle jobs across 10 machines rapidly.

### Current State:
1. The Gantt Dispatch Timeline (`SchedulingView.tsx`) visualizes scheduled orders, mold changeovers, and shift boundaries across 10 machines (`IMM-01` to `IMM-10`).
2. However, moving an order currently requires opening modal forms or clicking dialog buttons. Drag-and-drop was partially drafted but restrained (only allowed for `SCHEDULED` status, implemented on native `<button>` elements that suppress drag events in standard Chromium browsers, and lacked instant visual conflict feedback during dragging).

### The Objective:
Transform the Gantt board into a fully fluid, tactile **Interactive Drag-and-Drop Scheduling Canvas**:
1. **Horizontal Rescheduling**: Drag an order horizontally along its current machine track to shift start time forward or backward with 15-minute grid snapping.
2. **Vertical Cross-Machine Reassignment**: Drag an order vertically across machine rows (e.g. from `IMM-01` [150T] to `IMM-03` [200T]) with live validation.
3. **Backlog Direct-to-Timeline Ingestion**: Drag unscheduled orders from the Backlog Drawer directly into an empty slot on any machine.
4. **Live Conflict Prevention (Pre-Drop Guard)**:
   - **Tonnage Mismatch Guard**: Instantly warns or blocks if the destination machine tonnage is insufficient for the mold.
   - **Tooling Collision Guard**: Prevents or flags double-booking if the required mold is already assigned to another machine during that time window.
   - **Machine Overlap Indicator**: Highlights slot collisions in red before drop is committed.
5. **Real-Time WebSocket Synchronization**: Any reschedule committed by one planner immediately broadcasts across the plant network (`scheduling:order_rescheduled` and `scheduling:timeline_updated`), updating other planners' screens with zero reload.

---

## 2. Technical Architecture & User Experience Flow

```text
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                        INTERACTIVE GANTT SCHEDULING FLOW & CONFLICT GUARD                              │
└───────────────────────────────────┬────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │     User Interacts with Gantt Block or Backlog Card     │
       │     - HTML5 Drag: 'div[role=button]' with Grip Handle   │
       │     - Carries Order ID, Product ID, Mold ID, Duration   │
       └────────────────────────────┬────────────────────────────┘
                                    │
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │     DragOver Event on Machine Track Target              │
       │     - Snaps X coordinate to 15-minute grid intervals    │
       │     - Resolves Target Machine (IMM-01 ... IMM-10)       │
       │     - Evaluates Target Clamping Tonnage vs Product Mold │
       │     - Checks Concurrent Mold Usage across other rows    │
       └────────────────────────────┬────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
       ┌────────────────────────┐      ┌────────────────────────┐
       │     VALID DROP ZONE    │      │  CONFLICTING DROP ZONE │
       │  • Ghost Slot: Blue    │      │  • Ghost Slot: Red/Amb │
       │  • Status: "Ready"     │      │  • Tonnage / Collision │
       └────────────┬───────────┘      └────────────┬───────────┘
                    │                               │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │     Drop Event Committed                                │
       │     - Computes New Planned Start Time & End Time        │
       │     - Calls 'api.rescheduleOrder()' or 'scheduleOrder()'│
       └────────────────────────────┬────────────────────────────┘
                                    │
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │     Backend 'SchedulingService.rescheduleOrder()'       │
       │     - Validates order existence                         │
       │     - Preserves order duration (End = Start + Duration) │
       │     - Updates database via Prisma transaction           │
       │     - Broadcasts WebSocket 'scheduling:timeline_updated'│
       └────────────────────────────┬────────────────────────────┘
                                    │
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │     All Connected Frontend Clients Auto-Refresh         │
       │     - Gantt blocks smoothly reposition                  │
       │     - Mold changeover blocks recompute dynamically      │
       └─────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Component Plan

### 3.1 Backend Enhancements (`backend/src/modules/scheduling/`)
1. **`scheduling.service.ts`**:
   - Ensure `rescheduleOrder()` permits rescheduling for both `SCHEDULED` and `RELEASED` orders (production runs that are already `IN_PROGRESS` or `COMPLETED` cannot be shifted).
   - In `rescheduleOrder()`, validate that if a new machine is specified, recalculate mold changeovers seamlessly.
   - Ensure WebSocket events `scheduling:order_rescheduled` and `scheduling:timeline_updated` carry the updated machine ID and start/end times.
2. **`scheduling.service.spec.ts`**:
   - Add unit test coverage for:
     - Shifting order planned start time forward/backward.
     - Relocating order from Machine A to Machine B while preserving duration.
     - Error handling if order is not found or in invalid state.

### 3.2 Frontend Refactor (`frontend/src/components/scheduling/SchedulingView.tsx`)
1. **Block Markup Optimization**:
   - Replace `<button draggable>` with `<div role="button" tabIndex={0} draggable>` to eliminate browser button mouse event suppression.
   - Support dragging for both `status === 'SCHEDULED'` and `status === 'RELEASED'`.
2. **Ghost Slot Overlay & Real-Time Conflict Validation**:
   - Render a high-visibility ghost slot during drag:
     - Shows exact snapped start & end time badge (e.g. `10:15 — 12:45`).
     - Shows calculated destination duration.
     - Live Tonnage Match Check: compares target machine `clampingTonnage` against required tonnage. If target tonnage is too low, ghost displays a red border with "⚠️ Tonnage Deficit (Requires X Tons, Machine is Y Tons)".
     - Live Tooling Collision Check: checks if another machine row has an active block with the same `moldId` at that time. If so, flags "⚠️ Mold Collision with IMM-XX".
3. **Backlog Drawer Drag-and-Drop**:
   - Allow dragging unscheduled backlog cards directly onto any machine track.
   - Automatically selects a compatible mold for the product if not pre-assigned.
4. **Optimistic Visual Feedback & Toast Notification**:
   - Display a non-blocking toast confirming: `"Order WO-1234 relocated to IMM-02 at 10:15."`
   - Handle network/backend errors with roll-back.

---

## 4. Staged Implementation Plan

### Stage 1: Backend Alignment & Unit Testing
1. Update `backend/src/modules/scheduling/scheduling.service.ts`:
   - Verify `rescheduleOrder` and `scheduleOrder` logic.
   - Ensure `status` validation correctly handles `SCHEDULED` and `RELEASED`.
2. Update `backend/src/modules/scheduling/scheduling.service.spec.ts`:
   - Add unit tests for `rescheduleOrder` and duration preservation.
   - Run `pnpm --filter backend test` (verify 100% pass).

### Stage 2: Frontend Drag-and-Drop Engine Refactor
1. Update `frontend/src/components/scheduling/SchedulingView.tsx`:
   - Refactor timeline block element to `<div role="button" draggable>`.
   - Implement enhanced `onDragStart`, `onDragEnd`, `onDragOver`, `onDragLeave`, `onDrop`.
   - Add live collision & tonnage checks in `handleTrackDragOver`.
   - Render informative Ghost Slot preview with color-coded feedback (Blue = Valid, Red = Tonnage/Mold Conflict, Amber = Schedule Overlap).
   - Ensure Backlog drawer cards can be dragged directly onto the timeline tracks.

### Stage 3: Monorepo Verification & Task Report
1. Run `pnpm lint` (`oxlint`, 0 warnings, 0 errors).
2. Run `pnpm --filter backend test` (100% assertions green).
3. Run `pnpm build:be` and `pnpm build:fe`.
4. Author Task Report `018-implement-phase-10-drag-and-drop-gantt-scheduling.md`.
5. Commit and push to `origin/develop`.

---

## 5. Verification Matrix

| Test Case | Method | Expected Outcome |
|---|---|---|
| **Horizontal Time Shift** | Drag order right by 1 hour | Snaps to 15m grid, updates plannedStartTime/plannedEndTime, persists to DB |
| **Cross-Machine Move** | Drag order from IMM-01 to IMM-02 | Moves to IMM-02 row, updates assignedMachineId, recomputes changeover blocks |
| **Backlog Direct Drag** | Drag from Backlog to IMM-05 | Schedules order on IMM-05 at dropped time, removes from backlog |
| **Tonnage Conflict Warning** | Drag large mold order to 150T machine | Ghost slot flags red warning with required tonnage |
| **WebSocket Propagation** | Open two browser tabs | Dragging on Tab A instantly shifts the block on Tab B without reload |
| **Code Quality** | `pnpm lint` & Vitest | 0 lint warnings, 100 tests passed, clean builds |
