# 002 — Align Monorepo Configuration

Tanggal: 2026-10-27

## Checklist

- [x] Sinkronisasi nama package menjadi `backend` dan `frontend`
- [x] Konfigurasi build SWC pada NestJS (`@swc/cli`, `@swc/core`, `nest-cli.json`)
- [x] Konfigurasi global prefix `/api` di backend dan Vite dev server proxy di frontend
- [x] Penambahan root tooling: `concurrently`, `.prettierrc` tunggal, `.editorconfig`, `.gitattributes`, `.npmrc`, `.env.example`
- [x] Konfigurasi `pnpm-workspace.yaml` dengan `onlyBuiltDependencies` & `allowBuilds`
- [x] Verifikasi build, lint, format, dan test

## Deskripsi Perubahan

Menyelaraskan konfigurasi monorepo dengan panduan standar MES:

1. Menambahkan root `.npmrc`, `.editorconfig`, `.gitattributes`, dan `.prettierrc` (menghapus `.prettierrc` lokal pada backend).
2. Memperbarui `pnpm-workspace.yaml` untuk mengizinkan native builds (`@swc/core`, `esbuild`, `bcrypt`, `@nestjs/core`).
3. Memperbarui skrip `package.json` di root dengan runner `concurrently` untuk `dev`, serta skrip build/lint/test/format.
4. Menambahkan compiler SWC pada NestJS backend untuk mempercepat build time.
5. Mengonfigurasi `app.setGlobalPrefix('api')` di `backend/src/main.ts` dan proxy `/api` pada `frontend/vite.config.ts` untuk komunikasi tanpa CORS saat development.

## Daftar File yang Diubah

- `.editorconfig` — add
- `.env.example` — add
- `.gitattributes` — add
- `.npmrc` — add
- `.prettierrc` — add
- `pnpm-workspace.yaml` — edit
- `package.json` — edit
- `pnpm-lock.yaml` — edit
- `backend/.prettierrc` — delete
- `backend/nest-cli.json` — edit
- `backend/package.json` — edit
- `backend/src/main.ts` — edit
- `frontend/package.json` — edit
- `frontend/vite.config.ts` — edit
- `.agent-knowledge/dynamic/reports/tasks/002-align-monorepo-configuration.md` — add

## Review

- Result: Seluruh konfigurasi monorepo selesai diselaraskan sesuai spesifikasi.
- Verification: `pnpm run build` berhasil mengompilasi backend dengan SWC dan frontend dengan Vite; `pnpm run lint` 0 errors; `pnpm run test` lulus.
- Follow-up: Siap untuk tahapan implementasi core domain MES.

## Verifikasi UAT (User Acceptance Test)

| #   | Tes                                                                | Hasil |
| --- | ------------------------------------------------------------------ | ----- |
| 1   | Eksekusi `pnpm install` dan persetujuan build native (`@swc/core`) | Lulus |
| 2   | Kompilasi SWC backend & bundling Vite frontend lewat `pnpm build`  | Lulus |
| 3   | Linter validation via `pnpm lint`                                  | Lulus |
| 4   | Unit test runner via `pnpm test`                                   | Lulus |
| 5   | Code formatting via `pnpm format`                                  | Lulus |
