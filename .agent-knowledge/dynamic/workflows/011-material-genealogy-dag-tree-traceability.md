# Implementation Workflow 011: Interactive Visual Material Genealogy DAG Tree & Quarantine Containment

**Status:** PROPOSED PLAN — READY FOR STAGED EXECUTION  
**Target Completion:** Phase 12 / Epic 7 (Raw Material Lot Traceability, Bidirectional Forward & Backward Genealogy, Interactive Visual Node-Link DAG Tree, Carton-to-Resin Trace, and One-Click Quality Quarantine Containment)  
**References:**
- Product Requirements Document: [PRD.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/.agent-knowledge/dynamic/docs/dev/PRD.md) (`US-013`, `US-014`, `US-015`)
- System Architecture Document: [ARCHITECTURE.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/.agent-knowledge/dynamic/docs/dev/sdd/ARCHITECTURE.md)
- Existing Materials Service: [materials.service.ts](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/backend/src/modules/materials/materials.service.ts)
- Existing Materials View: [MaterialsView.tsx](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/frontend/src/components/materials/MaterialsView.tsx)
- Design System Tokens: [DESIGN.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/DESIGN.md)

---

## 1. Executive Summary & Problem Statement

In regulated manufacturing (IATF 16949 for automotive injection molding and ISO 13485 for medical devices), traceability is mandatory. When a supplier issues a recall for contaminated polymer resin or when a customer reports a defective bumper fascia, the quality engineering team must be able to:
1. **Trace Backward**: Scan or enter a finished carton serial barcode $\to$ identify the exact injection molding machine, mold tool, operator, hopper intake, and raw resin/masterbatch lot numbers with vendor heat certificates.
2. **Trace Forward**: Select a contaminated raw resin lot $\to$ identify every production run, work order, and serialized carton that contains that material.
3. **Execute Immediate Containment**: One-click quarantine action to freeze the contaminated lot and mark all downstream runs/cartons for recall inspection before shipping.

### Current State:
1. The backend has `getRunGenealogy` and `getLotGenealogy`, but lacks a direct `getCartonGenealogy` backward trace from a scanned carton barcode and lacks a `quarantineLot` containment endpoint.
2. The frontend renders simple list cards rather than an interactive, navigable node-link Directed Acyclic Graph (DAG).
3. Hopper levels are not dynamically calculated or monitored for depletion against cycle counts.

### The Objective:
Transform the Material Management view into an **Interactive Visual Material Genealogy DAG Tree & Containment Suite**:
1. **Bidirectional Visual DAG Canvas**:
   - High-contrast visual node-link graph with SVG bezier connectors linking:
     - `Material Lot` $\to$ `Hopper Intake` $\to$ `IMM Machine & Mold` $\to$ `Work Order` $\to$ `Carton / Pallet Barcodes`.
   - Toggle between **Forward Trace** (Lot $\to$ Cartons) and **Backward Trace** (Carton Barcode $\to$ Resin Lot).
   - Clickable nodes with flyout inspection drawer showing supplier certificates, density, shot metrics, and timestamps.
2. **Finished Goods Carton Barcode Backward Lookup**:
   - Enter or scan any `PKG-...` barcode to instantly resolve the complete upstream lineage up to the virgin polymer supplier lot.
3. **One-Click Material Quarantine Containment Action**:
   - Allows quality managers to place a suspect lot in `QUARANTINE`.
   - Computes containment blast-radius (affected runs, total parts, serialized cartons).
   - Emits real-time WebSocket alert (`materials:lot_quarantined`).
4. **Machine Hopper Level & Depletion Monitor**:
   - Calculates hopper residual weight: $\text{Current Hopper Kg} = \sum \text{Loaded Kg} - (\text{Run Shots} \times \text{Part Weight Kg})$.
   - Flags low hopper warning (< 10 kg) to prompt material handlers before machine starves.

---

## 2. Technical Architecture & DAG Graph Model

```text
FORWARD TRACE DAG (From Raw Resin Lot):
┌─────────────────────────┐
│ Raw Material Lot        │
│ LOT-PP-202610-01        │ (Base Polymer)
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Hopper Intake Record    │ (Loaded 50 kg by Handler)
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Machine & Production Run│ (IMM-01 / WO-20261028-001)
│ Mold: MOLD-001 (2 cav)  │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Serialized Cartons      │ (PKG-001-A, PKG-001-B, ...)
│ Pallet: PAL-01          │
└─────────────────────────┘

BACKWARD TRACE DAG (From Scanned Carton Serial Barcode):
┌─────────────────────────┐
│ Scanned Carton Barcode  │
│ PKG-002-K92X            │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Production Run & Machine│ (IMM-02 / 300T / WO-20261028-002)
└───────────┬─────────────┘
            │
     ┌──────┴──────────────────────────┐
     ▼                                 ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│ Base Resin Lot          │     │ Color Masterbatch Lot   │
│ LOT-ABS-202610-02       │     │ LOT-MB-BLK-01           │
│ Supplier: Sabic Heat#99 │     │ Supplier: Clariant      │
└─────────────────────────┘     └─────────────────────────┘
```

---

## 3. Staged Implementation Plan

### Stage 1: Backend Services Hardening
- Add `getCartonGenealogy(barcode: string)` to `MaterialsService` and `MaterialsController`.
- Add `quarantineLot(lotId: string, reason?: string)` to `MaterialsService` and `MaterialsController`.
- Calculate hopper live residual weight per run based on product part weight.
- Author unit tests in `materials.service.spec.ts` for carton trace, quarantine containment, and blast-radius calculation.

### Stage 2: Frontend Visual DAG Component (`GenealogyDagTree.tsx`)
- Build an interactive SVG/HTML5 Node-Link DAG component:
  - Nodes: Material Lot, Hopper, Machine, Mold, Work Order, Carton, Pallet.
  - Directional animated bezier curves connecting the nodes.
  - Node status badges: Green (Verified/Available), Amber (In Progress), Red (Quarantined/Defective).
  - Click node to open Node Inspector drawer.

### Stage 3: Upgrade `MaterialsView.tsx` with DAG Canvas & Quarantine Controls
- Embed `GenealogyDagTree` in the Genealogy tab.
- Add mode selector: **Forward Trace (Lot $\to$ Cartons)**, **Backward Trace (Carton Barcode $\to$ Resin)**, and **Run Trace**.
- Add one-click **"Quarantine Lot & Contain Blast Radius"** button with modal confirmation.
- Add **Live Hopper Levels Card** displaying real-time kg residual with low-resin alerts (< 10kg).

### Stage 4: Verification & Monorepo Health
- Run backend unit tests (`pnpm --filter backend test`).
- Run monorepo linting (`pnpm lint`).
- Run production builds (`pnpm --filter frontend build`, `pnpm --filter backend build`).
