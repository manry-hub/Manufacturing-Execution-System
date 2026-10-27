# 006 — Implement Phase 3 Production Execution, ISO 22400-2 OEE Engine & Digital Andon

Tanggal: 2026-10-28

## Checklist

- [x] Implement `OrdersService` and `ProductionOrder` lifecycle (`DRAFT` ──► `RELEASED` ──► `IN_PROGRESS` ──► `COMPLETED`)
- [x] Implement `RunsService` with machine dispatching, mold compatibility validation, and active run binding in `machine_current_states`
- [x] Hook real-time cycle telemetry into active runs for automatic `totalShots` accumulation and cavity multiplier part calculations
- [x] Implement scrap and defect recording API (`recordScrap`) dynamically adjusting run yield
- [x] Implement `ProductionController` for order and run management
- [x] Implement pure `OeeCalculator` with ISO 22400-2 mathematical formulas (Availability, Performance, Quality, OEE), Zero Temporal Leakage, division by zero guards, and weighted aggregation
- [x] Implement `OeeService` supporting `RUN`, `SHIFT`, and `DAY` evaluation windows with persistence in `oee_results`
- [x] Implement `OeeController` (`/machines/:id`, `/plant`, `/runs/:runId`)
- [x] Implement `AndonService` with automated ticket creation on `FAULT_STARTED` alarms and manual operator ticketing
- [x] Implement Andon ticket lifecycle transitions (`OPEN` ──► `ACKNOWLEDGED` ──► `RESOLVED` with root cause & corrective action)
- [x] Implement MTTR analytics (response and resolution times) and downtime Pareto 80/20 distribution
- [x] Implement `AndonController` with ticket workflow and analytics endpoints
- [x] Wire `ProductionModule`, `OeeModule`, and `AndonModule` into `AppModule`
- [x] Write and verify unit test suites (`oee-calculator.spec.ts`, `orders.service.spec.ts`, `runs.service.spec.ts`, `andon.service.spec.ts`) with 100% pass rate (53/53 tests passing)
- [x] Write and verify end-to-end integration test suite (`production-oee-andon.e2e-spec.ts`) covering order-to-run execution, scrap logging, ISO OEE calculation, automated Andon, resolution, and Pareto analytics (37/37 tests passing)
- [x] Verify static analysis (`oxlint`, `eslint`) with 0 errors / 0 warnings and monorepo build (`pnpm build`)

## Deskripsi Perubahan

Menjalankan implementasi teknis Tahap 3 (Phase 3: Production Execution, ISO 22400-2 OEE Engine & Digital Andon) sesuai workflow `003-production-execution-oee-andon.md`:

1. Mengembangkan modul `Production` yang mengelola siklus hidup *Production Order* dan *Production Run*, validasi kompatibilitas cetakan injeksi (*Mold*), serta pengikatan run aktif ke proyeksi status mesin `MachineCurrentState`.
2. Menghubungkan *event stream* telemetri ke run aktif: setiap event `CYCLE_COMPLETED` secara otomatis menambah jumlah tembakan (*totalShots*) dan menghitung part selesai berdasarkan pengali rongga cetakan (*cavity count*).
3. Mengembangkan kalkulator OEE murni (`OeeCalculator`) berbasis standar internasional ISO 22400-2 dengan kepatuhan invarian *Zero Temporal Leakage*, penanganan pembagian nol yang aman, deteksi peringatan *Speed Over Performance*, serta rumus agregasi berbobot (*weighted aggregation*) multi-mesin yang menolak rata-rata aritmatika sederhana.
4. Mengembangkan modul `Oee` yang mengevaluasi segmen waktu riil dan historis untuk jendela kalkulasi `RUN`, `SHIFT` (8 jam bergulir), dan `DAY` (24 jam) serta menyimpan snapshot pada tabel `oee_results`.
5. Mengembangkan modul `Andon` yang secara otomatis menerbitkan tiket Andon saat terjadi alarm gangguan mesin (`FAULT_STARTED`), mengelola alur kerja tiket (`OPEN` -> `ACKNOWLEDGED` -> `RESOLVED`), menghitung metrik durasi MTTR respon dan resolusi, serta menyusun grafik Pareto 80/20 penyebab downtime.
6. Memverifikasi seluruh logika melalui 53 unit test dan 37 integration E2E test dengan kelulusan 100%, serta kompilasi monorepo bersih tanpa peringatan linter.

## Daftar File yang Diubah

- `backend/src/modules/production/dto/create-production-order.dto.ts` — add
- `backend/src/modules/production/dto/start-production-run.dto.ts` — add
- `backend/src/modules/production/dto/record-scrap.dto.ts` — add
- `backend/src/modules/production/services/orders.service.ts` — add
- `backend/src/modules/production/services/orders.service.spec.ts` — add
- `backend/src/modules/production/services/runs.service.ts` — add
- `backend/src/modules/production/services/runs.service.spec.ts` — add
- `backend/src/modules/production/production.controller.ts` — add
- `backend/src/modules/production/production.module.ts` — add
- `backend/src/modules/oee/oee-calculator.ts` — add
- `backend/src/modules/oee/oee-calculator.spec.ts` — add
- `backend/src/modules/oee/oee.service.ts` — add
- `backend/src/modules/oee/oee.controller.ts` — add
- `backend/src/modules/oee/oee.module.ts` — add
- `backend/src/modules/andon/dto/create-andon-ticket.dto.ts` — add
- `backend/src/modules/andon/services/andon.service.ts` — add
- `backend/src/modules/andon/services/andon.service.spec.ts` — add
- `backend/src/modules/andon/andon.controller.ts` — add
- `backend/src/modules/andon/andon.module.ts` — add
- `backend/src/app.module.ts` — edit
- `backend/test/production-oee-andon.e2e-spec.ts` — add
- `.agent-knowledge/dynamic/workflows/003-production-execution-oee-andon.md` — add
- `.agent-knowledge/dynamic/reports/tasks/006-implement-phase-3-production-oee-andon.md` — add

## Review

- Result: Modul Production Execution, ISO 22400-2 OEE Engine berbobot, dan Digital Andon otomatis selesai diimplementasikan secara menyeluruh.
- Verification: 53/53 unit test lulus (`pnpm test`), 37/37 E2E test lulus (`pnpm test:e2e`), static analysis 0 warning / 0 error (`oxlint`), dan build monorepo bersih (`pnpm build`).
- Follow-up: Melanjutkan ke Tahap 4 (Phase 4: Frontend Operator & Supervisory Dashboards dengan React 19, Tailwind, dan Socket.IO).

## Verifikasi UAT (User Acceptance Test)

| #   | Tes                                                                                                       | Hasil |
| --- | --------------------------------------------------------------------------------------------------------- | ----- |
| 1   | Pembuatan production order baru berstatus DRAFT dan pelepasan order ke lantai produksi menjadi RELEASED   | Lulus |
| 2   | Memulai run produksi mengikat mesin IMM-01, memvalidasi cetakan, dan merubah status order ke IN_PROGRESS   | Lulus |
| 3   | Ingesti siklus telemetri secara otomatis menambah totalShots dan jumlah goodQuantity sesuai rongga cetakan| Lulus |
| 4   | Pencatatan reject scrap oleh operator berhasil memperbarui yield part baik secara dinamis                 | Lulus |
| 5   | Kalkulasi OEE ISO 22400-2 Availability, Performance, Quality, dan OEE akurat sesuai formulasi matematika  | Lulus |
| 6   | Agregasi OEE pabrik multi-mesin menggunakan bobot total waktu dan kuantitas, bukan rata-rata sederhana    | Lulus |
| 7   | Alarm gangguan mesin (FAULT_STARTED) pada IMM-10 otomatis membuat tiket Digital Andon baru                | Lulus |
| 8   | Teknisi merespon (ACKNOWLEDGED) dan menyelesaikan tiket (RESOLVED) dengan mencatat akar penyebab masalah  | Lulus |
| 9   | Analitik MTTR mencatat rata-rata durasi respon dan resolusi; analitik Pareto mengurutkan downtime         | Lulus |
| 10  | Menyelesaikan run melepaskan binding activeRunId pada mesin; seluruh test (90) lulus dan build berhasil   | Lulus |
