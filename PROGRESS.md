# PROGRESS — MR Properti

Terakhir diperbarui: 23-11-2026 (pemeriksaan kapasitas RAM: CUKUP 2 GB; lihat bagian 23-11-2026 10:07).

## Selesai

### Kode (branch lokal, BELUM di-push / BELUM tayang)
Branch `perbaikan/profesional` = satu branch siap deploy. Isinya (urut):
1. `fitur/rotasi-listing` — urutan listing default bergantian tiap hari (genap sejak 2026-01-01 = lama→baru,
   ganjil = baru→lama, WIB). Berlaku di beranda, `/properti`, `/wilayah/*`. Pilihan "Terbaru" dan
   "Harga terendah" tidak ikut rotasi. Uji paksa: `LISTING_ROTATION_FORCE=asc|desc`.
2. Tahap 5 (tampilan/SEO), satu commit per poin:
   - 1: kerangka kartu menggantikan teks "Menyiapkan halaman…"
   - 2, 15: H1 beranda terlihat; judul halaman 111 → 60 karakter
   - 3, 4, 6: kartu "LT 60 m²", judul Title Case (tampilan saja), jumlah foto, tanggal tayang
   - 5, 7, 17: detail — breadcrumb wilayah, label jenis · transaksi, peta, properti serupa, Offer JSON-LD
   - 16: templat meta description (KT, LT, harga)
   - 20: gambar kartu teratas eager + fetchPriority high (LCP)
3. `CLAUDE.md` gabungan + file ini.

Cek terakhir: 96/96 tes unit, lint, typecheck, build produksi lulus (mode demo).

### Server (VPS 116.212.73.143) — hanya baca + backup, tidak ada yang diubah
- Pemetaan kapasitas & kepemilikan container: lihat `CLAUDE.md` dan LOG di server.
- Lighthouse mobile live (sebelum): beranda performa 30–34, LCP 7,8–8,8 s, TBT ±9,5 s;
  detail performa 49; aksesibilitas 96, SEO 100.

### Diagnosis chatbot
Semua chat gagal (0/5 pertanyaan uji). Website mengirim header `x-mr-token`, tetapi credential
n8n `Header Auth account` (`HFM0ZWUl3WznfZ1H`) yang dipakai workflow aktif
`MR Properti — Chat Next v2.js` (`inj1Io85s1qSdDNZ`) memeriksa header `Authorization` dengan nilai lain
→ n8n balas 403. Log `mrproweb` 72 jam: hanya `[chat] webhook_http_403`.

## Selesai 21-11-2026 malam
- **Deploy 1** `perbaikan/profesional` → main (`88357a7`, Actions 44922464240 hijau). Semua halaman 200, Lavile 200.
  Lighthouse mobile SESUDAH: beranda 39 (LCP 4,9 s, TBT 7,1 s; sebelum 30–34); detail 29–35 (sebelum 49),
  beban dari chunk inti React (TBT 7,8–19 s, diukur dari laptop yang sibuk → angka bervariasi). Perlu diselidiki.
- **Chatbot**: credential baru `MRP Chat Webhook` (`rRIUlBypysmaC69N`, header `x-mr-token`) dan `MRP Groq`
  (`LOany4qg8SAJpkVj`). Workflow baru `MRP-Chat-groq` (`UI0HBaX7pESdq629`) aktif di path `mr-konsultasi`;
  `MR Properti — Chat Next v2.js` (`inj1Io85s1qSdDNZ`) DINONAKTIFKAN (tidak dihapus).
  Model `openai/gpt-oss-120b`, cadangan `openai/gpt-oss-20b` (llama-3.3 tidak tersedia di key ini).
  Sumber JSON workflow: `workflows/n8n/build-mrp-chat-groq.py` → `mrp-chat-groq.json`.
- **Deploy 2** `perbaikan/chatbot-groq` → main: pencarian listing berfilter (harga, wilayah, KT, transaksi,
  jenis; alternatif terdekat bila kosong), website mengirim `sources` ke n8n (ID pasti cocok), survei/nego
  langsung dioper ke admin. 103/103 tes lulus.
- Tes 5 pertanyaan ke workflow: 4/4 dijawab dari data + no. 5 dioper ke admin (target tercapai).
- Cadangan: n8n `/root/n8n-backup/20261121-231247/`; pra-deploy `/root/backup-mrproperti/2026-11-21-pra-deploy/`;
  image rollback `ghcr.io/michkrisma7-cmd/mrpro:pra-deploy-2026-11-21` dan `:pra-deploy-chat-2026-11-21`.
- Rollback chatbot: nonaktifkan `UI0HBaX7pESdq629`, aktifkan `inj1Io85s1qSdDNZ` (API n8n, key di `.keys`)
  — tapi workflow lama memang rusak (403).

## Selesai 22-11-2026 dini hari — blog ke Groq
- Workflow blog lama `cpGzooOPgTWuBXQc` ternyata GAGAL di semua jadwal sejak ±30-10-2026 (artikel terakhir
  30-10): model OpenRouter `nvidia/nemotron-3-super-120b-a12b:free` sudah hilang + key Gemini cadangan tidak valid.
- Baru: `MRP-MR Properti Blog — Next.js-groq` (`Zm0ZBgFDJW0P1u7H`) AKTIF, jadwal sama (07/11/15/19 WIB).
  Penulis = HTTP Groq mode JSON `gpt-oss-120b`, cadangan `gpt-oss-20b`; node "Ambil Teks" → validasi lama tak diubah.
  Lama `cpGzooOPgTWuBXQc` + uji `rmYEivQNRvlMdrNq` DINONAKTIFKAN (tidak dihapus).
- Pratinjau (dryRun) lulus validasi: 448 kata, 42 detik. Catatan: model sempat menulis angka "10–30%" (prompt melarang angka).
- Pembangun: `workflows/n8n/build-mrp-blog-groq.py <ekspor lama> uji|prod` (jalankan di VPS; ekspor berisi API key blog).
- Cadangan n8n sebelum perubahan: `/root/n8n-backup/20261122-000150/`.
- **Belum terverifikasi**: terbit sungguhan pertama dijadwalkan 07:00 WIB 22-11. Cek: `GET /api/v1/executions?workflowId=Zm0ZBgFDJW0P1u7H`
  dan artikel baru di `/blog`.
- Temuan keamanan: API key blog tertulis langsung di node "Jadwal dan Topik" (juga di workflow lama). Usul: pindah ke
  credential Header Auth n8n.
- 22-11 00:0x: n8n sempat "Database connection timed out" (SQLite) ±sesaat → webhook 502, pulih sendiri.

## 22-11-2026 — Tahap 5 data (poin 8–12)
- Cadangan DB sebelum ubah: VPS `/root/backup-mrproperti/2026-11-22/appdb-pra-rapikan.dump`.
- **Poin 8 SELESAI** (`2026-11-22/perbaiki-typo.sql`): master fasilitas Keamnanan→Keamanan 24 Jam, One Get→One Gate
  System, Bathtup→Bathtub (+ di values 31/15/4 listing); lokasi "Resinde"→"Residence"; judul "kwalitas"→"kualitas"
  (slug `rumah-subsidi-kwalitas-komersil-97d2fee7` SENGAJA tidak diubah).
- **Poin 10–12 laporan**: `catatan-kerja/laporan-listing-2026-11-22.md` (VPS: `2026-11-22/laporan-listing.md`,
  skrip `lapor.py`). 8 perlu dicek (foto <3, guesthouse KT 19/KM 20), 10 di luar area, 6 nomor WA dipakai ≥3 listing.
- **Poin 9 PRATINJAU, belum diterapkan**: `2026-11-22/pratinjau-deskripsi.json` (skrip `rapikan2.py`). 5 listing:
  2 hanya ganti nomor HP, Rawamangun + Puri Awan via Groq (perlu koreksi kecil), guesthouse Jogja TIDAK aman
  (Groq membuang "19 KT 20 KM").
- **Poin 9 DITERAPKAN (disetujui pemilik, 4 listing)**: 2 ganti nomor HP, Rawamangun, Puri Awan (+koreksi
  Pak Prabowo/terhuni/depan gerbang). Guesthouse Jogja tidak disentuh. Balik: `2026-11-22/BALIKKAN-deskripsi.sql`.
- **Poin 11**: pemilik memilih "biarkan dulu" (10 listing luar area tetap tayang, hanya tercatat di laporan).
- **Poin 12 SELESAI**: label Pemilik/Agen (`4f13839`, migrasi `202611220001_property_advertiser_type`, Actions
  44931041520 hijau). Kolom `Property.advertiserType` (PEMILIK/AGEN, null = data lama → kartu "Pengiklan: nama").
  Formulir pasang iklan & edit member: pilihan wajib. Admin: dropdown "Pengiklan" di form edit listing.
  Detail: badge "Diiklankan langsung oleh pemilik" / "oleh agen / perantara". 41 listing lama masih kosong →
  admin isi (lihat bagian D laporan untuk nomor yang kemungkinan agen).
  Cadangan: `2026-11-22/appdb-pra-label-agen.dump`, image `mrpro:pra-label-agen-2026-11-22`.
- Build lokal 22-11 berhenti dengan `SecurityFatalError` Next.js 16.4.2 (rekomendasi upgrade) → diselesaikan di bawah.

## 22-11-2026 — Upgrade Next.js 16.4.2 → 16.4.6 (SELESAI, diminta pemilik)
- Alasan: 7 advisory npm tingkat sedang untuk next ≤16.4.4 (use cache bocor/poisoning, bypass SVG image
  optimizer, cookie HttpOnly di Edge, response injection self-hosted). 16.4.6 = patch terbaru jalur 16.4.
- Ubah: `next` + `eslint-config-next` 16.4.6 (`package.json`, `bun.lock`), commit `092b7ea`, branch `perbaikan/next-16.4.6`.
- Sebelum deploy: 104/104 tes, lint, typecheck, build produksi 39 rute tanpa peringatan keamanan, uji `next start`
  lokal (/, /properti, /titip-properti, /blog = 200).
- Cadangan: DB `2026-11-22/appdb-pra-next.dump`, compose `2026-11-22/docker-compose-pra-next.yml`,
  image `ghcr.io/michkrisma7-cmd/mrpro:pra-next-2026-11-22`.
- Deploy Actions 44932860309 hijau; kontainer melapor next 16.4.6. Pemeriksaan pasca-deploy LULUS (9 halaman 200,
  gambar `/_next/image` 200, chat POST 200 berisi jawaban, Lavile 200, kontainer Up, log tanpa error).
  Rollback otomatis TIDAK diperlukan.
- Cek ulang setelah 3+ menit: tetap lulus. Memori `mrproweb` 147/768 MB (sebelumnya tercatat ±720 MB, kemungkinan
  karena baru dijalankan ulang; pantau), n8n 386/640 MB.
- Rollback manual bila nanti perlu: `git revert 092b7ea && git push origin main` (CI deploy ulang 16.4.2),
  atau cepat di VPS: tag `mrpro:pra-next-2026-11-22` → `mrpro:latest` lalu `docker compose up -d` di `/root/web-me`.

## 22-11-2026 siang — Rolling 4x sehari + SEO keyword (SELESAI, tayang `fb571ca`)
- **Rolling** (Bagian 3): dihitung di query (`lib/listing-rotation.ts`), bukan n8n/kolom rank — tidak bisa macet,
  tidak membebani n8n. Putaran = hari sejak 2026-01-01 × 4 + slot (00/06/12/18 WIB); hari genap dibalik;
  offset = putaran × `LISTING_SHIFT_PER_ROUND` (18) mod N. Listing baru (`NEW_LISTING_DAYS`=7, kolom baru
  `publishedAt`) selalu di atas. Berlaku di beranda, `/properti`, `/wilayah/*`. Terverifikasi live (putaran 1301).
  Untuk video harian: listing teratas = hitung ulang dengan `rotateIds()` atau ambil halaman 1 `/properti`.
- **SEO** (Bagian 2): landing `/wilayah/<area>` dan `/wilayah/<area>/<kategori>` (15 wilayah incl. 11 kecamatan
  × 5 kategori), noindex bila <3 listing; 14 halaman layak indeks di sitemap. Beranda title/H1 berkeyword +
  blok link wilayah. Detail: title "<judul> di <kecamatan>, <kota> – Rp …" ≤65, meta KT/KM/LT/LB/harga.
- Laporan & peta keyword (VPS): `/root/backup-mrproperti/seo/` (`LAPORAN-SEO.md`, `peta-keyword.csv`,
  `baseline-2026-11-22.csv`). Kalender 12 judul blog ada di laporan — menunggu persetujuan pemilik.
- Lighthouse mobile sesudah: beranda P52 (sebelum 30–34), SEO 100; landing P35; detail P31 (TBT ±9,6 s).
- Cadangan: DB `2026-11-22/appdb-pra-rolling-seo.dump`, image `mrpro:pra-rolling-seo-2026-11-22`.
- Tindak lanjut teknis: ~~soft-404~~ (selesai, lihat bawah); TBT tinggi di detail/landing.

## 22-11-2026 siang — Perbaikan soft-404 (SELESAI, tayang `91c11f7`, Actions 44985877261)
- Masalah: halaman tidak ada (`/wilayah/xx`, `/properti/<slug-salah>`, `/blog/...`, `/layanan/...`) membalas
  HTTP 200 + noindex (soft-404), juga untuk Googlebot; `/wilayah/xx` punya meta robots ganda bertentangan.
- Penyebab: `<Suspense fallback={<Loading />}>` di root layout + `app/loading.tsx` memulai streaming sebelum
  `notFound()` → status terkunci 200 (lihat docs Next 16 `loading.md` › Status codes).
- Perbaikan: konten halaman tidak lagi dibungkus Suspense (`connection()` tetap, semua rute tetap dinamis);
  kerangka kartu dipindah ke `components/page-skeleton.tsx` (dipakai beranda); `app/not-found.tsx` set robots
  noindex. **Jangan tambahkan lagi `loading.tsx` / Suspense di atas halaman yang bisa `notFound()`.**
- Bonus: judul detail tidak lagi berakhir "… Dijual di – Rp" (0/39 judul bermasalah).
- Bukti live: semua halaman tidak ada → 404 (browser & Googlebot); 116/116 URL sitemap → 200 + index, follow.
- Cadangan: DB `2026-11-22/appdb-pra-soft404.dump`, image `mrpro:pra-soft404-2026-11-22`.
  Rollback: `git revert 96b3e09 91c11f7` + push, atau tag image itu → `latest` + `docker compose up -d`.

## 22-11-2026 ±12:00 — Audit teknis 2.6 lanjutan (SELESAI, tayang `5a8119d`)
- Listing `ARCHIVED` (terjual/tidak tersedia) → redirect permanen ke `/wilayah/<area>` (atau `/properti`),
  bukan 404 (`getRetiredListingTarget` di `lib/data.ts`). REJECTED/tidak ada tetap 404.
- `www.mrproperti.com` error 525 → blok Caddy baru `redir` 301 ke apex (append + validate + reload, tanpa restart;
  cadangan `2026-11-22/Caddyfile.pra-www`). Lavile tetap 200.
- Peta Google di detail = facade "Tampilkan peta lokasi" (`components/map-embed.tsx`): detail P58, 532 KB, LCP 4,2 s.
- Blog Groq terbit 07:00 & 11:00 WIB (terverifikasi), tetapi judul berpola "… Koridor Bekasi‑…‑Cikampek" →
  perlu kalender judul (menunggu pemilik).
- Laporan akhir Bagian 8: VPS `/root/backup-mrproperti/LAPORAN-AKHIR.md` (bukti 35/37 workflow lama identik,
  Lavile sha256 sama; daftar rollback; keputusan yang menunggu pemilik).

## 22-11-2026 sore — Tahap 1 RAM `mrproweb` (dikerjakan PEMILIK sendiri)
- Pemilik mengedit `/root/web-me/docker-compose.yml`: env `MALLOC_ARENA_MAX=2` dan
  `NODE_OPTIONS=--max-old-space-size=384` untuk `mrproweb`, lalu container dijalankan ulang.
- Dicek Claude (hanya baca): kedua env terbaca di container; `mem_limit: 768m` tidak berubah.
  Memori ±16:00 WIB: `mrproweb` 221/768 MB, `n8n-n8n-1` 308/640 MB, caddy 23/96 MB; RAM tersedia ±828 MB, swap 195 MB.
- Catatan: compose ini bukan dari git; bila image/compose dibuat ulang dari CI, pastikan kedua env tetap ada.

## Tahap 2 — chatbot keluar dari n8n (RENCANA, menunggu persetujuan pemilik)
- Laporan rencana disampaikan di sesi 22-11-2026 sore; belum ada kode/perubahan server.
- Ringkas: service Go kecil, satu container per website (Lavile & MRP terpisah), URL tetap lewat route Caddy,
  uji berdampingan → alihkan → nonaktifkan workflow n8n. n8n tetap hidup untuk blog.
- DISETUJUI pemilik (pindah 1:1 dulu; MRP dulu, Lavile setelah MRP stabil 1–3 hari; port 5678 dikerjakan terpisah
  sesudahnya; diff `BERSAMA.caddy` wajib ditunjukkan & disetujui sebelum reload; workflow n8n tetap aktif).
- 22-11 sore: `services/chatbot-mrp/` (Go, image scratch 9,9 MB) jalan di VPS `/root/chatbot-mrp`, container
  `chatbot-mrp`, port `127.0.0.1:8081` saja, BELUM disambung ke Caddy. RAM 1,5–5,4 MB / 64 MB.
  `go test` 1:1 vs kode node n8n live lulus. Uji banding `uji-banding.py`: 12/12 kasus status & bentuk sama.
- **22-11-2026 16:41 WIB — DIALIHKAN** (disetujui pemilik, snapshot server dibuat pemilik): `BERSAMA.caddy` mendapat
  `handle /webhook/mr-konsultasi { reverse_proxy chatbot-mrp:8080 }` + `handle { reverse_proxy n8n:5678 }`;
  validate + reload (tanpa restart). Cadangan: VPS `/root/backup-mrproperti/2026-11-22/BERSAMA.caddy.pra-chatbot-mrp-164146`.
  Cek 5 titik (`/root/chatbot-mrp/cek-5-titik.sh`) sebelum & sesudah: semua LULUS; chat MRP terbukti dilayani Go.
  Workflow `MRP-Chat-groq` di n8n TETAP AKTIF (cadangan) sampai pemilik setujui dimatikan.
  Rollback: `cp <cadangan> /root/caddy/sites/BERSAMA.caddy && docker exec caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile`.
- **22-11-2026 22:46 WIB — verifikasi ulang** (atas persetujuan tertulis pemilik dengan 5 syarat; route sudah
  terpasang sejak 16:41, jadi TIDAK diubah/di-reload ulang): caddy & chatbot-mrp satu jaringan Docker `hostme`,
  `wget http://chatbot-mrp:8080/healthz` dari container caddy → `ok`; `caddy validate` → Valid.
  `cek-5-titik.sh`: 0 GAGAL — chat MRP 200 (handoff False, 6 sumber, dilayani Go), chat Lavile 200,
  editor n8n 200, n8n /healthz 200, mrproperti.com 200, lavilecikarang.com 200.
  `MRP-Chat-groq` aktif=True. Kode `services/chatbot-mrp` sudah di commit `ea8deaf` (branch `fitur/chatbot-mrp`), `.env` di-ignore.
  `free -h`: Mem 1,9Gi total, 1,2Gi used, 127Mi free, 754Mi buff/cache, **692Mi available**; Swap 362Mi/1,0Gi.
  `docker stats --no-stream` 22:46 WIB: chatbot-mrp 5,0/64 MiB · mrproweb 252,9/768 MiB · caddy 55,3/96 MiB ·
  n8n-n8n-1 361,6/640 MiB (1,0% CPU).
  Catatan: swap naik 195→362 MB sejak sore & caddy 23→55 MB; ikut dipantau.
- Berikutnya: pantau 1–3 hari (`docker logs chatbot-mrp`, `docker stats`), lalu minta izin matikan workflow n8n,
  baru mulai Lavile. Setelah chatbot selesai: port 5678 → 127.0.0.1 (terpisah).
- Lavile: angka cicilan di prompt "Rp1,6–1,9 jutaan" — hitungan 4,25%/25 th: 299 jt→1,62 jt, 359 jt→1,94 jt,
  449 jt→2,43 jt. Menunggu konfirmasi brosur; JANGAN diubah dulu.

## 22-11-2026 malam — Paket pekerjaan A–D (branch `fitur/chatbot-mrp`, belum di-push)
Commit: `dfcf780` (A + aturan CLAUDE.md), `da3fd0c` (B4). Cadangan n8n: VPS `/root/n8n-backup/MRP-20261122-225753` (40 workflow).
Log server: VPS `/root/backup-mrproperti/LOG.md`.

**Selesai**
- A1 Pemantauan chatbot-mrp (16:29–22:57): 16 permintaan — 10 `groq_ok` (rata 1,1 s, maks 1,7 s), 4 `auth_403`
  (uji token salah), 2 `pesan_tidak_valid` (uji); 0 error. Sejak dialihkan 16:41 baru 2 permintaan, keduanya tes
  Claude — belum ada chat konsumen nyata. Workflow n8n `MRP-Chat-groq` (`UI0HBaX7pESdq629`) **DINONAKTIFKAN** 22:58
  (tidak dihapus; sudah tidak menerima lalu lintas karena Caddy → Go). Balik: `POST /api/v1/workflows/UI0HBaX7pESdq629/activate`.
  ⚠ Rollback Caddy ke n8n sekarang juga perlu mengaktifkan workflow ini lagi.
- A2 Prompt baru (`services/chatbot-mrp/prompt.txt`): sapaan Kakak, maks ±70 kata, id hanya di `source_ids`,
  tidak menawarkan WhatsApp/survei kecuali ditanya, harga tak tercantum → bilang jujur. Tes `go test` lulus
  (perbandingan 1:1 dengan n8n tetap, hanya teks prompt ditukar). Image `chatbot-mrp:20261122-c` (= `:latest`).
  Uji 6 pertanyaan lama vs baru (container uji): panjang 34–145 → 23–75 kata, Kak 5/6, id mentah 0/6, sodoran WA 0/6.
  **BELUM dipasang live** — perlu container dibuat ulang (lihat Menunggu). Teks website "kamu" → "Kakak"
  (`chat-widget.tsx`, `route.ts`) ikut berlaku setelah deploy.
- A3 Cuci AC: data layanan halaman `/layanan/*` ada di **`lib/home-services.json`** (bukan DB; tabel `Service`
  hanya 4 baris, tanpa AC). Kategori `ac` punya `priceGroups` untuk pasang/bongkar + material, tetapi
  **Cuci AC dan Service AC tidak punya harga**. Selain itu chat dulu tidak membaca `priceGroups` sama sekali →
  diperbaiki di `lib/chat-knowledge.ts` (sumber `catalog:<slug>:harga`; berlaku setelah deploy). Lint, typecheck, 105 tes lulus.
- B4 Blog: workflow baru `MRP-MR Properti Blog — Next.js-groq-tulisulang` (`hcy4FGRL9PI5Ywlk`, AKTIF), lama
  `Zm0ZBgFDJW0P1u7H` dinonaktifkan. Artikel di luar 350–1000 kata → jeda 60 s → tulis ulang sekali (gpt-oss-120b)
  → validasi lagi; masih di luar → error, tidak terbit. Builder `workflows/n8n/build-mrp-blog-tulisulang.py`.
  Uji dryRun via webhook (workflow UJI `oCYUDgg4ToTD7gYn`, sudah diarsip): 172 kata → ditulis ulang → 413 kata, lolos.
  Cek eksekusi asli pertama 23-11 07:00 WIB.
- B5 Facebook: tidak diaktifkan. Lihat pilihan di Menunggu.
- B6 Port 5678: sudah **tertutup dari internet** (aturan `DOCKER-USER` DROP eth0 3000,5678 untuk IPv4 & IPv6,
  permanen via `/etc/systemd/system/docker.service.d/ingress-guard.conf` → `/usr/local/sbin/container-ingress-guard`);
  dicek dari laptop: 5678 & 3000 tidak terjangkau, editor n8n via domain 200, webhook Lavile via domain 200.
  Pemakai 5678 di server: Caddy (`n8n:5678` lewat jaringan Docker) dan skrip API (`localhost:5678`) — keduanya tetap
  jalan bila di-bind 127.0.0.1. Perubahan compose BELUM dilakukan (butuh n8n dibuat ulang → snapshot).
- D9 Swap: pencatat per jam `/root/backup-mrproperti/MRP-pantau-swap.sh` (cron menit 7, tanda `# MRP-pantau-swap`,
  cadangan crontab `2026-11-22/MRP-crontab-root.bak-*`) → `/root/backup-mrproperti/MRP-pantau-swap.log`.
  Temuan 23:23: swap 492 MB = ±270 MB benar-benar di swap + ±210 MB `SwapCached` (sudah di RAM juga).
  Per container (RAM+swap): **n8n 406+238 MB** (batas 640m, `memswap_limit 1152m` → n8n menekan dirinya sendiri ke swap),
  mrproweb 132+128 MB (halaman menganggur, swappiness 60), caddy 34+2, chatbot-mrp 5+0.

**Server 22-11-2026 23:25:20 WIB**
```
free -h:  Mem 1.9Gi total, 1.1Gi used, 401Mi free, 639Mi buff/cache, 850Mi available; Swap 492Mi/1.0Gi
docker stats --no-stream:
chatbot-mrp-uji2 5.1MiB/64MiB · chatbot-mrp-uji 4.4MiB/64MiB · chatbot-mrp 5.6MiB/64MiB
mrproweb 132.5MiB/768MiB · caddy 23.0MiB/96MiB · n8n-n8n-1 391.5MiB/640MiB (0.5% CPU)
```
mrproperti.com & lavilecikarang.com HTTP 200.

**Menunggu keputusan / snapshot pemilik**
1. Snapshot, lalu (a) pasang prompt baru: `cd /root/chatbot-mrp && docker compose up -d`
   (balik: `docker tag chatbot-mrp:pra-prompt-20261122 chatbot-mrp:latest && docker compose up -d`);
   (b) hapus 2 container uji (hook Claude memblokir hapus container): `docker rm -f chatbot-mrp-uji chatbot-mrp-uji2`.
2. Isi harga **Cuci AC** dan **Service AC** di `lib/home-services.json` kategori `ac` → `priceGroups` (format
   `{"label": "...", "price": "Rp... – Rp... per unit"}`). Usulan baris: cuci AC wall split 0,5–1 PK; 1,5–2 PK;
   cassette/standing; cuci besar (bongkar); service/cek AC; isi/tambah freon R32/R410A/R22. Lalu deploy (push main).
3. Deploy website (push `main`) untuk: teks Kakak + harga layanan masuk chat. Ditunda sampai harga AC diisi?
4. Facebook — pilihan yang ada (keduanya NONAKTIF, credential sama `Facebook Graph account`, token Page):
   a. `MR Properti — Terbitkan ke FB Page Mas Meri` (`AI1r5dNMNvBycaSR`): Page ID dikunci `61595418122522`.
   b. `MR Properti — Terbitkan ke Facebook Pages` (`kifJ7Sx89IfrvFkS`): Page = pemilik token (`me`).
   Daftar lengkap Page yang bisa diakses token tidak dibuka (perlu mendekripsi token). Catatan: website sudah
   mengisi `N8N_FACEBOOK_WEBHOOK_URL`, jadi tiap Terbitkan saat ini muncul pesan "pengiriman gagal" (tidak merusak).
5. Port 5678 → 127.0.0.1 (lapisan kedua; sudah tertutup firewall): ubah `/root/n8n/compose.yml` `- 5678:5678`
   → `- 127.0.0.1:5678:5678`, lalu `docker compose up -d` di `/root/n8n` (n8n mati ±30–60 s; chat Lavile & blog
   ikut terhenti sebentar). Image lokal `:latest` = image yang jalan (2.31.5, `cda6baf…`), jadi tidak ganti versi.
6. Bagian C (chatbot Lavile ke Go) BELUM dimulai: (i) syarat "setelah A selesai" belum terpenuhi (prompt MRP belum
   live); (ii) kode Lavile semestinya di `~/Proyek/Lavile-Cikarang`, sedangkan aturan MRP melarang sesi ini
   menyentuh file Lavile; (iii) sambung Caddy butuh snapshot. Perlu izin: kerjakan di sesi/folder Lavile?
7. C8 cicilan Lavile (usulan teks, menunggu brosur; file Lavile tidak dibuka): "Cicilan mulai ±Rp1,6 jutaan/bulan
   (tipe 299 jt) hingga ±Rp2,4 jutaan/bulan (tipe Hook 449 jt), simulasi KPR 4,25%/25 tahun tanpa DP; angka final
   mengikuti brosur & bank." (299→1,62 jt; 359→1,94 jt; 449→2,43 jt.)
8. Usulan swap (pilih setelah ±2–3 hari data log): (a) n8n `mem_limit` 640m → 768m, atau `memswap_limit` diturunkan
   ke 768m supaya n8n tidak menimbun swap (keduanya = n8n dibuat ulang → snapshot, bisa digabung dengan no. 5);
   (b) `sysctl vm.swappiness=20` (tanpa restart, bisa dibalik); (c) pangkas data eksekusi n8n
   (`EXECUTIONS_DATA_PRUNE=true`, `EXECUTIONS_DATA_MAX_AGE=72`) — juga lewat compose.

**Temuan lain**
- Chat menjawab "over kredit" keliru (dianggap fasilitas pembiayaan); knowledge tidak punya penjelasannya.
  Usul: tambah teks over kredit (oper sisa KPR + uang over) ke `site:overview`/`site:kpr`.
- Listing "Rumah murah eksklusif Rp50 jt" (3KT) kemungkinan salah harga — cek di admin.
- Node `Jadwal dan Topik` di workflow blog menyimpan API key blog sebagai teks biasa; sebaiknya dipindah ke credential.

**Langkah berikutnya**
1. Setelah snapshot: no. 1 & 5 (+ 8a) sekaligus, lalu `sh /root/chatbot-mrp/cek-5-titik.sh` + uji 6 pertanyaan.
2. 23-11 07:00 WIB: cek eksekusi blog `hcy4FGRL9PI5Ywlk` (terbit, tulis ulang terpakai atau tidak).
3. 23–25-11: baca `MRP-pantau-swap.log`; pilih usulan swap.
4. Isi harga AC → deploy website.
5. Bagian C setelah izin lokasi kerja Lavile.

## 22–23-11-2026 tengah malam — lanjutan setelah snapshot pemilik (SELESAI)
Keputusan pemilik: harga cuci/service AC JANGAN diisi (oper ke admin WA); Facebook DIBATALKAN sementara (workflow FB
tetap nonaktif, tidak diubah); listing Rp50 jt BENAR (jangan diubah); Bagian C (Lavile) TIDAK di sesi MRP.

1. **Prompt chatbot-mrp live** 23:3x WIB: image `chatbot-mrp:20261123-d` (Kakak, singkat, tanpa id, tanpa sodoran WA,
   harga cuci/service AC → handoff, pengetahuan tetap over kredit). Cadangan image `chatbot-mrp:pra-prompt-20261122`.
   Uji live: over kredit kini benar (oper sisa KPR + uang over + alih debitur, 49 kata); harga cuci AC & service AC →
   handoff; "Ada jasa cuci AC?" → cakupan + estimasi tanpa harga; "Halo" → sapaan Kak.
2. **n8n dibuat ulang 23:43:30–23:44:02 WIB (±32 s mati)**, image sama (`cda6baf…`, 2.31.5). `/root/n8n/compose.yml`:
   port `127.0.0.1:5678:5678`; `memswap_limit` 1152m → **768m** (swap n8n maks 128 MB); env
   `NODE_OPTIONS=--max-old-space-size=320`, `MALLOC_ARENA_MAX=2`, `N8N_RUNNERS_MAX_OLD_SPACE_SIZE=160`;
   `mem_limit` 640m tetap. Pembersihan riwayat eksekusi TIDAK dipakai: hanya 167 eksekusi / 5,7 MB data (bawaan
   n8n sudah memangkas), tidak berpengaruh ke RAM. Cadangan: `2026-11-22/MRP-n8n-compose.yml.bak-20261122-2343`.
   Balik: `cp <cadangan> /root/n8n/compose.yml && cd /root/n8n && docker compose up -d`.
   Sesudahnya: 2 workflow aktif tetap (Lavile chat, blog tulisulang); 5678 hanya `127.0.0.1`; port 5678 & 3000 tidak
   terjangkau dari luar; cek 5 titik LULUS.
   Swap: **492 MB → 116 MB** (n8n 406+238s → 484+0s; mrproweb 132+128s → 112+0s). n8n setelah start: anon 400 MB
   (proses utama 390, runner 88), file 41, kernel 41 → sisa ±150 MB ke batas 640m. PANTAU: kalau anon terus naik
   mendekati 600 MB, naikkan `mem_limit` ke 704m atau longgarkan heap (`--max-old-space-size=384`).
3. **Website dideploy** `3a28688` (branch `rilis/chat-harga-ac` dari `origin/main`, hanya 6 file chat; Actions
   45046156202 sukses). Cadangan image sebelum deploy: `mrproweb-cadangan:pra-chat-harga-20261123` (`89340750…`);
   balik: `git revert 3a28688 && git push origin main`. Isi: daftar harga layanan (`priceGroups`) masuk knowledge chat;
   pertanyaan harga cuci/service AC dijawab tetap "…lewat WhatsApp 08811063079…" + tombol wa.me/628811063079 tanpa
   memanggil model (`asksUnpricedAcService`); teks widget "kamu" → "Kakak". Sebelum deploy: lint, typecheck,
   107 tes, build lulus. Dicek produksi: "Berapa harga cuci AC?" → balasan admin WA; "Harga pasang AC 1 PK?" →
   "Rp300.000 – Rp450.000 per unit" dari sumber "Daftar harga AC". 4 domain (+www) HTTP 200.
4. Facebook: tidak disentuh. 5. Listing Rp50 jt: tidak disentuh.

**Server 22-11-2026 23:55:31 WIB**
```
free -h:  Mem 1.9Gi total, 1.2Gi used, 277Mi free, 689Mi buff/cache, 777Mi available; Swap 116Mi/1.0Gi
docker stats --no-stream:
mrproweb 112.2MiB/768MiB · n8n-n8n-1 466MiB/640MiB (0.9% CPU) · chatbot-mrp 5.1MiB/64MiB
chatbot-mrp-uji2 4.1MiB/64MiB · chatbot-mrp-uji 6.4MiB/64MiB · caddy 13.9MiB/96MiB
```

**Menunggu pemilik**
- ~~Hapus 2 container uji~~ — SUDAH dihapus pemilik 23-11-2026 10.16.
- Harga cuci/service AC (kalau sudah ada) → isi `lib/home-services.json` kategori `ac` lalu hapus gerbang
  `asksUnpricedAcService` + aturan AC di `services/chatbot-mrp/prompt.txt`.
- Facebook: ditunda pemilik. Bagian C (Lavile ke Go): sesi/folder Lavile.

**Langkah berikutnya**
1. 23-11 07:00 WIB: cek eksekusi blog `hcy4FGRL9PI5Ywlk` (terbit? tulis ulang terpakai?).
2. 23–25-11: baca `/root/backup-mrproperti/MRP-pantau-swap.log` (per jam). Perhatikan anon n8n dan swap; kalau swap
   naik lagi, laporkan penyebab + usulan (swappiness 20, atau batas n8n).
3. Pantau `docker logs chatbot-mrp` untuk chat konsumen nyata (hasil, ms) setelah prompt baru.
4. Usulan kecil: sapaan "Kak" belum selalu muncul (over kredit tanpa "Kak"); API key blog di node `Jadwal dan Topik`
   sebaiknya pindah ke credential.

## 23-11-2026 ±10:30–10:55 WIB — Aturan izin disederhanakan + paket Lavile (diminta pemilik)

Aturan izin disederhanakan (final, 23-11-2026 ±10:55): `~/.claude/settings.json` = `defaultMode: acceptEdits` +
izinkan semua Bash/Read/Edit/Write/WebFetch (daftar allow/ask per perintah dihapus; `.claude/settings.json` Lavile
dikosongkan; MRP tidak punya). Penjaga tunggal = hook `~/.claude/hooks/guard.py` (v3): mengurai perintah per segmen
dan hanya menilai perintah yang benar-benar dijalankan (heredoc, echo, string, isi .md diabaikan; ikut menelusuri
`ssh host '...'`, `bash -c`, `docker exec`). Minta konfirmasi hanya untuk: reboot/shutdown/poweroff; apt
upgrade/full-upgrade/do-release-upgrade; docker system prune, docker volume rm, docker compose down; docker rm/stop
container produksi (mrproweb, n8n, caddy, chatbot-mrp, chatbot Lavile); ufw/iptables yang mengubah aturan; rm -rf pada
/, /root, /srv, /home, /etc, /var, /tmp itu sendiri, folder data website, volume docker; git push --force. Diuji 29
contoh (17 boleh, 12 tanya), sesuai harapan. CLAUDE.md global/MRP/Lavile ditulis ulang ≤15 baris; rincian teknis
dipindah ke `~/mr-properti/CATATAN-SERVER.md` dan `~/Proyek/Lavile-Cikarang/docs/CATATAN-SERVER.md`.
Cadangan semua file aturan lama: `~/.claude/backup-aturan-20261123/` (juga `~/.claude/backups/*-20261123-1026`).
- Tidak diubah: `AGENTS.md` MRP (larangan CI/CD tetap).
- Paket Lavile 1–6 dikerjakan dari sesi ini; detail di `~/Proyek/Lavile-Cikarang/PROGRESS.md`. Di server bersama
  hanya `/root/caddy/sites/LVL.caddy` yang diubah (reload, bukan restart); MRP.caddy, mrproweb, n8n tidak diubah;
  mrproperti.com tetap 200 (www 301) setelah setiap reload. RAM tersedia 778 MB sebelum → 792 MB sesudah.
- Container uji `chatbot-mrp-uji` dan `chatbot-mrp-uji2` SUDAH dihapus pemilik (23-11-2026 10.16 WIB).

## 23-11-2026 10:07 WIB — Pemeriksaan kapasitas RAM (hanya baca, tidak ada yang diubah)

**Keputusan: CUKUP 2 GB.** Tidak perlu resize ke 4 GB.

Kondisi sekarang (10:07 WIB, uptime 42 hari, load 0,16 / 0,06 / 0,02, 2 CPU):
```
free -h:  Mem 1.9Gi total, 1.2Gi used, 391Mi free, 576Mi buff/cache, 760Mi available; Swap 268Mi/1.0Gi
df -h /:  30G, terpakai 14G (47%)
docker stats: n8n-n8n-1 432/640 MiB (68%) · mrproweb 255/768 MiB (33%) · caddy 35/96 MiB (37%)
              chatbot-mrp 6/64 MiB · chatbot-mrp-uji 5/64 · chatbot-mrp-uji2 4/64
```
Riwayat sejak konfigurasi baru (n8n dibuat ulang 22-11 23:43 WIB), dari `MRP-pantau-swap.log` + sysstat per 10 menit:
- RAM tersedia terendah: **761 MB** (log, 23-11 10:07) / 774 MB (sar, 23-11 00:40).
- Swap tertinggi: **363 MB** (sar, 23-11 02:20; log 03:07 = 328 MB). Sejak 03:07 stabil ±268 MB. 0 sampel > 600 MB.
- OOM: tidak ada di `dmesg`/`journalctl -k`. Semua container `RestartCount=0`, `OOMKilled=false`
  (start 22-11 malam = pembuatan ulang terencana, bukan crash). cgroup `oom_kill 0` di semua container.
- n8n: hourly 335–487 MB (maks 76% batas). TETAPI cgroup mencatat `memory.peak` 640 MB dan `memory.events max 6`
  (6 kali menyentuh batas), plus `memory.swap.events fail 5803` (jatah swap 128 MB sempat penuh, sekitar 02–03 WIB,
  saat itu tidak ada eksekusi workflow). Isi sekarang: anon 373 MB, file 52 MB → anon TIDAK naik terus.
  Paling dekat batas = n8n; container lain jauh dari batas.

Data lama sebelum perbaikan (sebagai pembanding, tidak dipakai untuk keputusan): 20-11 RAM tersedia sempat 288 MB
(21:30), swap 600–1000 MB hampir sepanjang 20–21-11 (116 dan 93 dari 143 sampel); 22-11 maks 729 MB. Masalah itu
hilang setelah Tahap 1 (mrproweb) dan n8n `memswap_limit` 768m.

Alasan cukup 2 GB: sejak perbaikan tidak ada OOM/restart, RAM tersedia tidak pernah < 760 MB, swap maks 363 MB.
Satu-satunya titik sempit adalah **batas container n8n (640m)**, bukan RAM server — 4 GB tidak memperbaikinya kalau
batas n8n tidak dinaikkan, sedangkan menaikkan batas itu muat di 2 GB (sisa ±760 MB).

Yang bisa dihemat / disiapkan (belum dikerjakan, perlu persetujuan + cadangan):
1. ~~Hapus container uji~~ — SUDAH dihapus pemilik 23-11 10.16.
2. Kalau n8n terus menyentuh batas: naikkan `mem_limit` 640m → 704m (n8n dibuat ulang ±30 s).
3. Chatbot Lavile pindah dari n8n ke Go: n8n tinggal 1 workflow (blog) → lonjakan per-chat hilang, batas n8n bisa
   tetap 640m. Hemat besar (±430 MB) hanya kalau blog juga keluar dan n8n dimatikan; dasar n8n ±400 MB idle.
4. `sysctl vm.swappiness=20` (tanpa restart) kalau swap mrproweb (81 MB idle) mengganggu.

Cek tambahan: eksekusi blog 23-11 07:0x WIB `success` (langkah 1 di bawah terjawab). Chat Lavile 23-11 04:xx WIB 1 error.

**Langkah berikutnya:** jalankan paket perbaikan website Lavile (SEO/robots, app.js, header keamanan, optimasi,
validasi HTML) — di sesi/folder Lavile. Pencatat RAM per jam tetap jalan; cek ulang 25-11.

## Status 22-11-2026: SELESAI
Pemilik menyatakan pekerjaan selesai. Yang ditunda (jangan dikerjakan tanpa permintaan baru):
- Kalender 12 judul blog (usulan di VPS `seo/LAPORAN-SEO.md`) — DITUNDA.
- Video media sosial (Bagian 7) — DITUNDA (lihat bawah).
- Data footer (alamat/NIB) & halaman layanan tukang per kota — belum dikerjakan, menunggu data/permintaan pemilik.
- Google Search Console & Google Business Profile — ditunda sejak awal.

## Video media sosial (Bagian 7) — DITUNDA
Ditunda, keputusan render laptop/Nevacloud belum final. Atas permintaan pemilik (22-11-2026): jangan membuat
file, script, atau setup apa pun untuk video sampai ada keputusan.

## Lokasi backup
| Apa | Lokasi |
| --- | --- |
| Database `appdb` (pg_dump -Fc) | VPS `/root/backup-mrproperti/2026-11-21/appdb.dump` |
| Semua workflow n8n (37) + credential terenkripsi | VPS `/root/backup-mrproperti/2026-11-21/` (`n8n-workflows/`, `n8n-workflows-all.json`, `n8n-credentials-encrypted.json`) |
| Checksum (bukti workflow Lavile tak berubah) | VPS `/root/backup-mrproperti/2026-11-21/SHA256SUMS` |
| Log pekerjaan server | VPS `/root/backup-mrproperti/LOG.md` |
| Screenshot sebelum–sesudah + log lokal | laptop `~/mr-properti/catatan-kerja/` (tidak masuk git) |

Restore DB: `sudo -u postgres pg_restore --clean --no-owner -d appdb /root/backup-mrproperti/2026-11-21/appdb.dump`

## Menunggu keputusan / aksi pemilik
1. ~~Deploy, n8n API key, Groq API key~~ — selesai 21-11-2026 (key di `/root/backup-mrproperti/.keys`, chmod 600).
4. Tahap 6 (video): DITUNDA, keputusan render laptop/Nevacloud belum final. Jangan buat apa pun untuk video.
5. ~~Upgrade keamanan Next.js~~ — selesai 22-11-2026 (16.4.6).

## Langkah berikutnya
0. Langkah 1, 2, dan 3 di bawah SUDAH SELESAI (3 = blog Groq, tunggu verifikasi terbit 07:00 WIB 22-11) (lihat bagian "Selesai 21-11-2026 malam"). Berikutnya mulai dari 4.
1. Deploy (setelah disetujui), dari `~/mr-properti`:
   ```bash
   git checkout main && git merge --ff-only perbaikan/profesional && git push origin main
   ```
   Pantau Actions `Deploy Web to Production`, cek mrproperti.com & `curl -sI https://lavilecikarang.com`,
   ukur ulang Lighthouse (angka "sesudah"). Rollback: `git revert` lalu push.
2. Setelah key tersedia — perbaikan chatbot (workflow MRP saja):
   a. Credential baru `MRP Chat Webhook` (Header Auth, nama `x-mr-token`, nilai = `N8N_CHAT_WEBHOOK_SECRET` di
      `/root/web-me/.env`) dan `MRP Groq`.
   b. Duplikat `inj1Io85s1qSdDNZ` → `MRP-Chat-groq` dengan path uji, ganti model ke Groq
      (`openai/gpt-oss-120b` / `llama-3.3-70b-versatile`), tambah tool cari listing berfilter, memori, prompt baru.
   c. Tes 5 pertanyaan (`catatan-kerja`/skrip tes; target ≥4/5 terjawab, no. 5 dioper ke admin).
   d. Nonaktifkan workflow lama (jangan hapus), aktifkan `MRP-Chat-groq` di path `mr-konsultasi`.
   e. Sisi website: longgarkan gerbang handoff di `app/api/chat/route.ts` (`sources.length < 2`) dan
      pencarian `lib/chat-knowledge.ts` (filter harga/wilayah/KT).
3. Blog `MR Properti Blog — Next.js` (`cpGzooOPgTWuBXQc`, aktif): pindah dari OpenRouter `:free`/Gemini ke Groq
   dengan pola duplikat-tes-tukar yang sama.
4. Tahap 5 sisa (butuh DB): poin 8–12 (typo fasilitas, rapikan deskripsi — tampilkan contoh dulu,
   laporan listing perlu dicek, listing luar area, label Agen/Pemilik), 13 (data footer), 14, 19,
   badge "Terverifikasi" (kolom baru). Selidiki TBT ±9,5 s di beranda.
5. ~~Tahap 4.5 rolling~~ selesai 22-11. Tahap 6 video DITUNDA (lihat atas). Tahap 7 laporan akhir.
6. SEO lanjutan: tulis 12 artikel blog (setelah judul disetujui), halaman layanan per kota (2.4.4),
   Google Search Console + Business Profile (ditunda, menunggu pemilik). Tambah listing di kategori noindex.
