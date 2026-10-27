# SETUPPRODDOCS — Inisialisasi Dokumentasi Produksi

Gunakan prompt ini secara manual untuk mengisi atau merapikan dokumentasi topologi jaringan dan deployment. Prompt ini mendukung infrastruktur yang sudah berjalan maupun infrastruktur yang masih direncanakan. Tugas ini hanya mengubah dokumentasi.

## Pilih Mode Terlebih Dahulu

Sebelum memeriksa infrastruktur atau menulis dokumen, tanyakan pengguna untuk memilih satu mode:

1. **Infrastruktur Berjalan** — server, jaringan, atau proses deployment sudah ada dan menjadi sumber bukti utama.
2. **Infrastruktur Rencana** — infrastruktur belum dibangun atau belum menjadi sumber kebenaran.

Jangan mulai menulis dokumentasi produksi sebelum pengguna memilih mode.

## Dokumen Sasaran

- `.agent-knowledge/static/templates/NETWORK-TOPOLOGY-TEMPLATE.md` — immutable, jangan diubah.
- `.agent-knowledge/dynamic/docs/prod/NETWORK-TOPOLOGY.md` — output topologi jaringan.
- `.agent-knowledge/static/templates/DEPLOYMENT-TEMPLATE.md` — immutable, jangan diubah.
- `.agent-knowledge/dynamic/docs/prod/DEPLOYMENT.md` — output deployment.

## Prosedur

1. Baca `AGENTS.md`, instruksi yang berlaku, lessons, kedua template, dan output yang sudah ada.
2. Perlakukan template sebagai sumber struktur yang immutable.
3. Ikuti mode yang dipilih, lalu perbarui hanya dokumen output dengan fakta terverifikasi atau pertanyaan terbuka.

### Mode: Infrastruktur Berjalan

1. Kumpulkan bukti yang diizinkan dari manifest, dokumentasi operasional, observability, dan pemilik sistem. Jangan membuka atau mencetak `.env`, kredensial, private key, token, password, atau data produksi sensitif.
2. Petakan batas jaringan, server dan perannya, koneksi, port, firewall, DNS, TLS, load balancing, Docker network, dan monitoring.
3. Petakan strategi deployment, otomatisasi, sumber revisi, approval, checklist, migrasi, health check, rollback, environment management, waktu deployment, dan alerting.
4. Pisahkan kondisi saat ini yang terbukti, keputusan operasional yang telah disetujui, dan proposal yang belum diterapkan.

### Mode: Infrastruktur Rencana

1. Kumpulkan kebutuhan environment, domain, exposure publik, batas jaringan, server dan service, teknologi deployment, CI/CD, rollback, backup, monitoring, alerting, akses admin, dan keamanan.
2. Jika informasi belum ada, tanyakan pengguna dan tunggu jawaban. Jangan mengarang IP, hostname, domain, port, firewall, kredensial, provider, server, prosedur, atau komitmen ketersediaan.
3. Tulis topologi dan deployment sebagai rencana. Tandai keputusan yang belum ada sebagai pertanyaan terbuka.

## Data Sensitif dan Operasi

- Gunakan placeholder atau redaksi untuk secret, kredensial, token, private key, dan password.
- Cantumkan IP, hostname, domain, atau port hanya bila diizinkan dan diperlukan untuk dokumentasi.
- Jangan mengotomatisasi atau menyarankan operasi destruktif tanpa target, backup, titik keputusan, dan otorisasi eksplisit.
- Nyatakan batas verifikasi bila bukti tidak tersedia.

## Pengisian Dokumen

- Gunakan template network topology untuk overview, diagram dan addressing, port, firewall, DNS, TLS, routing, keamanan, troubleshooting, dan monitoring.
- Gunakan template deployment untuk strategi, otomatisasi, initial setup, prosedur manual, checklist, rollback, environment, monitoring, dan masalah umum.
- Cocokkan server, domain, service, port, health check, dan ownership di kedua output.

## Kriteria Selesai

- Mode sudah dipilih.
- Kedua output mengikuti template tanpa mengubah template.
- Fakta saat ini, rencana, dan pertanyaan terbuka terpisah jelas.
- Tidak ada secret atau data sensitif yang dicantumkan.
- Laporkan dokumen yang berubah, bukti yang dipakai, batas verifikasi, dan pertanyaan terbuka.
