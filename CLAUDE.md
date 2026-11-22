## ATURAN TETAP – KODE PROYEK
- Proyek ini = MRP. Hanya boleh mengubah folder proyek ini dan /etc/caddy/sites/MRP.caddy.
- Dilarang mengubah file milik kode proyek lain (LVL).
- Caddyfile utama hanya boleh diubah kalau benar-benar perlu, selalu dengan backup → validate → reload → cek keempat domain (mrproperti.com, www.mrproperti.com, lavilecikarang.com, www.lavilecikarang.com) → rollback kalau gagal.
- Setiap laporan diawali kode proyek, contoh: "[MRP] selesai …"
- Backup, log, dan file sementara diberi awalan kode proyek, contoh: MRP-Caddyfile.bak-20261122-1220

## ATURAN WAJIB – BATAS PROYEK
- Sesi ini HANYA untuk mrproperti.com.
- DILARANG membaca-ubah, menghapus, deploy, atau menjalankan perintah apa pun pada file, folder, database, atau server lavilecikarang.com.
- Jika sebuah tugas menyentuh lavilecikarang.com, BERHENTI dan tanya saya dulu.

# MR Properti — mrproperti.com

Baca juga `AGENTS.md` (aturan Next.js 16, larangan CI/CD, target produksi). Jawab dan tulis catatan
dalam Bahasa Indonesia yang sederhana. Disusun 21-11-2026 dari catatan Lavile + perintah pemilik.

## Ringkas
- Next.js 16 + Prisma (PostgreSQL), repo `michkrisma7-cmd/mrpro`, folder lokal `~/mr-properti`.
- Produksi: container `mrproweb` (port 3000) di VPS Nevacloud `116.212.73.143` (hostname `n8n-mrproperti`),
  dideploy oleh GitHub Actions `deploy-vps.yml` **setiap push ke `main`**. Push ke `main` juga memicu
  Vercel (`beta.mrproperti.com`). Jadi: kerja di branch lokal; push/merge ke `main` = deploy produksi,
  hanya setelah backup + tes + build lulus dan pemilik setuju. Jangan ubah CI/CD (lihat AGENTS.md).
- Kontak WhatsApp (kedua website): 08811063079 / 628811063079 / https://wa.me/628811063079.

## Server bersama (jangan ganggu Lavile)
| Komponen | Pemilik | Catatan |
| --- | --- | --- |
| `caddy` (80/443). Host `/root/caddy/Caddyfile` (= `/etc/caddy/Caddyfile` di container, hanya `import sites/*.caddy`); blok MRP di host `/root/caddy/sites/MRP.caddy` (= `/etc/caddy/sites/MRP.caddy`) | BERSAMA (LVL.caddy, BERSAMA.caddy jangan diubah) | Jangan restart; reload hanya setelah validasi |
| `n8n-n8n-1` (n8n 2.31.5, SQLite, batas 640 MB) | BERSAMA | https://n8n.mrproperti.com, jangan restart |
| `mrproweb` + `/root/web-me` (compose project `web-me`) | MRP | Bukan checkout git; image dari GHCR |
| `/srv/lavilecikarang/` (situs statis via Caddy) | LAVILE | Jangan disentuh |
| Workflow `Chatbot Lavile - Groq` (ID `LavileChatGroq01`) | LAVILE | Jangan diubah; boleh disalin jadi `MRP-...` |

| PostgreSQL di host (`appdb`, dari container lewat `172.18.0.1:5432`) | MRP | Satu-satunya DB aplikasi |
| Media listing | MRP | S3 eksternal (Neon), bukan di VPS |

- Dicek 21-11-2026: RAM 1,9 GB (tersedia ±334 MB), swap 1 GB (terpakai ±481 MB), disk sisa 17 GB/30 GB,
  2 vCPU. `mrproweb` 720/768 MB (hampir batas), n8n 415/640 MB. Render video jangan di VPS ini.
- 22-11-2026 (diubah pemilik sendiri): `/root/web-me/docker-compose.yml` service `mrproweb` mendapat env
  `MALLOC_ARENA_MAX=2` dan `NODE_OPTIONS=--max-old-space-size=384` (mem_limit tetap 768m). Terverifikasi aktif di
  container. Dicek 22-11 ±16:00: `mrproweb` 221/768 MB, n8n 308/640 MB, RAM tersedia ±828 MB, swap 195 MB.
- Akses: `ssh root@116.212.73.143` dengan `~/.ssh/id_ed25519` (berfungsi dari sesi Claude sejak 21-11-2026).
- Cek Lavile sebelum & sesudah setiap perubahan: `curl -sI https://lavilecikarang.com | head -1` → 200.
- Backup DB: `pg_dump` lewat TCP ditolak `pg_hba.conf`; pakai socket lokal:
  `sudo -u postgres pg_dump --no-owner -Fc appdb > <folder>/appdb.dump`.
- Folder backup & log MRP di VPS: `/root/backup-mrproperti/<tanggal>/` dan `/root/backup-mrproperti/LOG.md`.

## n8n
- Backup dulu (skill `backup-n8n`, hasil di `/root/n8n-backup/<tanggal>/`).
- Workflow MRP yang aktif jangan diedit langsung: duplikat `MRP-<nama>`, tes, lalu tukar; nonaktifkan, jangan hapus.
- Perubahan tanpa restart n8n: lihat memori `n8n-update-tanpa-restart` (transaksi SQLite `workflow_history`
  + `workflow_entity`, lalu pastikan baris `webhook_entity` ada).
- Groq gpt-oss-120b dibatasi ±8000 TPM; beri jeda ±25 detik antar-tes. Tes webhook pakai User-Agent browser.
- Chat MRP: website `POST /api/chat` → webhook `mr-konsultasi` (header `x-mr-token`) → knowledge dari
  `GET /api/chat/knowledge`. Ekspor di `workflows/n8n/` (lihat `CHAT.md`); keadaan live bisa berbeda.
- Workflow aktif (22-11-2026): `Chatbot Lavile - Groq` (LAVILE), `MRP-Chat-groq` (`UI0HBaX7pESdq629`, MRP),
  `MRP-MR Properti Blog — Next.js-groq` (`Zm0ZBgFDJW0P1u7H`, MRP). Lama dinonaktifkan, tidak dihapus.
- n8n API key + Groq key: VPS `/root/backup-mrproperti/.keys` (chmod 600, jangan dicetak). Ubah workflow lewat
  API `http://localhost:5678/api/v1/...` (berlaku tanpa restart).
- Bandingkan credential tanpa membuka nilainya: `bash /root/backup-mrproperti/cek-cred.sh <credentialId>`.

## Status & langkah berikutnya
Lihat `PROGRESS.md` (selesai, lokasi backup, yang menunggu pemilik, langkah berikutnya). Ringkas:
- Tayang s.d. `fb571ca` (22-11-2026): Tahap 5, chatbot & blog Groq, label Pemilik/Agen, Next 16.4.6,
  rolling 4x sehari, landing SEO wilayah/kecamatan/kategori.
- Soft-404 diperbaiki (`91c11f7`): jangan pasang `loading.tsx`/Suspense di atas halaman yang bisa `notFound()`.
- Video (Bagian 7) DITUNDA — jangan buat file/script/setup video sampai pemilik memutuskan.
- Status 22-11-2026: selesai. Ditunda: kalender blog, video, data footer, layanan per kota, GSC & Business Profile.

## Kode penting
- Urutan listing (rolling 4x sehari + listing baru di atas): `lib/listing-rotation.ts`, dipakai
  `lib/catalog-query.ts` (beranda + `/properti`) dan `lib/area-query.ts` (`/wilayah/*`). Env: `NEW_LISTING_DAYS`,
  `LISTING_SHIFT_PER_ROUND`, simulasi `LISTING_ROTATION_ROUND`.
- Landing SEO: wilayah/kecamatan/kategori di `lib/areas.ts`, teks data di `lib/area-content.ts`, tampilan
  `components/area-landing.tsx`. Halaman <3 listing = noindex (`MIN_INDEXABLE_LISTINGS`).
- Data/caching: `lib/data.ts`, `lib/area-data.ts` (`unstable_cache` 60 detik, kunci = argumen).
- Chat: `app/api/chat/route.ts` (gerbang handoff di sisi website), `lib/chat-knowledge.ts`, `lib/chat.ts`.

## Perintah
```bash
source ~/.nvm/nvm.sh
npx -y bun@1 install --frozen-lockfile   # dependency sesuai bun.lock
npm run db:generate                       # wajib sebelum tes
npx tsx --test tests/*.test.ts            # unit test
npx eslint lib app tests && npm run typecheck
npm run build                             # tanpa DATABASE_URL = mode demo
```

## Aturan
1. Kerja hanya di folder website yang sedang dikerjakan; jangan buka folder kunci cadangan rahasia
   (lihat `~/.claude/CLAUDE.md`).
2. Backup bertanggal sebelum mengubah website/n8n yang hidup.
3. Jangan tampilkan secret utuh (maks 4 karakter terakhir). Biaya/akun pihak ketiga & posting publik: tanya dulu.
4. Ragu milik MRP atau Lavile → anggap milik Lavile dan tanya.
5. Pekerjaan mrproperti.com dan lavilecikarang.com tidak boleh saling mengganggu. Perubahan di satu website
   tidak boleh merusak website lain.
6. Jaga server bersama (2 GB): perhatikan RAM dan swap. Sebelum perubahan berisiko (Caddy, port, restart/
   buat ulang container), beri tahu pemilik supaya ia membuat snapshot dulu.
