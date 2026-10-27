# 005 — Implement Phase 2 Multi-Machine Simulator & Telemetry Ingestion

Tanggal: 2026-10-28

## Checklist

- [x] Install WebSocket and Socket.IO dependencies (`@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io`, `socket.io-client`)
- [x] Model normalized machine event DTO contract (`NormalizedMachineEventDto`, `EventTypeEnum`, `NormalizedStatusEnum`, `EventMetricsDto`, `EventFaultDto`)
- [x] Implement `TelemetryIngestionService` with idempotency deduplication (`eventId`), machine resolution, atomic state projection, and time segment slicing
- [x] Implement `TelemetryController` (`POST /api/v1/telemetry/events`, `POST /api/v1/telemetry/events/batch`, `GET /api/v1/telemetry/machines/:id/latest`)
- [x] Implement `VirtualMachineNode` with PackML and injection molding phase FSM, parameter synthesis, and deterministic Mulberry32 PRNG
- [x] Implement `SimulatorService` governing 10 virtual injection molding machines adhering to the 8+1+1 baseline allocation (8 normal flow, `IMM-09` slow cycle candidate, `IMM-10` fault candidate)
- [x] Implement `SimulatorController` with control endpoints (`/status`, `/start`, `/stop`, `/speed`, `/reset`, `/scenarios/trigger`)
- [x] Implement `TelemetryGateway` with Socket.IO WebSocket broadcasting to rooms `plant:all` and `machine:{id}`
- [x] Wire `TelemetryModule` and `SimulatorModule` into `AppModule`
- [x] Implement comprehensive unit tests (`virtual-machine-node.spec.ts`, `simulator.service.spec.ts`, `telemetry.service.spec.ts`) with 100% pass rate (31/31 tests passing)
- [x] Implement live E2E integration test (`simulator-and-telemetry.e2e-spec.ts`) verifying simulator controls, scenarios, and real-time Socket.IO broadcasts (23/23 tests passing)
- [x] Pass static analysis (`oxlint`, `eslint`) with 0 errors / 0 warnings and build cleanly (`pnpm build`)

## Deskripsi Perubahan

Menjalankan implementasi teknis Tahap 2 (Phase 2: Multi-Machine Simulator & Telemetry Ingestion Engine) sesuai workflow `002-multi-machine-simulator.md`:

1. Menambahkan pustaka WebSocket Socket.IO pada `@mes/backend`.
2. Menyusun kontrak DTO telemetri ternormalisasi sesuai spesifikasi `MES-STATE-MACHINE-EVENT-SPEC.md` dan kamus data `MES-MACHINE-DATA-DICTIONARY.md`.
3. Mengembangkan `TelemetryIngestionService` yang menjamin idempoten mutlak melalui pemeriksaan keunikan `eventId`, memperbarui proyeksi `machine_current_states` secara atomik, dan mengelola segmentasi waktu OEE pada `machine_time_segments`.
4. Mengembangkan engine `VirtualMachineNode` dan `SimulatorService` yang mensimulasikan 10 mesin cetak injeksi virtual (`IMM-01` sampai `IMM-10`) dengan alokasi 8+1+1 (8 normal, 1 slow cycle pada IMM-09, dan 1 gangguan hidrolik/fault pada IMM-10).
5. Mengintegrasikan gateway WebSocket Socket.IO (`TelemetryGateway`) untuk mendistribusikan event telemetri waktu nyata ke frontend live dashboard dengan latensi di bawah 500ms.
6. Menyediakan endpoint kendali REST untuk simulator (`/status`, `/start`, `/stop`, `/speed`, `/reset`, `/scenarios/trigger`).
7. Memverifikasi seluruh kode dengan 31 unit test dan 23 integration E2E test yang mencakup pengujian WebSocket langsung.

## Daftar File yang Diubah

- `backend/package.json` — edit
- `pnpm-lock.yaml` — edit
- `backend/src/modules/telemetry/dto/normalized-machine-event.dto.ts` — add
- `backend/src/modules/telemetry/telemetry.service.ts` — add
- `backend/src/modules/telemetry/telemetry.controller.ts` — add
- `backend/src/modules/telemetry/telemetry.gateway.ts` — add
- `backend/src/modules/telemetry/telemetry.module.ts` — add
- `backend/src/modules/telemetry/telemetry.service.spec.ts` — add
- `backend/src/modules/simulator/virtual-machine-node.ts` — add
- `backend/src/modules/simulator/simulator.service.ts` — add
- `backend/src/modules/simulator/dto/simulator-control.dto.ts` — add
- `backend/src/modules/simulator/simulator.controller.ts` — add
- `backend/src/modules/simulator/simulator.module.ts` — add
- `backend/src/modules/simulator/virtual-machine-node.spec.ts` — add
- `backend/src/modules/simulator/simulator.service.spec.ts` — add
- `backend/src/app.module.ts` — edit
- `backend/test/setup.ts` — add
- `backend/vitest.config.ts` — edit
- `backend/vitest.config.e2e.ts` — edit
- `backend/test/auth-and-master-data.e2e-spec.ts` — edit
- `backend/test/simulator-and-telemetry.e2e-spec.ts` — add
- `.agent-knowledge/dynamic/reports/tasks/005-implement-phase-2-simulator.md` — add

## Review

- Result: Simulator 10 mesin virtual (konfigurasi 8+1+1), engine ingest telemetri idempoten, proyeksi state real-time, dan gateway WebSocket Socket.IO selesai diimplementasikan secara utuh.
- Verification: 31/31 unit test lulus (`pnpm test`), 23/23 E2E test lulus (`pnpm test:e2e`), static analysis 0 warning / 0 error (`oxlint`), dan build monorepo bersih (`pnpm build`).
- Follow-up: Melanjutkan ke Tahap 3 (Workflow 003: Production Execution, OEE Engine & Digital Andon).

## Verifikasi UAT (User Acceptance Test)

| #   | Tes                                                                                                   | Hasil |
| --- | ----------------------------------------------------------------------------------------------------- | ----- |
| 1   | Kontrak event telemetri memvalidasi payload JSON dan menolak payload tidak valid                      | Lulus |
| 2   | Ingesti event menjamin idempoten: pengiriman ulang `eventId` yang sama ditolak tanpa duplikasi data    | Lulus |
| 3   | Ingesti memperbarui proyeksi `machine_current_states` dan mencatat riwayat pada `machine_event_logs` | Lulus |
| 4   | Perubahan status mesin otomatis menutup segmen waktu lama dan membuka segmen baru di database         | Lulus |
| 5   | Simulator menginisialisasi 10 mesin virtual dengan konfigurasi 8 normal, 1 slow cycle, dan 1 fault    | Lulus |
| 6   | Skenario slow cycle pada IMM-09 memperpanjang waktu siklus sebesar 50%                                | Lulus |
| 7   | Skenario fault pada IMM-10 menghentikan siklus, memicu alarm `UNP-HYD-JAM`, dan merubah status FAULT | Lulus |
| 8   | Reset simulator mengembalikan seluruh 10 mesin ke kondisi baseline steady-state normal               | Lulus |
| 9   | Gateway WebSocket Socket.IO menyiarkan event `telemetry:event` dan `machine:cycle_completed` ke room | Lulus |
| 10  | Seluruh unit test (31) dan E2E test (23) lulus 100% dan build monorepo berhasil                       | Lulus |
