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
- [x] Verified full production bundle build with `vite build` and end-to-end browser verification

## Deskripsi Perubahan

Comprehensive UI refactoring to enforce strict conformance with `DESIGN.md`:
1. Eliminates dark canvas (`bg-slate-950`) and dark container surfaces. Employs light canvas `surface: #FFFFFF` and sunken wells `#F8F8F8`.
2. Standardizes typography to Atlassian Sans with sentence case across all navigation, buttons, titles, and table headers.
3. Implements Atlassian semantic buttons: Primary (`#1868DB`), Default (`#091E420F`), Subtle, Warning (`#FBC828`), and Danger (`#C9372C`).
4. Replaces ad-hoc cyan-purple-neon gradient fills with canonical Atlassian data visualization colors (`#1868DB`, `#22A06B`, `#803FA5`, `#206A83`, `#C9372C`, `#E06C00`).
5. Standardizes form inputs, select elements, textareas, and error callouts per Atlassian `textfield-standard` and `section-message` specifications.

## Daftar File yang Diubah

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

- Result: Selesai. Seluruh antarmuka frontend telah diselaraskan 100% dengan panduan `DESIGN.md`.
- Verification: Oxlint monorepo linting (0 errors, 0 warnings across 104 files), TypeScript compilation, production build, dan pengujian browser visual Playwright.
- Follow-up: Tidak ada.

## Verifikasi UAT (User Acceptance Test)

| # | Tes | Hasil |
| --- | --- | --- |
| 1 | Full monorepo linting via `pnpm lint` (Oxlint) | Lulus (0 errors, 0 warnings) |
| 2 | Production build via `pnpm --filter frontend build` | Lulus (Vite bundle built in <2.5s) |
| 3 | Outer canvas light surface verification (`#FFFFFF`) | Lulus |
| 4 | Semantic Lozenges visible border verification per `DESIGN.md` | Lulus |
| 5 | Sentence case verification across buttons, tabs, headers, and labels | Lulus |
| 6 | Interactive navigation across all 5 views in browser | Lulus |
