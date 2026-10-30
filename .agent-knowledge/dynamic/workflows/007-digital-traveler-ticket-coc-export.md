# Implementation Workflow 007: Digital Traveler Ticket, Electronic Batch Record (eBR), and Certificate of Conformance (CoC Export / Printable Barcode Labels)

**Status:** PROPOSED PLAN — READY FOR STAGED EXECUTION  
**Target Completion:** Phase 8 / Option 3 (Automotive IATF 16949 / ISO 13485 Auditable Electronic Batch Records, Cryptographic Release Sign-off, and Thermal Barcode Printing)  
**References:**
- Product Requirements: [PRD.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/.agent-knowledge/dynamic/docs/dev/PRD.md)
- System Architecture: [ARCHITECTURE.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/.agent-knowledge/dynamic/docs/dev/sdd/ARCHITECTURE.md)
- Database Specifications: [DATABASE.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/.agent-knowledge/dynamic/docs/dev/sdd/DATABASE.md)
- Design System Tokens: [DESIGN.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/DESIGN.md)
- Task Template: [TASKS-TEMPLATE.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/.agent-knowledge/static/templates/TASKS-TEMPLATE.md)

---

## 1. Executive Summary & Problem Statement

In precision plastics manufacturing (automotive suppliers under **IATF 16949**, medical devices under **ISO 13485**, and precision electronics under **ISO 9001**), producing a good plastic part is only half the requirement. Every manufactured carton and production lot must be accompanied by an immutable, auditable **Electronic Batch Record (eBR)** or **Digital Production Traveler**.

### Current Limitations:
1. **Scattered Silos**: Currently in the MES, production order data, resin lots, physical machine telemetry, first-piece QC inspections, and carton barcodes live in distinct database tables. There is no unified single pane of glass or traveler sheet that compiles an entire run's complete genealogy.
2. **Paper-Heavy Release Friction**: Quality managers typically compile manual paperwork (binder sheets, handwritten sign-offs) before releasing pallets for shipping, introducing clerical delay and potential transcription errors.
3. **Lack of Cryptographic Integrity**: Traditional paper traveler sheets lack tamper-evident digital verification. If machine parameters or scrap numbers are contested during customer audits, proving retroactive integrity is cumbersome.
4. **Missing Customer Shipping Documents**: Customers require an official **Certificate of Conformance (CoC)** certifying that the parts meet raw material specifications (RoHS, REACH, UL94) and drawing tolerances, as well as AIAG/Odette-compliant 4"x6" pallet/carton shipping labels.

### The Solution:
**Implementation Workflow 007** implements an end-to-end **Digital Traveler & CoC Engine**:
- Aggregates all production facets (Order info, Machine & Mold tooling, Material lot lineage, Telemetry process windows, First-piece and patrol QC tests, Carton barcode manifests) into a canonical **Electronic Batch Record (eBR)**.
- Provides a formal **QA Release Authority Sign-off** with cryptographic SHA-256 checksum stamping.
- Produces an executive, customer-ready **Certificate of Conformance (CoC)** and thermal-printable **4"x6" Shipping Barcode Labels** with clean CSS print optimization (`@media print`).

```text
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                      DIGITAL TRAVELER & CERTIFICATE OF CONFORMANCE ENGINE                              │
└───────────────────────────────────────────────────┬────────────────────────────────────────────────────┘
                                                    │
                 ┌──────────────────────────────────┴──────────────────────────────────┐
                 ▼                                                                     ▼
   ┌───────────────────────────┐                                         ┌───────────────────────────┐
   │ Relational Database State │                                         │ Machine Telemetry Stream  │
   │ • Production Orders & Runs│                                         │ • Average Injection Press │
   │ • Machine & Mold Tooling  │                                         │ • Barrel Heating Profile  │
   │ • Resin Lots & Genealogy  │                                         │ • Cushion Position Avg    │
   │ • QC First-Piece & Patrol │                                         │ • Cycle Time Distribution │
   │ • Serial Packaging Units  │                                         │ • Anomaly / Alarm Events  │
   └─────────────┬─────────────┘                                         └─────────────┬─────────────┘
                 │                                                                     │
                 └──────────────────────────────────┬──────────────────────────────────┘
                                                    │
                                                    ▼
                                     ┌─────────────────────────────┐
                                     │      TravelerService        │
                                     │  (backend/modules/traveler) │
                                     │  - Compile Composite eBR    │
                                     │  - Compute SHA-256 Digest   │
                                     │  - QA Release Sign-off Gate │
                                     │  - Generate CoC Data Object │
                                     └──────────────┬──────────────┘
                                                    │
        ┌───────────────────────────────────────────┴───────────────────────────────────────────┐
        ▼                                           ▼                                           ▼
 ┌───────────────┐                           ┌───────────────┐                           ┌───────────────┐
 │ Traveler Tab  │                           │  CoC Release  │                           │ Thermal Label │
 │ (eBR Sheet)   │                           │  Certificate  │                           │  (4"x6" Box)  │
 │ - Run Info    │                           │ - Material Std│                           │ - Code 128    │
 │ - Tool Specs  │                           │ - Drawing Rev │                           │ - 2D QR Code  │
 │ - Resin Chain │                           │ - QA Signature│                           │ - AIAG Layout │
 │ - QC Tolerances                           │ - SHA-256 Seal│                           │ - Print Ready │
 └───────────────┘                           └───────────────┘                           └───────────────┘
```

---

## 2. Technical Architecture & Data Model

### 2.1 Composite Electronic Batch Record (eBR) Schema

The digital traveler compiles data from across 6 domain entities into a unified JSON object:

```typescript
export interface DigitalTravelerRecord {
  runId: string;
  orderNumber: string;
  partNumber: string;
  partName: string;
  customerName?: string;
  drawingRevision?: string;
  
  // Equipment Context
  machineCode: string;
  machineTonnage: number;
  moldCode: string;
  cavityCount: number;
  
  // Timing & Quantities
  plannedQuantity: number;
  actualGoodQuantity: number;
  actualScrapQuantity: number;
  totalShots: number;
  runStatus: string;
  startTime: string;
  endTime?: string | null;
  durationHours: number;
  
  // Material Traceability Chain
  materials: {
    materialName: string;
    materialCode: string;
    lotNumber: string;
    supplierName: string;
    allocatedKg: number;
    consumedKg: number;
    loadedAt: string;
  }[];
  
  // Process Parameters Window (Telemetry Envelope)
  processParameters: {
    cycleTimeNominalSeconds: number;
    cycleTimeActualAvgSeconds: number;
    injectionPressureBarAvg: number;
    injectionPressureBarMax: number;
    cushionPositionMmAvg: number;
    barrelTemperaturesAvg: {
      zone1: number;
      zone2: number;
      zone3: number;
      zone4: number;
      nozzle?: number;
    };
    parameterComplianceStatus: 'IN_SPEC' | 'OUT_OF_SPEC' | 'WARNING';
  };
  
  // Quality & Inspection Signoffs
  qualityAudit: {
    firstPieceStatus: 'PENDING' | 'PASSED' | 'QUARANTINE' | 'REJECTED';
    firstPieceInspector?: string;
    firstPieceSignedAt?: string;
    inspectionPlanName?: string;
    checksRecorded: {
      checkType: string;
      recordedAt: string;
      inspector: string;
      disposition: string;
      itemsChecked: {
        characteristic: string;
        targetValue?: number;
        measuredValue?: number;
        toleranceMin?: number;
        toleranceMax?: number;
        status: 'PASS' | 'FAIL';
      }[];
    }[];
    scrapBreakdown: {
      defectReason: string;
      quantity: number;
      category: string;
    }[];
  };
  
  // Packaging & Carton Manifest
  packagingManifest: {
    totalUnitsPacked: number;
    partsPerUnit: number;
    totalPackedQuantity: number;
    shotToPackVariancePct: number;
    reconciliationStatus: 'BALANCED' | 'VARIANCE_WARNING';
    units: {
      id: string;
      barcode: string;
      palletId?: string;
      partCount: number;
      packedAt: string;
    }[];
  };
  
  // Cryptographic QA Release Stamp
  signoff: {
    status: 'DRAFT' | 'PENDING_REVIEW' | 'RELEASED' | 'QUARANTINED' | 'CONCESSION';
    signedBy?: string;
    signedByRole?: string;
    signedAt?: string;
    comments?: string;
    tamperProofHash?: string; // SHA-256 checksum over canonical batch payload
  };
}
```

### 2.2 Certificate of Conformance (CoC) Specifications

The Certificate of Conformance is a formal legal document verifying:
- **Batch Identity**: Part Number, Part Name, Production Run ID, PO Number, Ship Date.
- **Specification Compliance**: Standard (ASTM D4101 for PP, ASTM D3935 for PC/ABS), Customer Drawing Rev, Tolerance standard (DIN 16742 / ISO 20457).
- **Environmental & Chemical Directives**: RoHS 3 Directive (EU 2015/863), REACH (EC 1907/2006) SVHC compliance, Conflict Minerals declaration.
- **Dimensional Verification Summary**: Key critical-to-function (CTF) dimensions certified within engineering specification limits.
- **Authorized Digital Signature**: QA Director / Quality Release Officer sign-off stamp with cryptographic hash and verifiable timestamp.

### 2.3 Carton Shipping Label (AIAG / Odette Format)

Standard 4" x 6" (101.6mm x 152.4mm) thermal label layout:
- **Part Number (P)** with 1D Code 128 and large human-readable text.
- **Quantity (Q)** with barcode.
- **Purchase Order (K)** & **Serial Carton Number (S)** with barcode.
- **Material Lot (1T)**.
- **2D Data Matrix / QR Code** encoding full GS1-formatted string: `[)>*06:P<PART>:Q<QTY>:S<SERIAL>:1T<LOT>:K<PO>`.
- High-contrast black/white layout optimized for 203 DPI / 300 DPI thermal transfer printers.

---

## 3. Backend Architecture & API Contracts

### 3.1 Module Placement
Create a dedicated NestJS module: `backend/src/modules/traveler/`:
- `traveler.module.ts`: Imports `PrismaModule`, registers `TravelerService` and `TravelerController`.
- `traveler.controller.ts`: Exposes REST endpoints under `/api/v1/traveler`.
- `traveler.service.ts`: Implements eBR aggregation, cryptographic hash calculation, and signoff recording.
- `traveler.service.spec.ts`: Unit test suite verifying data compilation and SHA-256 integrity hashing.

### 3.2 REST API Endpoints

| Method | Endpoint | Description | Permissions |
|---|---|---|---|
| `GET` | `/api/v1/traveler/runs` | List all production runs with traveler release statuses | All authenticated roles |
| `GET` | `/api/v1/traveler/:runId` | Get full composite Electronic Batch Record for a specific run | All authenticated roles |
| `POST` | `/api/v1/traveler/:runId/signoff` | QA Inspector sign-off & release disposition | `QUALITY_INSPECTOR`, `PLANT_MANAGER`, `ADMIN` |
| `GET` | `/api/v1/traveler/:runId/coc` | Retrieve structured Certificate of Conformance metadata | All authenticated roles |

### 3.3 Cryptographic Tamper-Proof Hashing Algorithm
To guarantee audit compliance:
1. Canonicalize key run properties: `{ runId, orderNumber, goodQuantity, scrapQuantity, resinLots, firstPieceStatus, inspector, signoffTime }`.
2. Compute `crypto.createHash('sha256').update(JSON.stringify(canonicalPayload)).digest('hex')`.
3. Store the hash in `audit_logs` or traveler metadata. Any change to production counts or quality records post-signoff invalidates the hash.

---

## 4. Frontend Architecture & Atlassian Design UI

### 4.1 Navigation & Component Hierarchy

- **Sidebar Integration**:
  - Add navigation item under `Sidebar.tsx`:
    - `id: 'traveler'`
    - `label: 'Digital Traveler & CoC'`
    - `shortLabel: 'Traveler'`
    - `icon: FileCheck` (from `lucide-react`)
    - Placed in the **Quality & Compliance** navigation group.
- **Main View Component**:
  - `frontend/src/components/traveler/TravelerView.tsx`:
    - Header: Run dropdown selector, Run status badge, QA Release seal, Print button, Sign & Release button.
    - 3 Sub-Tabs:
      1. **Electronic Batch Record (eBR Traveler Sheet)**: Comprehensive 5-card audit report.
      2. **Certificate of Conformance (CoC)**: Official customer release certificate with seal.
      3. **Shipping Barcode Labels**: AIAG/Odette 4"x6" printable carton labels with QR/1D codes.
    - Modal: `SignTravelerModal.tsx` for QA release approval / rejection with notes and inspector name.

### 4.2 Styling & Atlassian Design System Tokens
Strictly adhere to [DESIGN.md](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/DESIGN.md):
- Typography: Clear hierarchy, minimum font size 12px (`text-xs`), bold metric callouts.
- Color Tokens:
  - Background Neutral: `#FFFFFF` and `#F8F8F8`.
  - Borders: `#0B120E24`.
  - Brand Accent: `#1868DB` (Primary Blue).
  - Success Release: `#E3FCEF` bg / `#006644` text (Atlassian Green).
  - Warning/Pending: `#FFF5DB` bg / `#9E4C00` text (Atlassian Orange).
  - Quarantined/Rejected: `#FFECEB` bg / `#C9372C` text (Atlassian Red).
- Print Media Query (`@media print`):
  - Hides sidebar, header, navigation controls, and action buttons.
  - Forces pure white background, page-break inside avoidance, and crisp vector typography suitable for paper archiving and PDF generation.

---

## 5. Staged Implementation Plan

### Stage 1: Backend Traveler Domain Module & Services
1. Create `backend/src/modules/traveler/dto/signoff-traveler.dto.ts`.
2. Create `backend/src/modules/traveler/traveler.service.ts`:
   - `getTravelerRuns()`: Query runs with order, machine, and QA signoff state.
   - `getDigitalTraveler(runId)`: Aggregates order, mold, materials, quality samples, telemetry metrics, and packaging units.
   - `signoffTraveler(runId, dto)`: Records inspector decision, generates SHA-256 signature hash.
   - `getCertificateOfConformance(runId)`: Builds formal compliance data structure.
3. Create `backend/src/modules/traveler/traveler.controller.ts`: Wire endpoints with NestJS validation pipes.
4. Create `backend/src/modules/traveler/traveler.module.ts`: Register in `AppModule`.
5. Run `pnpm lint` and verify 0 warnings/errors.

### Stage 2: Backend Unit Testing Suite
1. Create `backend/src/modules/traveler/traveler.service.spec.ts`.
2. Test scenarios:
   - Full composite eBR generation with material lineage and telemetry summaries.
   - SHA-256 tamper-evident hash calculation and repeatability.
   - QA Sign-off transitions (`RELEASED`, `QUARANTINED`, `CONCESSION`).
   - CoC document data assembly with customer drawing numbers.
3. Run `pnpm --filter backend test` and ensure all test suites pass.

### Stage 3: Frontend API & Type Definitions
1. Create `frontend/src/types/traveler.ts` defining `DigitalTravelerRecord`, `CoCData`, `SignoffDto`.
2. Update `frontend/src/services/api.ts` with:
   - `getTravelerRuns()`
   - `getDigitalTraveler(runId)`
   - `signoffTraveler(runId, dto)`
   - `getCertificateOfConformance(runId)`
3. Run `pnpm lint` on frontend.

### Stage 4: Frontend UI Components & Navigation
1. Update `frontend/src/components/layout/Sidebar.tsx` to add `'traveler'` tab in Quality & Compliance group.
2. Update `frontend/src/App.tsx` to mount `TravelerView` when `activeTab === 'traveler'`.
3. Create `frontend/src/components/traveler/TravelerView.tsx`:
   - Sub-tab 1: eBR Traveler Sheet with complete visual panels:
     - Run & Tooling Overview Card
     - Material Lineage Table
     - Process Window Telemetry Card (Pressures, cushion, zone heating)
     - Quality Gate & First-Piece Audit Card
     - Packaging & Pallet Serial Barcode Table
     - Cryptographic QA Release Stamp Card
   - Sub-tab 2: Certificate of Conformance (CoC) Letter with Official QA Seal
   - Sub-tab 3: 4"x6" Carton Shipping Label Generator with Barcode & QR Code
   - Interactive QA Release modal (`SignTravelerModal.tsx`)
4. Verify responsive design and Atlassian design system token conformance.

### Stage 5: Print & PDF Export Styling Optimization
1. Add dedicated `@media print` CSS utility classes in `frontend/src/index.css`.
2. Ensure `window.print()` outputs clean A4 / Letter pages for eBR and CoC, and 4x6 inch format for labels.
3. Hide sidebar, header, and button toolbars during print/PDF export.

### Stage 6: Monorepo Verification & Task Report
1. Run `pnpm lint` (`oxlint`) across backend and frontend (0 warnings, 0 errors).
2. Run `pnpm --filter backend test` (all unit test suites pass 100%).
3. Run `pnpm --filter frontend build` (`tsc -b && vite build` clean).
4. Run `pnpm --filter backend build` (`nest build` clean).
5. Author task report `.agent-knowledge/dynamic/reports/tasks/016-implement-phase-8-digital-traveler-and-coc.md`.
6. Commit and push to `origin/develop`.

---

## 6. Verification & Observability Matrix

| Verification Step | Command / Tool | Acceptance Criteria |
|---|---|---|
| **Linter Check** | `pnpm lint` | 0 errors, 0 warnings across monorepo |
| **Backend Unit Tests** | `pnpm --filter backend test` | 18+ suites passing, 100% assertions green |
| **Frontend Production Build** | `pnpm --filter frontend build` | Vite build succeeds with 0 type errors |
| **Backend Production Build** | `pnpm --filter backend build` | NestJS SWC builds clean distribution |
| **Traveler Compilation** | `GET /api/v1/traveler/:runId` | Returns complete composite eBR with materials, telemetry, QC, and packaging |
| **Cryptographic Signoff** | `POST /api/v1/traveler/:runId/signoff` | Generates 64-character SHA-256 tamper-evident verification hash |
| **Print / PDF Output** | `window.print()` / Print Preview | Cleans navigation chrome; prints pristine audit certificate and 4x6 label |
