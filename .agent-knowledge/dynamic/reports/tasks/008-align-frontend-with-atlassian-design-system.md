# 008 — Align Frontend UI with Atlassian DESIGN.md Specifications

Tanggal: 2026-10-28

## Checklist

- [x] Refactored outermost application canvas from dark slate to Atlassian light surface (`#FFFFFF`) with neutral body copy (`#292A2E`)
- [x] Aligned `StatusBadge` with authentic Atlassian semantic Lozenges (visible 1px border, 3px corner radius, sentence case)
- [x] Refactored `Modal` to Atlassian Dialog overlay (`#FFFFFF` background, `#0B120E24` hairline border, `rounded-xl`, subtle close button)
- [x] Refactored `Navbar` to clean white canvas with 2px brand underline active tab indicator and Atlassian role selector
- [x] Refactored `AndonTopBanner` to Atlassian SectionMessage pattern (`#FFECEB` background, `#E2483D` border, neutral body copy)
- [x] Refactored `MachineCard` and `ShopFloorGrid` with white card surface, `#F8F8F8` sunken wells, and Atlassian buttons
- [x] Refactored Machine Detail Console (`MachineDetailView`, `CyclePhaseBar`, `TelemetryGauges`, `BarrelHeatingZones`, `ScenarioControlPanel`)
- [x] Refactored Production Execution & Modals (`ProductionOrdersView`, `CreateOrderModal`, `RecordScrapModal`)
- [x] Refactored ISO 22400-2 OEE Analytics (`OeeAnalyticsView`, `OeeScorecards`, `MultiMachineOeeChart`, `DowntimeParetoChart`)
- [x] Refactored Digital Andon Kanban Board (`AndonBoardView`, `CreateAndonModal`, `ResolveAndonModal`)
- [x] Migrated linting to Oxlint, verified 0 errors and 0 warnings on all 31 frontend files
- [x] Executed Impeccable Design System audit and resolved all 5 recommended actions
- [x] Normalized typography to the Atlassian type ramp floor (`text-xs` / 0.75rem / 12px), eliminating off-ramp literal micro-fonts (`text-[9px]`, `text-[10px]`, `text-[11px]`)
- [x] Established top-level accessible `<h1>` semantic landmarks across all dashboard views
- [x] Implemented intentional `@media (prefers-reduced-motion: reduce)` rules preserving state visibility while silencing continuous motion
- [x] Enlarged secondary simulator and filter interactive targets to meet `>=32px` touch target threshold
- [x] Optimized computation of multi-machine fleet metrics using `useMemo`
- [x] Removed dead `App.css` asset and normalized modal backdrop to `#050c1f75`
- [x] Verified 0 mechanical detector antipatterns via Impeccable detector and completed clean production build

## Deskripsi Perubahan

Comprehensive UI refactoring to enforce strict conformance with `DESIGN.md`:
1. Eliminates dark canvas (`bg-slate-950`) and dark container surfaces. Employs light canvas `surface: #FFFFFF` and sunken wells `#F8F8F8`.
2. Standardizes typography to Atlassian Sans with sentence case across all navigation, buttons, titles, and table headers.
3. Implements Atlassian semantic buttons: Primary (`#1868DB`), Default (`#091E420F`), Subtle, Warning (`#FBC828`), and Danger (`#C9372C`).
4. Replaces ad-hoc cyan-purple-neon gradient fills with canonical Atlassian data visualization colors (`#1868DB`, `#22A06B`, `#803FA5`, `#206A83`, `#C9372C`, `#E06C00`).
5. Standardizes form inputs, select elements, textareas, and error callouts per Atlassian `textfield-standard` and `section-message` specifications.

## Daftar File yang Diubah

- `frontend/src/App.css` — delete
- `frontend/src/index.css` — edit
- `frontend/src/App.tsx` — edit
- `frontend/src/components/common/StatusBadge.tsx` — edit
- `frontend/src/components/common/Modal.tsx` — edit
- `frontend/src/components/layout/Navbar.tsx` — edit
- `frontend/src/components/layout/AndonTopBanner.tsx` — edit
- `frontend/src/components/machines/MachineCard.tsx` — edit
- `frontend/src/components/machines/ShopFloorGrid.tsx` — edit
- `frontend/src/components/machines/detail/MachineDetailView.tsx` — edit
- `frontend/src/components/machines/detail/CyclePhaseBar.tsx` — edit
- `frontend/src/components/machines/detail/TelemetryGauges.tsx` — edit
- `frontend/src/components/machines/detail/BarrelHeatingZones.tsx` — edit
- `frontend/src/components/machines/detail/ScenarioControlPanel.tsx` — edit
- `frontend/src/components/production/ProductionOrdersView.tsx` — edit
- `frontend/src/components/production/CreateOrderModal.tsx` — edit
- `frontend/src/components/production/RecordScrapModal.tsx` — edit
- `frontend/src/components/oee/OeeAnalyticsView.tsx` — edit
- `frontend/src/components/oee/OeeScorecards.tsx` — edit
- `frontend/src/components/oee/MultiMachineOeeChart.tsx` — edit
- `frontend/src/components/oee/DowntimeParetoChart.tsx` — edit
- `frontend/src/components/andon/AndonBoardView.tsx` — edit
- `frontend/src/components/andon/CreateAndonModal.tsx` — edit
- `frontend/src/components/andon/ResolveAndonModal.tsx` — edit
- `.agent-knowledge/dynamic/reports/LESSON.md` — edit

## Review

- Result: Selesai. Seluruh antarmuka frontend telah diselaraskan 100% dengan panduan `DESIGN.md` dan lulus audit Impeccable Design System dengan 0 antipattern.
- Verification: Impeccable mechanical detector (0 antipatterns), Oxlint monorepo linting (0 errors, 0 warnings across all files), TypeScript compilation (`tsc -b`), production build (`vite build`), dan pengujian browser visual Playwright di seluruh tab.
- Follow-up: Tidak ada.

## Verifikasi UAT (User Acceptance Test)

| # | Tes | Hasil |
| --- | --- | --- |
| 1 | Full monorepo linting via `pnpm lint` (Oxlint) | Lulus (0 errors, 0 warnings) |
| 2 | Production build via `pnpm --filter frontend build` | Lulus (Vite bundle built cleanly) |
| 3 | Impeccable mechanical detector scan (`impeccable detect --json`) | Lulus (0 antipatterns detected) |
| 4 | Outer canvas light surface verification (`#FFFFFF`) | Lulus |
| 5 | Semantic Lozenges visible border verification per `DESIGN.md` | Lulus |
| 6 | Sentence case verification across buttons, tabs, headers, and labels | Lulus |
| 7 | Typography scale floor verification (all labels at or above `text-xs`) | Lulus |
| 8 | Reduced motion rule implementation (`@media (prefers-reduced-motion: reduce)`) | Lulus |
| 9 | Interactive navigation across all 5 views in browser | Lulus |
