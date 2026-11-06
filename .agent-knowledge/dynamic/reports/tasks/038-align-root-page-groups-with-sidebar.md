# 038 — Align Root Page Groups with Sidebar Navigation

Date: 2026-11-02

## Checklist

- [x] Restructure `ModulesHubPage.tsx` root categories from legacy 4 groups to exact 6 groups defined in `Sidebar.tsx`:
  - Operations & Ingestion (`shopfloor`, `machines`)
  - Execution & Packing (`orders`, `packaging`)
  - Traceability & Materials (`traveler`, `materials`)
  - Plant Alerting (`andon`)
  - Performance & Engineering (`oee`, `analytics`)
  - Governance & Integration (`integrations`, `iam`, `admin`)
- [x] Implement adaptive symmetric grid layout (`grid-cols-1 md:grid-cols-2` for 2-item categories, `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` for 3-item categories) to eliminate empty desktop column gaps.
- [x] Add live Escalation Status panel alongside single Andon card in Plant Alerting section for symmetric visual balance.
- [x] Integrate instant search input and quick category filter tabs matching sidebar domains with live module counters.
- [x] Wrap module cards in native accessible `<Link>` tags from React Router to enable card-wide clickability, keyboard navigation, and valid semantic markup.
- [x] Verify Oxlint (0 warnings, 0 errors) and TypeScript compiler typecheck (`tsc --project frontend/tsconfig.app.json --noEmit`).

## Change Description

Aligned the root command hub directory ([`ModulesHubPage.tsx`](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/frontend/src/pages/ModulesHubPage.tsx)) with the Atlassian sidebar navigation architecture ([`Sidebar.tsx`](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/frontend/src/components/layout/Sidebar.tsx)):

1. **Category Group Realignment:**
   - Replaced previously merged categories with the 6 functional domains from `NAV_GROUPS`:
     1. **Operations & Ingestion:** Shop Floor Matrix (`/shopfloor`), Machine Telemetry & Edge Controls (`/machines`).
     2. **Execution & Packing:** Production Orders & Runs (`/orders`), Packaging & Reconciliation (`/packaging`).
     3. **Traceability & Materials:** Digital Traveler & CoC (`/traveler`), Materials & Lot Consumption (`/materials`).
     4. **Plant Alerting:** Digital Andon Board (`/andon`).
     5. **Performance & Engineering:** OEE Fleet Analytics (`/oee`), SPC & FMEA Analytics (`/analytics`).
     6. **Governance & Integration:** External Integration Hub (`/integrations`), Hierarchical IAM & Scopes (`/iam`), User Admin & Audit Log (`/admin`).

2. **Visual & Layout Polishing:**
   - **Adaptive Grid Structure:** Eliminates awkward empty slots on wide screens by tailoring grid columns to group capacity (`md:grid-cols-2` for 2-module groups, `lg:grid-cols-3` for 3-module groups).
   - **Plant Alerting Live Status Panel:** Paired the single Andon card with a live Escalation Status widget that displays open tickets and priority breakdown or "All Clear" nominal operational status.
   - **Domain Header Accents:** Each category section now features domain icons, title, description, and module count pill badges.
   - **Interactive Filtering & Search:** Added a real-time module search bar and filter chips with count pills for rapid navigation across all 12 modules.
   - **Accessibility & Card Clickability:** Replaced inner nested button actions with standard React Router `<Link>` wrappers supporting keyboard navigation (Enter/Space), screen reader landmarks, and hover elevation.

## Modified Files

- `frontend/src/pages/ModulesHubPage.tsx` — edit (realigned categories, adaptive grid, search/filter toolbar, and accessible link cards)
- `.agent-knowledge/dynamic/reports/tasks/038-align-root-page-groups-with-sidebar.md` — add (task execution and verification record)

## Review

- Result: Root directory page (`/`) categories and module ordering now match the Sidebar 1-to-1 with enhanced responsive layout and filtering.
- Verification: Oxlint completed with 0 warnings and 0 errors. TypeScript type check passed with exit code 0 (`tsc --project frontend/tsconfig.app.json --noEmit`).
- Follow-up: None

## UAT (User Acceptance Test) Verification

| # | Test | Result |
| --- | --- | --- |
| 1 | Category headers on root page match the 6 Sidebar navigation groups | Pass |
| 2 | Module cards placed in correct groups matching sidebar hierarchy | Pass |
| 3 | Responsive grid layout eliminates empty holes in 2-card and 3-card categories | Pass |
| 4 | Search input filters modules in real time by title, description, and tag | Pass |
| 5 | Filter chips filter categories and display module counts correctly | Pass |
| 6 | Entire module cards are clickable and navigate to corresponding routes | Pass |
