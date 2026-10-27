# 004 — Implement Phase 1 Foundation & Master Data Baseline

Tanggal: 2026-10-27

## Checklist

- [x] Create root `docker-compose.yml` with Microsoft SQL Server 2022 container (`mes-mssql`)
- [x] Configure environment variables (`.env`, `backend/.env`, and `.env.example`)
- [x] Install backend dependencies (`@prisma/client`, `prisma`, `bcrypt`, `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `class-validator`, `class-transformer`, `tsx`, `@swc/cli`, `@swc/core`)
- [x] Configure `schema.prisma` with Phase 1 models and SQL Server referential actions (`NoAction` / `Cascade`)
- [x] Execute Prisma baseline migration `init_foundation` onto `MES_DB`
- [x] Create and execute seed script `backend/prisma/seed.ts` (9 canonical roles, default admin user, Plant 01, 4 operational areas, 10 virtual injection molding machines `IMM-01` to `IMM-10`, 3 products, 3 molds, compatibility matrix, and 7 standard downtime reasons)
- [x] Create `PrismaService` and `PrismaModule` with connection validation
- [x] Implement global exception filter (`AllExceptionsFilter`), logging interceptor (`LoggingInterceptor`), custom decorators (`@Roles`, `@CurrentUser`), and authorization guards (`JwtAuthGuard`, `RolesGuard`)
- [x] Implement `AuthModule` with stateless JWT authentication, password hashing (`bcrypt`), and `/api/v1/auth/login` and `/api/v1/auth/me` endpoints
- [x] Implement `MasterDataModule` with REST controllers and services for Plants, Areas, Machines, Products, and Molds
- [x] Implement `AuditModule` with `AuditService` recording audit trails into `audit_logs`
- [x] Wire `AppModule` and configure `main.ts` with global validation pipes, exception filters, BigInt JSON serializer, and `/api/v1` global prefix
- [x] Implement unit test suite (`AuthService`, `MachinesService`, `RolesGuard`) with 100% pass rate
- [x] Implement E2E test suite (`auth-and-master-data.e2e-spec.ts`) validating login, profile inspection, RBAC 403 enforcement, and retrieval of 10 virtual machines
- [x] Pass static analysis (`oxlint`, `eslint`) and monorepo build (`pnpm build`)

## Deskripsi Perubahan

Menjalankan implementasi teknis Tahap 1 (Phase 1: Foundation & Master Data Baseline) sesuai workflow `001-phase-1-foundation.md`:

1. Menyiapkan kontainer Microsoft SQL Server 2022 (`docker-compose.yml`) dengan volume persisten `mssql_data` dan port 1433 teruji sehat.
2. Memodelkan relasi database pada `backend/prisma/schema.prisma` untuk entitas pengguna, peran, pabrik, area produksi, 10 mesin virtual IMM, produk, cetakan (mold), kompatibilitas siklus ideal, dan log audit.
3. Menyusun seeder deterministik (`backend/prisma/seed.ts`) yang mengisi seluruh data dasar pabrik injeksi molding dan 10 mesin virtual dengan proyeksi status awal `IDLE`.
4. Mengimplementasikan autentikasi JWT stateless, strategi paspor, guard otorisasi berbasis peran (RBAC), serta modul master data lengkap (`Plants`, `Areas`, `Machines`, `Products`, `Molds`).
5. Mengintegrasikan penanganan BigInt pada serialisasi JSON, filter pengecualian global, dan interceptor pencatatan waktu respons HTTP.
6. Memverifikasi seluruh kode dengan pengujian unit (14 tes) dan pengujian integrasi E2E (12 tes), serta build monorepo bersih tanpa peringatan linter.

## Daftar File yang Diubah

- `docker-compose.yml` — add
- `.env.example` — edit
- `.env` — add
- `backend/.env` — add
- `backend/package.json` — edit
- `pnpm-workspace.yaml` — edit
- `backend/prisma/schema.prisma` — add
- `backend/prisma/migrations/20261027162637_init_foundation/migration.sql` — add
- `backend/prisma/seed.ts` — add
- `backend/src/database/prisma.service.ts` — add
- `backend/src/database/prisma.module.ts` — add
- `backend/src/common/enums/role.enum.ts` — add
- `backend/src/common/decorators/roles.decorator.ts` — add
- `backend/src/common/decorators/current-user.decorator.ts` — add
- `backend/src/common/guards/jwt-auth.guard.ts` — add
- `backend/src/common/guards/roles.guard.ts` — add
- `backend/src/common/guards/roles.guard.spec.ts` — add
- `backend/src/common/filters/all-exceptions.filter.ts` — add
- `backend/src/common/interceptors/logging.interceptor.ts` — add
- `backend/src/modules/auth/dto/login.dto.ts` — add
- `backend/src/modules/auth/jwt.strategy.ts` — add
- `backend/src/modules/auth/auth.service.ts` — add
- `backend/src/modules/auth/auth.controller.ts` — add
- `backend/src/modules/auth/auth.module.ts` — add
- `backend/src/modules/auth/auth.service.spec.ts` — add
- `backend/src/modules/master-data/dto/create-plant.dto.ts` — add
- `backend/src/modules/master-data/services/plants.service.ts` — add
- `backend/src/modules/master-data/plants.controller.ts` — add
- `backend/src/modules/master-data/services/areas.service.ts` — add
- `backend/src/modules/master-data/areas.controller.ts` — add
- `backend/src/modules/master-data/services/machines.service.ts` — add
- `backend/src/modules/master-data/services/machines.service.spec.ts` — add
- `backend/src/modules/master-data/machines.controller.ts` — add
- `backend/src/modules/master-data/services/products.service.ts` — add
- `backend/src/modules/master-data/products.controller.ts` — add
- `backend/src/modules/master-data/services/molds.service.ts` — add
- `backend/src/modules/master-data/molds.controller.ts` — add
- `backend/src/modules/master-data/master-data.module.ts` — add
- `backend/src/modules/audit/audit.service.ts` — add
- `backend/src/modules/audit/audit.module.ts` — add
- `backend/src/app.module.ts` — edit
- `backend/src/main.ts` — edit
- `backend/test/auth-and-master-data.e2e-spec.ts` — add
- `.agent-knowledge/dynamic/reports/tasks/004-implement-phase-1-foundation.md` — add

## Review

- Result: Fondasi arsitektur dan API Master Data Tahap 1 selesai diimplementasikan, terhubung ke MS SQL Server 2022, ter-seeding dengan 10 mesin virtual, serta terlindungi autentikasi JWT dan otorisasi RBAC.
- Verification: 14/14 unit test lulus (`pnpm test`), 12/12 E2E test lulus (`pnpm test:e2e`), static analysis 0 warning / 0 error (`oxlint`), dan build monorepo lulus (`pnpm build`).
- Follow-up: Melanjutkan ke Tahap 2 (Phase 2 / Workflow 002: Multi-Machine Simulator & Telemetry Ingestion Engine).

## Verifikasi UAT (User Acceptance Test)

| #   | Tes                                                                                                          | Hasil |
| --- | ------------------------------------------------------------------------------------------------------------ | ----- |
| 1   | Menjalankan MS SQL Server 2022 via Docker Compose dan memverifikasi koneksi database                         | Lulus |
| 2   | Menjalankan Prisma migration `init_foundation` dan memeriksa struktur tabel pada SQL Server                  | Lulus |
| 3   | Menjalankan seeder `backend/prisma/seed.ts` (9 peran, default admin, Plant 01, 4 area, 10 mesin IMM)        | Lulus |
| 4   | Otentikasi POST `/api/v1/auth/login` berhasil dengan kredensial admin dan gagal dengan 401 jika salah         | Lulus |
| 5   | Akses profil GET `/api/v1/auth/me` menolak tanpa token (401) dan menerima dengan Bearer token (200)          | Lulus |
| 6   | Penegakan RBAC: peran Operator ditolak HTTP 403 saat memanggil mutasi master data                            | Lulus |
| 7   | Pengambilan master data GET `/api/v1/machines` mengembalikan 10 mesin virtual lengkap dengan status `IDLE`    | Lulus |
| 8   | Pengambilan master data Plants, Areas, Products, dan Molds mengembalikan relasi data yang valid              | Lulus |
| 9   | `pnpm test` (Unit test) dan `pnpm test:e2e` (E2E test) berjalan dengan rasio kelulusan 100%                 | Lulus |
| 10  | `pnpm lint` dan `pnpm build` menyelesaikan kompilasi tanpa kesalahan                                         | Lulus |
