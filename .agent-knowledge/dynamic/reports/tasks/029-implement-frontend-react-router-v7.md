# 029 — Implement Frontend React Router DOM v7 and Structured Pages

Date: 2026-10-30

## Checklist

- [x] Install `react-router-dom` in frontend (`pnpm --filter frontend add react-router-dom@7.18.5`)
- [x] Create `ShopfloorContext.tsx` to persist real-time WebSocket connection and shared state across routes
- [x] Create `AppLayout.tsx` as the persistent application shell (Sidebar, Header, Andon Banner, Outlet, Modals)
- [x] Create `ModulesHubPage.tsx` at root route (`/`) as the central portal with categorized Call-to-Action (CTA) launchers
- [x] Assign dedicated route `/shopfloor` to `ShopFloorPage.tsx`
- [x] Create all 13 modular pages under `frontend/src/pages/` and custom 404 `NotFoundPage.tsx`
- [x] Refactor `Sidebar.tsx` and `Header.tsx` to use URL-based navigation and route detection
- [x] Refactor `App.tsx` to declare the router tree using `<BrowserRouter>` and `<Routes>`
- [x] Verify lint (`oxlint`), frontend build (`tsc -b && vite build`), and backend tests (`vitest run`)
- [x] Verify browser back/forward, direct deep-linking, and 404 fallback
- [x] Await user permission before git commit or push (per `GIT.md` rules)

## Change Description

Migrating frontend navigation from in-memory state toggle to structured URL routing with React Router DOM v7 and adding an enterprise module directory at the root:
1. **Root Modules Directory & Command Hub (`/`):**
   - [`ModulesHubPage.tsx`](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/frontend/src/pages/ModulesHubPage.tsx) renders the executive plant overview, live telemetry KPIs bar (socket latency, connected machines, active production runs, and open Andon tickets), and 13 categorized Call-to-Action cards grouped into:
     - Operations & Ingestion
     - Quality Assurance & Material Traceability
     - Plant Reliability & Alerting
     - Performance Analytics & Governance
2. **Dedicated Shop Floor Route (`/shopfloor`):**
   - [`ShopFloorPage.tsx`](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/frontend/src/pages/ShopFloorPage.tsx) mapped to `/shopfloor` for direct operational access.
3. **Persistent WebSocket Context:**
   - [`ShopfloorContext.tsx`](file:///home/ughway/Debiancode/Myprojects/Manufacturing-Execution-System/frontend/src/context/ShopfloorContext.tsx) manages real-time telemetry streaming (`useTelemetrySocket`), simulator controls, and shared data so route navigation never disconnects the socket or interrupts data ingestion.
4. **Modular Page Architecture (`frontend/src/pages/`):**
   - Clean separation into `pages/`, `layouts/`, and `components/`.
   - 14 pages total (1 Root Directory + 13 Modules + 1 404 Not Found):
     - `/` (`ModulesHubPage` — Central Command Hub & CTA Launchers)
     - `/shopfloor` (`ShopFloorPage` — Live Shop Floor Matrix Grid)
     - `/machines` & `/machines/:code` (`MachineDetailPage` with deep linking)
     - `/orders` (`ProductionOrdersPage`)
     - `/scheduling` (`SchedulingPage`)
     - `/packaging` (`PackagingPage`)
     - `/quality` (`QualityPage`)
     - `/traveler` (`TravelerPage`)
     - `/materials` (`MaterialsPage`)
     - `/maintenance` (`MaintenancePage`)
     - `/andon` (`AndonBoardPage`)
     - `/oee` (`OeeAnalyticsPage`)
     - `/analytics` (`AnalyticsPage`)
     - `/admin` (`AdminPage`)
     - `*` (`NotFoundPage` with HTTP 404 Atlassian design and back/home actions)

## Modified Files

- `frontend/package.json` — added `react-router-dom@^7.18.5`
- `pnpm-lock.yaml` — updated lockfile
- `frontend/src/context/ShopfloorContext.tsx` — created shared WebSocket & data context
- `frontend/src/layouts/AppLayout.tsx` — created persistent app layout shell
- `frontend/src/pages/ModulesHubPage.tsx` — created root hub page (`/`)
- `frontend/src/pages/ShopFloorPage.tsx` — created route `/shopfloor`
- `frontend/src/pages/MachineDetailPage.tsx` — created route `/machines` & `/machines/:code`
- `frontend/src/pages/ProductionOrdersPage.tsx` — created route `/orders`
- `frontend/src/pages/SchedulingPage.tsx` — created route `/scheduling`
- `frontend/src/pages/PackagingPage.tsx` — created route `/packaging`
- `frontend/src/pages/QualityPage.tsx` — created route `/quality`
- `frontend/src/pages/TravelerPage.tsx` — created route `/traveler`
- `frontend/src/pages/MaterialsPage.tsx` — created route `/materials`
- `frontend/src/pages/MaintenancePage.tsx` — created route `/maintenance`
- `frontend/src/pages/AndonBoardPage.tsx` — created route `/andon`
- `frontend/src/pages/OeeAnalyticsPage.tsx` — created route `/oee`
- `frontend/src/pages/AnalyticsPage.tsx` — created route `/analytics`
- `frontend/src/pages/AdminPage.tsx` — created route `/admin`
- `frontend/src/pages/NotFoundPage.tsx` — created route `*` (404 Not Found)
- `frontend/src/components/layout/Sidebar.tsx` — added `path` and `overview` to `NAV_GROUPS`
- `frontend/src/App.tsx` — configured `<BrowserRouter>` and nested `<Route>` structure

## Review

- Result: PASS
- Verification:
  - `pnpm lint`: 0 warnings, 0 errors across 230 files.
  - `pnpm --filter backend test`: 28 test suites, 156 tests passed (100%).
  - `pnpm --filter frontend build`: `tsc -b && vite build` built in 4.11s with zero errors.
- Follow-up: Strictly preserve non-destructive git policy (await user authorization before commit/push).

## UAT (User Acceptance Test) Verification

| # | Test | Result |
| --- | --- | --- |
| 1 | Root page (`/`) displays executive portal with real-time stats and CTAs | PASS |
| 2 | Direct URL navigation to `/shopfloor` opens Shop Floor Matrix | PASS |
| 3 | Deep-linking to specific machine (`/machines/:code` e.g. `/machines/IMM-03`) | PASS |
| 4 | Page refresh (F5) re-hydrates active route without 404 | PASS |
| 5 | Browser back and forward history buttons navigate pages | PASS |
| 6 | Persistent WebSocket maintains live telemetry during route changes | PASS |
| 7 | Unknown URL renders Atlassian-styled 404 page with return links | PASS |
