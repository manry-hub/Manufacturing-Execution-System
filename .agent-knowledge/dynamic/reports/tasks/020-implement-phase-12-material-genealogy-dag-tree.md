# 020 — Implement Phase 12 Material Genealogy DAG Tree & Quarantine Containment

Date: 2026-10-29

## Checklist

- [x] Implement backend carton backward trace endpoint in `MaterialsService.getCartonGenealogy` (scanned carton barcode ➔ production run ➔ IMM machine ➔ mold ➔ raw resin and masterbatch lots with supplier heat numbers)
- [x] Implement backend one-click material lot quarantine in `MaterialsService.quarantineLot` with blast-radius containment calculation (affected runs, cartons, parts) and WebSocket broadcast (`materials:lot_quarantined`)
- [x] Implement machine hopper live residual level calculation in `MaterialsService.getHopperLevels` with low resin warnings (< 10 kg)
- [x] Author comprehensive backend unit tests in `materials.service.spec.ts` for carton trace, lot quarantine, and hopper level estimation (108 tests passing)
- [x] Create interactive node-link Directed Acyclic Graph component `GenealogyDagTree.tsx` supporting Forward Trace, Backward Trace, and Run Lineage
- [x] Implement Node Inspector slide-over drawer showing detailed certificate of analysis, supplier heat numbers, shot counts, and operator details
- [x] Add Quarantine Containment confirmation modal in `MaterialsView.tsx` with defect justification input and instant status updates
- [x] Embed collapsible Machine Hopper Residual Levels Card in `MaterialsView.tsx` with color-coded status badges
- [x] Verify full monorepo linting (`oxlint`, 0 warnings, 0 errors) and production builds (`vite build`, `nest build`)

## Change Description

Engineered an interactive Directed Acyclic Graph (DAG) material genealogy and quality containment suite complying with automotive IATF 16949 / ISO 9001 bidirectional traceability standards:
1. **Bidirectional Visual DAG Canvas (`GenealogyDagTree.tsx`)**:
   - High-contrast visual node-link DAG linking Raw Material Lots $\to$ Hopper Intakes $\to$ IMM Machines & Molds $\to$ Work Orders $\to$ Finished Serialized Cartons.
   - Three navigation modes: **Run Lineage**, **Forward Trace** (Resin Lot ➔ Cartons), and **Backward Trace** (Carton Barcode ➔ Virgin Resin).
   - Clickable nodes with a slide-over inspection drawer for inspecting supplier heat certificates, density, shot metrics, and timestamps.
2. **Scanned Carton Barcode Backward Resolution**:
   - `GET /materials/genealogy/carton/:barcode` resolves any physical carton label (e.g. `PKG-...`) directly back to machine parameters and raw resin/masterbatch batches.
3. **One-Click Material Quarantine Containment Action**:
   - `POST /materials/lots/:id/quarantine` transitions lot status to `QUARANTINE`.
   - Computes containment blast-radius (affected runs, total finished parts, and serialized cartons to hold).
   - Emits a real-time WebSocket event (`materials:lot_quarantined`) to alert quality teams.
4. **Machine Hopper Depletion & Residual Monitoring**:
   - `GET /materials/hopper/levels` calculates live residual resin per active machine based on molded part weights and cycle counts.
   - Automatically flags hoppers with $< 10\text{ kg}$ remaining to prevent machine starvation.

## Modified Files

- `backend/src/modules/materials/materials.service.ts` — edit: Added `getCartonGenealogy`, `quarantineLot`, and `getHopperLevels`
- `backend/src/modules/materials/materials.controller.ts` — edit: Added REST endpoints for carton genealogy, lot quarantine, and hopper levels
- `backend/src/modules/materials/materials.service.spec.ts` — edit: Added unit tests for carton trace, quarantine containment, and hopper residual calculations
- `backend/src/modules/telemetry/telemetry.gateway.ts` — edit: Added `materials:lot_quarantined` event union type
- `frontend/src/types/materials.ts` — edit: Added types for `CartonGenealogy`, `QuarantineResponse`, and `HopperLevel`
- `frontend/src/services/api.ts` — edit: Added API client methods for carton genealogy, quarantine, and hopper levels
- `frontend/src/components/materials/GenealogyDagTree.tsx` — add: Interactive visual Node-Link DAG component and slide-over inspector
- `frontend/src/components/materials/MaterialsView.tsx` — edit: Integrated DAG tree, 3-mode trace selector, live hopper levels card, and quarantine modal
- `.agent-knowledge/dynamic/workflows/011-material-genealogy-dag-tree-traceability.md` — add: Authored implementation workflow document

## Review

- Result: Full bidirectional genealogy DAG tree, carton-to-resin trace, and one-click quarantine containment operational.
- Verification: 108 backend unit tests passing (100%), Oxlint 0 warnings/0 errors, Vite & NestJS production builds 100% green.
- Follow-up: None.

## UAT (User Acceptance Test) Verification

| # | Test | Result |
| --- | --- | --- |
| 1 | Backward trace from carton barcode to run and raw material lots | Pass |
| 2 | Forward trace from raw resin lot to consuming runs and cartons | Pass |
| 3 | One-click lot quarantine with blast-radius calculation | Pass |
| 4 | Active machine hopper residual level estimation and low-level alerts | Pass |
| 5 | Node Inspector flyout drawer displaying full lineage attributes | Pass |
| 6 | Full monorepo linting check (`oxlint`, 0 warnings, 0 errors) | Pass |
| 7 | Production frontend build (`tsc -b && vite build`) | Pass |
| 8 | Production backend build (`nest build`) | Pass |
