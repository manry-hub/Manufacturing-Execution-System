# 003 — Initialize Project Documentation (PRD, SDD, and Domain Specifications)

Tanggal: 2026-10-27

## Checklist

- [x] Record reusable translation lesson in `.agent-knowledge/dynamic/reports/LESSON.md`
- [x] Translate and sharpen PRD (`.agent-knowledge/dynamic/docs/dev/PRD.md`) into canonical English
- [x] Translate and sharpen SDD Architecture (`.agent-knowledge/dynamic/docs/dev/sdd/ARCHITECTURE.md`) into canonical English
- [x] Translate SDD Technology Stack (`.agent-knowledge/dynamic/docs/dev/sdd/TECHNOLOGYSTACK.md`) into canonical English
- [x] Translate and sharpen SDD Database Plan (`.agent-knowledge/dynamic/docs/dev/sdd/DATABASE.md`) into canonical English
- [x] Translate and sharpen 3 domain specifications in `docs/notes/` (`MES-STATE-MACHINE-EVENT-SPEC.md`, `MES-OEE-CALCULATION-SPEC.md`, `MES-MACHINE-DATA-DICTIONARY.md`)
- [x] Translate and document ADRs 001 to 005 in `docs/notes/`
- [x] Incorporate initial simulator scenario configuration (8 steady-state normal, 1 slow cycle, 1 fault/Andon, reset/replay)

## Deskripsi Perubahan

Menjalankan pembaruan dokumentasi perencanaan ke dalam bahasa Inggris sesuai koreksi pengguna:

1. Memperbarui `LESSON.md` untuk mencatat aturan pencegahan penulisan bahasa dokumentasi teknis.
2. Menerjemahkan dan mempertajam `PRD.md`, `ARCHITECTURE.md`, `TECHNOLOGYSTACK.md`, dan `DATABASE.md` ke dalam bahasa Inggris teknis standar industri.
3. Memasukkan keputusan konfigurasi baseline simulator: 10 mesin virtual (8 berjalan normal, 1 slow cycle terpicu skenario, 1 fault terpicu skenario dengan alur tiket Andon, serta kemampuan reset dan replay).
4. Menerjemahkan seluruh spesifikasi domain turunan (`MES-STATE-MACHINE-EVENT-SPEC.md`, `MES-OEE-CALCULATION-SPEC.md`, `MES-MACHINE-DATA-DICTIONARY.md`) dan ADR 001–005 di `docs/notes/`.

## Daftar File yang Diubah

- `.agent-knowledge/dynamic/reports/LESSON.md` — edit
- `.agent-knowledge/dynamic/docs/dev/PRD.md` — edit
- `.agent-knowledge/dynamic/docs/dev/sdd/ARCHITECTURE.md` — edit
- `.agent-knowledge/dynamic/docs/dev/sdd/TECHNOLOGYSTACK.md` — edit
- `.agent-knowledge/dynamic/docs/dev/sdd/DATABASE.md` — edit
- `docs/notes/MES-STATE-MACHINE-EVENT-SPEC.md` — edit
- `docs/notes/MES-OEE-CALCULATION-SPEC.md` — edit
- `docs/notes/MES-MACHINE-DATA-DICTIONARY.md` — edit
- `docs/notes/ADR-001-database-choice.md` — edit
- `docs/notes/ADR-002-modular-monolith.md` — edit
- `docs/notes/ADR-003-event-state-separation.md` — edit
- `docs/notes/ADR-004-deterministic-simulator.md` — edit
- `docs/notes/ADR-005-normalized-event-contract.md` — edit
- `.agent-knowledge/dynamic/reports/tasks/003-initialize-project-documentation.md` — edit

## Review

- Result: Seluruh dokumentasi perencanaan proyek berhasil diterjemahkan ke bahasa Inggris dan dipertajam dengan konfigurasi skenario simulator.
- Verification: Konsistensi istilah teknis industri (ISA-95, ISO 22400-2, OPC 40077), validasi format terhadap template kanonis PRD dan SDD, serta verifikasi linter formatting Prettier.
- Follow-up: Mengonfirmasi kesiapan perencanaan sebelum melangkah ke implementasi teknis.

## Verifikasi UAT (User Acceptance Test)

| #   | Tes                                                                                                         | Hasil |
| --- | ----------------------------------------------------------------------------------------------------------- | ----- |
| 1   | Konfirmasi dan pencatatan aturan pencegahan di `LESSON.md`                                                  | Lulus |
| 2   | Penerjemahan kanonis PRD ke bahasa Inggris sesuai `PRD-TEMPLATE.md`                                         | Lulus |
| 3   | Penerjemahan kanonis ARCHITECTURE, TECHNOLOGYSTACK, dan DATABASE ke bahasa Inggris sesuai `SDD-TEMPLATE.md` | Lulus |
| 4   | Penerjemahan 3 dokumen spesifikasi domain di `docs/notes/` ke bahasa Inggris                                | Lulus |
| 5   | Penerjemahan ADR 001–005 di `docs/notes/` ke bahasa Inggris                                                 | Lulus |
| 6   | Integrasi skenario baseline simulator (8 normal, 1 slow cycle, 1 fault, reset/replay)                       | Lulus |
