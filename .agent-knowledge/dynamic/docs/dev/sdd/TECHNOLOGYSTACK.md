# Technology Stack — Manufacturing Execution System (MES)

> **Output:** `.agent-knowledge/dynamic/docs/dev/sdd/TECHNOLOGYSTACK.md`
> **Purpose:** Daftar kanonis teknologi, versi, dan perannya dalam sistem.

| Layer | Technology | Version | Role |
|-------|------------|---------|------|
| Workspace / Monorepo | pnpm Workspaces | 12.6.0 | Workspace management, shared package dependency resolution, unified lockfile |
| Runtime | Node.js | ^24.0.0 | JavaScript/TypeScript server & build runtime |
| Backend Framework | NestJS | ^12.0.1 | Industrial MES core services, API controllers, dependency injection |
| Frontend Library | React | ^19.3.1 | Web HMI / Operations dashboard UI |
| Frontend Build Tool | Vite | ^8.3.4 | Development server and production bundling |
| Language | TypeScript | ~6.0.2 | End-to-end static type safety |
| Testing (Backend) | Vitest | ^4.1.2 | Unit, integration, and property-based test runner |
| Linter (Backend) | Oxlint | ^1.58.0 | High-performance type-aware TypeScript linter |
| Linter (Frontend) | ESLint | ^10.13.0 | React/DOM linting and rule validation |
| Code Formatter | Prettier | ^3.4.2 | Code style formatting across monorepo |
