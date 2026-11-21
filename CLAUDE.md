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
| `caddy` (80/443), config host `/root/caddy/Caddyfile` | BERSAMA | Jangan restart; reload hanya setelah validasi |
| `n8n-n8n-1` (n8n 2.31.5, SQLite, batas 640 MB) | BERSAMA | https://n8n.mrproperti.com, jangan restart |
| `mrproweb` + `/root/web-me` (compose project `web-me`) | MRP | Bukan checkout git; image dari GHCR |
| `/srv/lavilecikarang/` (situs statis via Caddy) | LAVILE | Jangan disentuh |
| Workflow `Chatbot Lavile - Groq` (ID `LavileChatGroq01`) | LAVILE | Jangan diubah; boleh disalin jadi `MRP-...` |

- RAM 2 GB + swap 1 GB, sisa ±490 MB (20-11-2026): hemat memori; render video jangan di VPS ini.
- Akses: `ssh root@116.212.73.143` dengan `~/.ssh/id_ed25519` (perlu izin pemilik di sesi Claude).
- Cek Lavile sebelum & sesudah setiap perubahan: `curl -sI https://lavilecikarang.com | head -1` → 200.

## n8n
- Backup dulu (skill `backup-n8n`, hasil di `/root/n8n-backup/<tanggal>/`).
- Workflow MRP yang aktif jangan diedit langsung: duplikat `MRP-<nama>`, tes, lalu tukar; nonaktifkan, jangan hapus.
- Perubahan tanpa restart n8n: lihat memori `n8n-update-tanpa-restart` (transaksi SQLite `workflow_history`
  + `workflow_entity`, lalu pastikan baris `webhook_entity` ada).
- Groq gpt-oss-120b dibatasi ±8000 TPM; beri jeda ±25 detik antar-tes. Tes webhook pakai User-Agent browser.
- Chat MRP: website `POST /api/chat` → webhook `mr-konsultasi` (header `x-mr-token`) → knowledge dari
  `GET /api/chat/knowledge`. Ekspor di `workflows/n8n/` (lihat `CHAT.md`); keadaan live bisa berbeda.

## Kode penting
- Urutan listing: `lib/catalog-query.ts` (beranda + `/properti`), `lib/area-query.ts` (`/wilayah/*`).
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
