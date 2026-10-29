# Implementation Workflow 012: Hard First-Piece QC Run Gating & CPK Tolerance Analytics

**Status:** PROPOSED PLAN — READY FOR STAGED EXECUTION  
**Target Completion:** Phase 13 / Epic 8 (Quality Management, Hard First-Piece Run-State Gating from SETUP to ACTIVE, Variable Dimension Tolerance Verification, CPK Process Capability Scoring, and Inspector Sign-off)  
**References:**
- Product Requirements Document: [PRD.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/.agent-knowledge/dynamic/docs/dev/PRD.md) (`US-016`, `US-017`, `US-018`)
- System Architecture Document: [ARCHITECTURE.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/.agent-knowledge/dynamic/docs/dev/sdd/ARCHITECTURE.md)
- Existing Quality Service: [quality.service.ts](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/backend/src/modules/quality/quality.service.ts)
- Existing Runs Service: [runs.service.ts](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/backend/src/modules/production/services/runs.service.ts)
- Existing Quality View: [QualityView.tsx](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/frontend/src/components/quality/QualityView.tsx)
- Design System Tokens: [DESIGN.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/DESIGN.md)

---

## 1. Executive Summary & Problem Statement

In plastics injection molding, mold changeovers and cold machine start-ups frequently produce dimensional drift, flash, sink marks, or short shots during the first few cycles. Releasing a machine into full serial mass production without verified Quality sign-off creates severe scrap volume and potential recall liability.

### Current State:
1. `QualityService` already provides `recordQualityCheck` and evaluates whether variable measurements fall within Upper/Lower tolerances (`USL` / `LSL`).
2. However, transitioning a machine run from `SETUP` to `ACTIVE` currently lacks **hard runtime enforcement**: an operator could theoretically run a machine without First-Piece approval.
3. Statistical Process Capability ($C_p$ and $C_{pk}$) is not calculated from historical check samples to gauge whether the injection mold is dimensionally stable ($C_{pk} \ge 1.33$ automotive standard).
4. `QualityView.tsx` lacks visual CPK scorecards and an explicit First-Piece sign-off wizard.

### The Objective:
Implement **Hard First-Piece Quality Gate Enforcement & Statistical Capability Analytics**:
1. **Hard Run-State Gating (US-018)**:
   - Provide `releaseRunToActive(runId)` in `RunsService` / `RunsController`.
   - Strictly enforces that any run in `SETUP` status cannot transition to `ACTIVE` unless an approved First-Piece QC Check (`disposition === 'RELEASED'`) has been recorded.
   - Throws `BadRequestException` if First-Piece inspection is missing or failed (`QUARANTINE`).
2. **Statistical CPK Calculation Engine**:
   - Computes Mean ($\bar{x}$), Sample Standard Deviation ($\sigma$), $C_p$, $C_{pu}$, $C_{pl}$, and $C_{pk} = \min(C_{pu}, C_{pl})$ for variable parameters across inspection check history.
   - Categorizes process capability into standard IATF 16949 tiers:
     - $C_{pk} \ge 1.33$: **Capable** (High quality stability)
     - $1.00 \le C_{pk} < 1.33$: **Marginally Capable**
     - $C_{pk} < 1.00$: **Incapable / High Defect Risk**
3. **Dedicated First-Piece Approval & Sign-Off Wizard**:
   - Upgraded modal in `QualityView.tsx` with nominal targets, tolerance deviation bars, live Pass/Fail feedback, and inspector credentials.
   - "Sign-Off First-Piece & Release Machine" action that atomicity releases both the quality gate and transitions the run from `SETUP` to `ACTIVE`.
4. **CPK Scorecards & Tolerance Distribution Gauge**:
   - Visual gauge card displaying process capability metrics for critical dimensions (wall thickness, clip diameter, weight).

---

## 2. Technical Architecture & First-Piece Interlock State Machine

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                   HARD FIRST-PIECE QUALITY GATING STATE MACHINE                        │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
                                           ▼
                            ┌─────────────────────────────┐
                            │ Production Run in SETUP     │
                            │ (Machine Trial Cycles)      │
                            └──────────────┬──────────────┘
                                           │
                                           ▼
                            ┌─────────────────────────────┐
                            │ QC Inspector Measures Parts │
                            │ (Variable & Attribute)      │
                            └──────────────┬──────────────┘
                                           │
                     ┌─────────────────────┴─────────────────────┐
                     ▼                                           ▼
        ┌─────────────────────────┐                 ┌─────────────────────────┐
        │ Measurements Out-of-Tol │                 │ All Samples In-Tol      │
        │ Disposition: QUARANTINE │                 │ Disposition: RELEASED   │
        └────────────┬────────────┘                 └────────────┬────────────┘
                     │                                           │
                     ▼                                           ▼
        ┌─────────────────────────┐                 ┌─────────────────────────┐
        │ Machine Interlock Active│                 │ First-Piece Approved    │
        │ Transition to ACTIVE    │                 │ Unlocks Transition:     │
        │ BLOCKED (HTTP 400)      │                 │ SETUP ➔ ACTIVE          │
        └─────────────────────────┘                 └─────────────────────────┘
```

---

## 3. Staged Implementation Plan

### Stage 1: Backend Hard Run Gating & CPK Engine
- Add `calculateCpk(productId?: string, planItemId?: string, runId?: string)` to `QualityService`.
- Add `releaseRunToActive(runId: string)` to `RunsService` requiring `checkFirstPieceReleaseStatus(runId).isReleased === true`.
- Expose `POST /production/runs/:id/release-to-active` and `GET /quality/cpk` REST endpoints.
- Author unit tests in `runs.service.spec.ts` and `quality.service.spec.ts` (verifying blocking without First-Piece, successful release with signoff, and CPK math).

### Stage 2: Frontend First-Piece Sign-off Wizard & CPK Scorecards
- Update `frontend/src/types/quality.ts` and `frontend/src/services/api.ts`.
- Add CPK Scorecards and tolerance visual indicator to `QualityView.tsx`.
- Add "Release Machine to Serial Production" button in `QualityView.tsx` when First-Piece sign-off is approved.

### Stage 3: Verification & Monorepo Health
- Verify unit tests across backend (`pnpm --filter backend test`).
- Verify monorepo linting (`pnpm lint`).
- Verify production builds (`pnpm --filter frontend build`, `pnpm --filter backend build`).
