# 001 — Setup pnpm Monorepo

Tanggal: 2026-10-27

## Checklist

- [x] Inisialisasi struktur pnpm monorepo workspace (`pnpm-workspace.yaml`, root `package.json`)
- [x] Konfigurasi scoped package names (`@mes/backend` dan `@mes/frontend`)
- [x] Penyatuan lockfile (`pnpm-lock.yaml`) di root dan pembersihan legacy nested `.git` serta local lockfiles
- [x] Penyelarasan `.gitignore` monorepo
- [x] Verifikasi build, lint, dan test di seluruh workspace

## Deskripsi Perubahan

Mengonfigurasi repository menjadi pnpm monorepo terpadu dengan workspace root yang menaungi backend (NestJS) dan frontend (React + Vite). Menghapus nested git repository pada `backend/`, menyatukan dependency resolution ke single `pnpm-lock.yaml` di root, menambahkan skrip eksekusi monorepo (`build`, `lint`, `test`, `dev:*`), serta memperbarui living documentation `TECHNOLOGYSTACK.md`.

## Daftar File yang Diubah

- `pnpm-workspace.yaml` — add
- `package.json` — add
- `.gitignore` — edit
- `backend/package.json` — edit
- `frontend/package.json` — edit
- `backend/pnpm-lock.yaml` — delete
- `frontend/pnpm-lock.yaml` — delete
- `backend/.git` — delete
- `pnpm-lock.yaml` — add
- `.agent-knowledge/dynamic/docs/dev/sdd/TECHNOLOGYSTACK.md` — edit
- `.agent-knowledge/dynamic/reports/tasks/001-setup-pnpm-monorepo.md` — add

## Review

- Result: Monorepo pnpm berhasil disiapkan dan beroperasi penuh.
- Verification: Eksekusi `pnpm run build` berhasil pada kedua package, `pnpm run lint` lulus 0 error/0 warning, `pnpm run test` lulus 1/1 test file.
- Follow-up: Melanjutkan perancangan arsitektur domain MES ISA-95 / ISO 22400 dan implementasi core service.

## Verifikasi UAT (User Acceptance Test)

| # | Tes | Hasil |
| --- | --- | --- |
| 1 | Resolusi dependency workspace lewat `pnpm install` | Lulus |
| 2 | Kompilasi seluruh workspace via `pnpm run build` | Lulus |
| 3 | Static analysis linter seluruh workspace via `pnpm run lint` | Lulus |
| 4 | Eksekusi test suite via `pnpm run test` | Lulus |
