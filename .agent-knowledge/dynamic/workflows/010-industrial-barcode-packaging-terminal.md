# Implementation Workflow 010: Industrial Barcode Packaging Terminal & Live Label Printing

**Status:** PROPOSED PLAN — READY FOR STAGED EXECUTION  
**Target Completion:** Phase 11 / Epic 11 (Finished Goods Packaging, Industrial Barcode & 2D Label Generation, Touchscreen HMI Station, USB HID Scanner Integration, and Shot-to-Pack Reconciliation)  
**References:**
- Product Requirements Document: [PRD.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/.agent-knowledge/dynamic/docs/dev/PRD.md) (`US-023`, `US-024`)
- System Architecture Document: [ARCHITECTURE.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/.agent-knowledge/dynamic/docs/dev/sdd/ARCHITECTURE.md)
- Existing Packaging Service: [packaging.service.ts](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/backend/src/modules/packaging/packaging.service.ts)
- Existing Packaging View: [PackagingView.tsx](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/frontend/src/components/packaging/PackagingView.tsx)
- Design System Tokens: [DESIGN.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/DESIGN.md)

---

## 1. Executive Summary & Problem Statement

In plastics injection molding, parts exiting the machine must be inspected, counted, boxed, and serialized before being transported to finished goods inventory or secondary assembly. Discrepancies between machine shot counts and physically boxed units create inventory write-offs, phantom stock, or short shipments.

### Current State:
1. The backend has basic packaging endpoints (`createPackagingUnit`, `reconcileRun`, `findAllUnits`) and emits WebSocket packaging events.
2. The current frontend has a standard HTML table and text inputs. It lacks:
   - Real barcode and 2D matrix rendering (`bwip-js` wasn't integrated, barcodes were just plain text strings).
   - Printable label format complying with automotive/industrial packaging standards (AIAG B-10, VDA 4902).
   - Hands-free USB/Bluetooth HID hardware barcode scanner listener.
   - Dynamic multi-segment Shot-to-Pack Reconciliation Gauge with $\pm 2\%$ tolerance threshold warnings.
   - Touchscreen Kiosk mode optimized for shop-floor operators wearing nitrile gloves.

### The Objective:
Transform the packaging view into a **Dedicated Industrial Barcode Packaging Terminal & Live Label Printing Station**:
1. **Live Barcode & QR Label Printing (`bwip-js`)**:
   - Vector/canvas rendering of Code 128 (linear) and DataMatrix / QR Code (2D).
   - Industrial AIAG B-10 / VDA-compliant label layout with Part #, Qty, Serial/Lot, Work Order, Date, and Machine tags.
   - One-click thermal printer output modal (standard 4" $\times$ 6" / 100mm $\times$ 150mm format) with dedicated print stylesheet.
2. **Shop-Floor USB/Bluetooth HID Barcode Scanner Integration**:
   - High-speed keystroke listener capturing scanned barcodes automatically (< 50ms inter-keystroke timing followed by carriage return/enter).
   - Audio-visual confirmation beep/flash upon successful scan.
   - Interactive on-screen Scanner Simulator widget for testing without physical handheld hardware.
3. **Advanced Shot-to-Pack Reconciliation Gauge & Tolerance Alerts**:
   - Multi-segment visual reconciliation gauge:
     $$\text{Expected Good} = (\text{Total Shots} \times \text{Cavities}) - \text{Logged Scrap}$$
     $$\text{Delta} = \text{Produced Good} - \text{Packed Quantity}$$
   - Tolerance evaluation:
     - **Balanced**: $|\text{Delta}| \le 2\%$.
     - **Discrepancy Deficit / Alert**: $> 2\%$ unboxed variance, triggering prominent warning and Packaging Andon status.
4. **Pallet Staging & Consolidation**:
   - Visual pallet capacity counter (e.g., 16/20 cartons).
   - One-click "Seal Pallet & Print Master Pallet Label".
5. **High-Contrast Touchscreen Kiosk Mode**:
   - Toggleable high-contrast mode with enlarged touch targets ($\ge 44\text{px}$) for shop-floor touch tablets/terminals.

---

## 2. Technical Architecture & HMI Touch Interaction Flow

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│             PACKAGING OPERATOR TOUCH TERMINAL & SCANNER DATAFLOW                       │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
         ┌─────────────────────────────────┴─────────────────────────────────┐
         ▼                                                                   ▼
┌────────────────────────────────┐                               ┌────────────────────────────────┐
│  Hardware USB/BT HID Scanner   │                               │  Touchscreen Kiosk Input Form  │
│  - Captures burst keypresses   │                               │  - Large touch keypad          │
│  - Parses barcode payload      │                               │  - Preset standard pack counts │
└────────────────┬───────────────┘                               └───────────────┬────────────────┘
                 │                                                               │
                 └───────────────────────────────┬───────────────────────────────┘
                                                 │
                                                 ▼
                              ┌─────────────────────────────────────┐
                              │  Packaging Controller & Service     │
                              │  - Validates uniqueness of barcode  │
                              │  - Increments order.packedQuantity  │
                              │  - Calculates reconciliation delta  │
                              └──────────────────┬──────────────────┘
                                                 │
                                                 ▼
                              ┌─────────────────────────────────────┐
                              │  Live Event Broadcast & Feedback    │
                              │  - WebSocket: packaging:unit_created│
                              │  - WebSocket: packaging:reconciled  │
                              │  - Render canvas barcode (bwip-js)  │
                              │  - Audio confirmation beep          │
                              └──────────────────┬──────────────────┘
                                                 │
                                                 ▼
                              ┌─────────────────────────────────────┐
                              │  Print Thermal Label Modal          │
                              │  - 4x6" AIAG B-10 format            │
                              │  - Crisp Code 128 & DataMatrix      │
                              │  - Direct browser / thermal print   │
                              └─────────────────────────────────────┘
```

---

## 3. Label Specification (AIAG B-10 / Industrial Standard)

The printable carton label adheres to AIAG B-10 standard sections:
1. **PART NUMBER**: Bold part number with Code 128 barcode prefixed by `(P)`.
2. **QUANTITY**: Box quantity with Code 128 barcode prefixed by `(Q)`.
3. **SERIAL / CARTON ID**: Unique carton serial barcode prefixed by `(S)`.
4. **SUPPLIER / MACHINE**: Machine code (e.g. `IMM-01`) and Mold code (e.g. `MOLD-001`).
5. **LOT / WORK ORDER**: Production order number prefixed by `(1T)`.
6. **2D DATAMATRIX / QR CODE**: Encodes concatenated ISO/IEC 15434 formatted string for high-speed automated sorting scanners.

---

## 4. Staged Implementation Plan

### Stage 1: Backend Packaging Service Hardening
- Extend `PackagingService.reconcileRun` to calculate tolerance drift percentages, discrepancy classification (`BALANCED`, `DEFICIT`, `SURPLUS`), and tolerance breach alerts.
- Add pallet aggregation summary endpoint / method to support multi-carton pallet consolidation.
- Author unit tests in `packaging.service.spec.ts` validating reconciliation calculations, tolerance thresholds, and pallet grouping.

### Stage 2: Barcode & Label Generation (`bwip-js`)
- Create `CartonLabelModal.tsx` in `frontend/src/components/packaging/`:
  - Renders industrial AIAG B-10 label with high-resolution Code 128 and 2D DataMatrix/QR canvas barcodes using `bwip-js`.
  - Supports format switching (Code 128 vs DataMatrix vs QR).
  - Implements clean CSS print rules (`@media print`) sized for 4" $\times$ 6" thermal label media.

### Stage 3: Touch Terminal HMI, USB HID Listener, & Scanner Simulator
- Build `useBarcodeScanner` hook in `frontend/src/hooks/useBarcodeScanner.ts` to capture physical USB/Bluetooth scanner inputs.
- Add on-screen **Scanner Simulator** drawer/modal for live testing without physical hardware.
- Upgrade `PackagingView.tsx`:
  - Integrate dynamic multi-segment Shot-to-Pack Reconciliation Gauge.
  - Add visual Pallet Staging & Capacity Progress card.
  - Implement Touchscreen Kiosk mode toggle with large touch buttons.
  - Add audio/visual confirmation cues on carton registration.

### Stage 4: Verification & Monorepo Health
- Verify unit tests across backend (`pnpm --filter backend test`).
- Verify monorepo linting (`pnpm lint`).
- Verify production builds (`pnpm --filter frontend build`, `pnpm --filter backend build`).
