# 013 — Refactor Navigation to Atlassian Sidebar

Date: 2026-10-28

## Checklist

- [x] Create Atlassian-style vertical `Sidebar.tsx` navigation component with collapsible state (`w-64` expanded, `w-16` icon rail).
- [x] Structure all 9 MES dashboard views into 5 nested accordion categories (Operations, Execution & routing, Quality & materials, Reliability & maintenance, Performance).
- [x] Create semantic top `Header.tsx` app bar containing breadcrumb navigation, `h1` semantic landmark, mobile hamburger toggle, live WebSocket latency pill, and role lozenge.
- [x] Provide mobile drawer overlay support with accessible backdrop dismiss and auto-close upon navigation.
- [x] Remove obsolete horizontal `Navbar.tsx` component and update `App.tsx` shell layout.
- [x] Verify WCAG AA accessibility, label associations, no micro-fonts (<12px), clean build, and 0 Oxlint warnings/errors.
- [x] Perform live browser verification with Playwright (desktop, mobile drawer, accordion toggle, view switching).

## Change Description

Refactored the frontend navigation architecture from the top horizontal navbar into an authentic Atlassian-style Sidebar navigation with nested accordion grouping.

1. **Nested Group Hierarchy:**
   - **Operations:** Shop floor matrix (`shopfloor`), Machine telemetry (`machines`)
   - **Execution & routing:** Orders & runs (`orders`), Packaging & reconciliation (`packaging`)
   - **Quality & materials:** Quality gates & first-piece (`quality`), Materials & genealogy (`materials`)
   - **Reliability & maintenance:** Tooling & mold PM (`maintenance`), Digital andon (`andon`)
   - **Performance:** OEE analytics (`oee`)

2. **Atlassian Design System Tokens & Typography:**
   - Active tab indicator: `bg-[#E9F2FE] text-[#1868DB] font-semibold border-l-2 border-[#1868DB]`
   - Inactive items: `text-[#505258] hover:text-[#292A2E] hover:bg-[#091E420F] font-medium`
   - Group headers: `text-xs font-bold text-[#6B6E76] uppercase tracking-wider` with expandable chevron indicators
   - Collapsible desktop state (`w-64` to `w-16` icon rail with full tooltip and accessible labels)
   - Integrated sidebar footer with live WebSocket status and demo user role selector

3. **Top Header & Mobile Drawer:**
   - Complementary Atlassian header bar (`h-14`) displaying breadcrumb (`Operations / Shop floor matrix`), level-1 heading, mobile menu toggle, and connection telemetry
   - Mobile responsive drawer (`< md`) with semi-transparent backdrop and smooth slide-in transition

## Modified Files

- `frontend/src/components/layout/Sidebar.tsx` — add (collapsible Atlassian sidebar navigation with nested accordion groups)
- `frontend/src/components/layout/Header.tsx` — add (breadcrumb app header with landmark h1, mobile hamburger, and status badges)
- `frontend/src/App.tsx` — edit (integrated Sidebar, Header, and responsive layout shell)
- `frontend/src/components/layout/Navbar.tsx` — delete (removed obsolete top horizontal navbar)

## Review

- Result: Frontend navigation completely transitioned to nested Atlassian vertical sidebar with desktop collapse and mobile drawer support.
- Verification: `pnpm lint` passed with 0 warnings and 0 errors across 138 files. `pnpm --filter frontend build` succeeded in 2.33s. Vitest backend test suite passed with 15/15 test suites and 71/71 tests passing. Playwright live browser automation verified desktop collapse, accordion expand/collapse, mobile viewport drawer toggle, and route switching without console errors.
- Follow-up: None

## UAT (User Acceptance Test) Verification

| # | Test | Result |
| --- | --- | --- |
| 1 | Render nested sidebar on desktop (256px wide) with 5 categories | Pass |
| 2 | Collapse sidebar to icon rail (64px wide) via toggle button | Pass |
| 3 | Expand and collapse nested accordion groups | Pass |
| 4 | Switch between views (Shop floor, Packaging, Quality, OEE, Andon) | Pass |
| 5 | Mobile responsive drawer toggling via hamburger icon and backdrop tap | Pass |
| 6 | Active view breadcrumb and level 1 heading in top header bar | Pass |
| 7 | Live WebSocket latency pill and role selector functionality | Pass |
