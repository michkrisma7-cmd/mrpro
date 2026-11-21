# PROGRESS — MR Properti

Terakhir diperbarui: 21-11-2026 malam (deploy + chatbot Groq selesai).

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
4. Tahap 6 (video): VPS tidak cukup RAM (tersedia ±334 MB) → pilih render di laptop atau layanan
   berbayar (Creatomate/Shotstack — perlu persetujuan biaya).
5. Upgrade keamanan Next.js yang direkomendasikan saat build — diputuskan terpisah.

## Langkah berikutnya
0. Langkah 1 dan 2 di bawah SUDAH SELESAI (lihat bagian "Selesai 21-11-2026 malam"). Berikutnya mulai dari 3.
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
5. Tahap 4.5 `daily_featured` + Tahap 6 video setelah tempat render diputuskan. Tahap 7 laporan akhir.
