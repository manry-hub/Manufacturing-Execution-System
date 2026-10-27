# SETUPDOCS — Inisialisasi Dokumentasi Proyek

Gunakan prompt ini secara manual untuk mengisi atau merapikan PRD dan dokumen SDD. Prompt ini mendukung proyek yang sudah berjalan maupun proyek yang akan dibangun. Tugas ini hanya mengubah dokumentasi.

## Pilih Mode Terlebih Dahulu

Sebelum membaca codebase atau menulis dokumen, tanyakan pengguna untuk memilih satu mode:

1. **Proyek Berjalan** — proyek sudah memiliki implementasi yang menjadi sumber bukti utama.
2. **Proyek Baru** — proyek belum dibangun atau implementasinya belum menjadi sumber kebenaran.

Jangan mulai menulis PRD maupun dokumen SDD sebelum pengguna memilih mode.

## Dokumen Sasaran

- `.agent-knowledge/static/templates/PRD-TEMPLATE.md` — struktur kanonis yang immutable; jangan diubah.
- `.agent-knowledge/dynamic/docs/dev/PRD.md` — output yang boleh dibuat atau diperbarui dari template.
- `.agent-knowledge/static/templates/SDD-TEMPLATE.md` — struktur kanonis yang immutable; jangan diubah.
- `.agent-knowledge/dynamic/docs/dev/sdd/ARCHITECTURE.md` — output arsitektur.
- `.agent-knowledge/dynamic/docs/dev/sdd/TECHNOLOGYSTACK.md` — output technology stack.
- `.agent-knowledge/dynamic/docs/dev/sdd/DATABASE.md` — output database.

## Prosedur

1. Baca `AGENTS.md`, instruksi lokal yang berlaku, lessons yang relevan, kedua template, dan seluruh dokumen output yang sudah ada. Template adalah struktur kanonis dan tidak boleh diubah.
2. Ikuti prosedur untuk mode yang dipilih, lalu buat atau perbarui `PRD.md`, `ARCHITECTURE.md`, `TECHNOLOGYSTACK.md`, dan `DATABASE.md` dengan struktur template. Ganti placeholder dengan informasi yang terverifikasi atau pertanyaan terbuka.

### Mode: Proyek Berjalan

1. Petakan codebase yang relevan sebelum menulis: stack dan versinya, entry point, alur utama, antarmuka atau API, modul penting, autentikasi dan otorisasi, integrasi, penyimpanan data, serta konfigurasi dan tes yang membantu mengonfirmasi perilaku. Ikuti package manager dan versi yang dinyatakan oleh project.
2. Jika tersedia dan sesuai instruksi proyek, gunakan skill `codebase-memory` untuk pertanyaan struktural; verifikasi temuan penting pada file sumber.
3. Petakan informasi ke bagian template: visi dan masalah, target users, epic dan user stories, fitur MVP atau post-MVP, constraints dan assumptions, success metrics, serta out of scope.
4. Petakan bukti teknis ke Architecture, Technology Stack, dan Database: batas sistem, komponen, alur data, keamanan, deployment, teknologi dan versinya, serta topology, schema, relasi, indeks, migration, dan seed data.
5. Pisahkan tiga jenis informasi:
   - **Kondisi saat ini**: perilaku dan desain yang terbukti dari codebase atau dokumentasi yang dipercaya.
   - **Keputusan bisnis atau produk**: maksud yang dinyatakan pengguna atau dokumen proyek yang masih berlaku.
   - **Perubahan yang diinginkan**: fitur tambahan atau perubahan yang belum terbukti diimplementasikan. Catat sebagai rencana atau usulan.
6. Hubungkan perubahan yang diminta dengan keadaan proyek sekarang. Jangan menganggap fitur baru sudah dibangun.

### Mode: Proyek Baru

1. Kumpulkan informasi yang dibutuhkan oleh setiap bagian template: visi dan masalah, target users, epic dan user stories, fitur MVP dan post-MVP, constraints, assumptions, success metrics, serta out of scope.
2. Kumpulkan keputusan teknis yang dibutuhkan oleh SDD: jenis proyek, batas dan pola arsitektur, komponen, alur data, keamanan, deployment, teknologi dan versi, serta database topology, schema, relasi, indeks, migration, dan seed data.
3. Jika informasi penting belum tersedia, tanyakan kepada pengguna dan tunggu jawaban. Jangan mengisi requirement, persona, keputusan bisnis, atau keputusan teknis dengan asumsi.
4. Tulis PRD sebagai spesifikasi kebutuhan dan dokumen SDD sebagai rencana teknis. Tandai keputusan yang belum dibuat sebagai pertanyaan terbuka.
5. Jangan menyatakan fitur atau perilaku sebagai implementasi sampai ada bukti bahwa proyek telah dibangun.

## Pengisian PRD

### PRD — Product Requirements Document

Ikuti heading, tabel, dan pemisahan MVP, post-MVP, serta out of scope dalam `PRD-TEMPLATE.md`. Pada proyek berjalan, gunakan implementasi untuk mencatat kemampuan yang tersedia. Pada proyek baru, nyatakan kebutuhan sebagai rencana sampai diimplementasikan. Jangan menambah struktur baru kecuali pengguna memintanya atau template tidak dapat menampung informasi penting.

## Pengisian SDD

Ikuti tiga bagian dalam `SDD-TEMPLATE.md`: Architecture untuk desain sistem, komponen, keamanan, deployment, dan keputusan; Technology Stack untuk layer, teknologi, versi, dan peran; Database untuk topology, schema, relasi, indeks, migration, dan seed data. Jangan menduplikasi tabel technology stack dalam Architecture. Pada proyek berjalan, gunakan implementasi sebagai bukti. Pada proyek baru, nyatakan desain sebagai rencana sampai diimplementasikan.

## Aturan Penulisan dan Riset

- Isi dokumen yang kosong dengan informasi yang dapat dipastikan. Untuk dokumen yang sudah berisi, pertahankan konten yang masih berlaku dan ubah hanya bagian yang perlu diperbarui. Jangan menimpa dokumen lengkap dengan ringkasan codebase.
- Periksa silang PRD dan seluruh dokumen SDD agar istilah, cakupan, status fitur, prioritas, serta keputusan produk dan teknis tidak saling bertentangan. Biarkan pertanyaan yang belum terjawab sebagai pertanyaan terbuka.
- Topik di atas adalah panduan cakupan, bukan daftar heading wajib. Susun dokumen mengikuti bentuk dan kebutuhan proyek; jaga tetap ringkas dan mudah diperbarui.
- Gunakan bahasa dokumen yang sudah ada. Jika semuanya kosong, gunakan bahasa permintaan pengguna.
- Sertakan rujukan file atau artefak codebase untuk keputusan desain teknis yang penting bila membantu pembaca memverifikasinya.
- Jangan melakukan riset web untuk mengisi dokumentasi rutin. Jika pengguna meminta atau memberikan hasil riset, catat sumber dan tanggal serta tandai apakah isinya rekomendasi, keputusan yang disetujui, atau implementasi saat ini.
- Jangan mengubah source code, konfigurasi, dependency, schema, atau tes. Jika menemukan ketidaksesuaian implementasi dengan kebutuhan, dokumentasikan perbedaannya; jangan memperbaikinya dalam tugas ini.

## Kriteria Selesai

- Pengguna telah memilih mode sebelum dokumentasi ditulis.
- PRD mengikuti struktur `PRD-TEMPLATE.md` tanpa mengubah template.
- ARCHITECTURE, TECHNOLOGYSTACK, dan DATABASE mengikuti bagian masing-masing dalam `SDD-TEMPLATE.md` tanpa mengubah template.
- Untuk proyek berjalan, fakta implementasi dapat dibedakan dari perubahan yang direncanakan.
- Untuk proyek baru, kebutuhan dan desain teknis diperlakukan sebagai rencana atau usulan, dan informasi yang belum tersedia dicatat sebagai pertanyaan terbuka.
- Laporkan dokumen yang diubah, ringkasan pembaruan, bukti codebase yang dipakai bila ada, serta pertanyaan atau keputusan yang masih terbuka.
