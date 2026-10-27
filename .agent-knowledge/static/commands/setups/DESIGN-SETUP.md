# SETUPDESIGN — Inisialisasi Pedoman Tampilan Proyek

Gunakan prompt ini secara manual untuk menginisialisasi atau memperbarui `DESIGN.md` di root proyek. Prompt ini mendukung aplikasi yang sudah berjalan maupun aplikasi yang akan dibangun. Tugas ini hanya mengubah dokumentasi, kecuali pengguna secara eksplisit meminta implementasi UI.

## Pilih Mode Terlebih Dahulu

Sebelum memetakan UI atau menulis `DESIGN.md`, tanyakan pengguna untuk memilih satu mode:

1. **Proyek Berjalan** — aplikasi sudah memiliki implementasi yang menjadi sumber bukti utama.
2. **Proyek Baru** — aplikasi belum dibangun atau implementasinya belum menjadi sumber kebenaran.

Jangan mulai menulis `DESIGN.md` sebelum pengguna memilih mode.

## Prosedur

1. Baca `AGENTS.md`, instruksi lokal yang berlaku, `DESIGN.md` di root proyek, dan dokumen produk yang relevan. Pertahankan keputusan desain yang masih berlaku.
2. Ikuti prosedur untuk mode yang dipilih.

### Mode: Proyek Berjalan

1. Identifikasi stack frontend, entry point, route atau screen utama, layout, design tokens, stylesheet, komponen bersama, font, ikon, dan aset visual dari codebase. Ikuti versi framework dan package manager yang ditetapkan proyek.
2. Untuk memahami UI secara struktural, gunakan skill `codebase-memory` bila tersedia dan sesuai instruksi proyek; verifikasi temuan penting pada source code.
3. Untuk tugas UI/UX, gunakan skill `impeccable` dan ikuti alur yang cocok untuk audit atau pendokumentasian desain. Jika tidak tersedia, ikuti instruksi instalasi di `AGENTS.md` sebelum bergantung padanya.
4. Bila aplikasi dapat dijalankan atau sudah terbuka, periksa halaman dan state yang relevan dengan Playwright MCP. Gunakan Chrome DevTools MCP untuk memeriksa computed styles atau masalah visual yang sulit dipastikan dari source. Jika proyek memiliki file `.pen` atau pengguna meminta pekerjaan pada Pencil, baca skill Pencil dan gunakan Pencil MCP. Jika tool terkait tidak tersedia, lanjutkan dari source dan aset yang ada, lalu sebutkan keterbatasan pemeriksaan runtime.
5. Catat temuan dalam tiga kelompok yang jelas:
   - **Tampilan saat ini**: pola yang terbukti dari source atau UI yang diamati.
   - **Arahan pengguna**: preferensi atau perubahan visual yang secara eksplisit diminta.
   - **Usulan**: perbaikan visual yang disimpulkan dari audit tetapi belum disetujui atau diterapkan.
6. Isi `DESIGN.md` yang kosong atau perbarui bagian yang terdampak bila sudah berisi. Jangan menulis ulang preferensi yang masih berlaku dan jangan mengubah kode dalam mode dokumentasi ini.
7. Periksa apakah pedoman hasilnya konsisten dengan komponen, halaman, dan aset yang benar-benar ada. Tandai hal yang belum diketahui; jangan mengarang brand, warna, tipografi, breakpoint, atau keputusan desain.

### Mode: Proyek Baru

1. Kumpulkan arah visual berikut sebelum menulis: tujuan dan audiens produk, platform dan jenis layar utama, identitas brand atau aset yang tersedia, referensi dan anti-referensi visual, karakter visual yang diinginkan, kebutuhan responsif dan aksesibilitas, serta keputusan desain yang sudah disetujui.
2. Jika arah penting belum tersedia, tanyakan kepada pengguna dan tunggu jawaban. Jangan mengarang brand, palet warna, tipografi, motion, breakpoint, ikonografi, atau pola interaksi.
3. Gunakan skill `impeccable` untuk merumuskan arah visual dari keputusan yang diberikan. Rekam setiap keputusan yang disetujui sebagai pedoman dan setiap pilihan yang belum disetujui sebagai rancangan atau usulan.
4. Tulis `DESIGN.md` sebagai pedoman awal untuk implementasi. Jangan menyatakan token, komponen, aset, atau perilaku UI sebagai tampilan yang sudah ada sampai ada bukti implementasi.

## Hal yang Perlu Dipetakan

Dokumentasikan hanya yang berguna bagi pekerjaan UI berikutnya. Pada proyek berjalan, catat pola yang terbukti. Pada proyek baru, catat keputusan yang disetujui dan tandai rancangan yang belum disetujui, misalnya:

- Prinsip dan karakter visual produk yang terlihat atau telah diputuskan.
- Warna, tipografi, skala spacing, grid, breakpoint, radius, border, elevation, dan motion yang benar-benar digunakan.
- Pola layout, navigasi, komponen bersama, ikonografi, ilustrasi, foto, dan aturan penggunaan aset.
- State komponen seperti hover, focus, active, disabled, loading, empty, error, dan success bila relevan.
- Perilaku responsive, aksesibilitas, kontras, keyboard, dan reduced motion yang telah diterapkan atau diminta.
- Ketidakkonsistenan visual penting beserta lokasi contohnya dan usulan perbaikannya.

Jangan menginventaris semua komponen atau menyalin seluruh nilai CSS. Pada proyek berjalan, rujuk file atau komponen sumber untuk detail yang mudah ditemukan di codebase. Pada proyek baru, rujuk keputusan desain atau arahan pengguna. Catat di DESIGN.md keputusan, konvensi, atau hubungan antarpola yang tidak jelas dari sumber tersebut saja.

## Arahan untuk Perubahan Tampilan

- Untuk fitur tambahan pada proyek berjalan, pertahankan pola visual dan perilaku produk yang sudah ada kecuali pengguna meminta arah baru.
- Untuk proyek baru, jadikan keputusan desain yang sudah disetujui sebagai arah utama; jangan memakai gaya default sebagai pengganti arahan pengguna.
- Pisahkan kebutuhan visual fitur yang diminta dari tampilan yang sudah diimplementasikan. Tulis kebutuhan baru sebagai target atau usulan sampai perubahan UI benar-benar dibuat.
- Bila arahan pengguna bertentangan dengan pola lama, catat arahan terbaru sebagai keputusan target dan tandai pola yang perlu diganti; jangan diam-diam memperluas redesign ke halaman lain.
- Jangan menambahkan dependency, mengganti design system, membuat brand baru, atau mengubah alur produk hanya demi konsistensi visual tanpa kebutuhan yang jelas.
- Jika pengguna meminta implementasi UI, kerjakan hanya cakupan visual yang diminta, tetap ikuti arsitektur dan komponen proyek, lalu verifikasi tampilan pada ukuran layar dan state yang relevan bila tool tersedia.

## Kriteria Selesai

- Pengguna telah memilih mode sebelum `DESIGN.md` ditulis.
- `DESIGN.md` di root proyek menjelaskan pola visual yang relevan dan arahan pengguna untuk pengembangan berikutnya.
- Untuk proyek berjalan, fakta yang diamati, target yang diminta, dan usulan yang belum disetujui dapat dibedakan.
- Untuk proyek baru, keputusan yang disetujui dapat dibedakan dari rancangan atau usulan yang belum disetujui.
- Untuk proyek baru, arah visual penting telah dikumpulkan sebelum pedoman ditulis.
- Pedoman cukup ringkas untuk dipakai saat mengerjakan UI dan tidak memaksa redesign menyeluruh.
- Laporkan file yang diubah, sumber pengamatan (source, route, atau state UI), serta keterbatasan atau keputusan visual yang masih terbuka.
