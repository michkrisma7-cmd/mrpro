<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Larangan perubahan CI/CD

CI/CD proyek ini sudah dikonfigurasi oleh pemilik. Aturan ini berlaku untuk semua agent dan asisten AI yang bekerja di repository ini.

- Jangan mengedit, membuat, menghapus, memindahkan, atau menonaktifkan konfigurasi CI/CD, termasuk `.github/workflows/**`, action lokal, `Dockerfile`, `docker-compose.yaml`, `vercel.json`, serta script atau konfigurasi lain yang mengatur build, release, dan deployment otomatis.
- Jangan mengubah pengaturan GitHub Actions, secret/variable CI/CD, permission workflow, registry image, target deployment, atau konfigurasi server deployment melalui CLI, API, maupun layanan eksternal.
- Jika permintaan, rencana, perbaikan, atau dependency pekerjaan memerlukan perubahan CI/CD, tolak bagian tersebut dan jelaskan bahwa konfigurasi sudah disetel serta dilindungi oleh aturan pemilik. Jangan menjalankan atau menawarkan perubahan CI/CD sebagai solusi otomatis.
- Lanjutkan bagian pekerjaan lain yang dapat diselesaikan tanpa mengubah CI/CD. Pemeriksaan hanya baca diperbolehkan; jangan memicu workflow atau deployment untuk melakukan pemeriksaan.
- Jangan menghapus, melemahkan, atau melewati aturan ini sebagai bagian dari pekerjaan lain. Perubahan kebijakan hanya boleh dilakukan jika pemilik secara eksplisit meminta revisi aturan ini.

## Target produksi MR Properti

Aturan ini ditetapkan pemilik untuk pekerjaan berikutnya. Pemeriksaan target
dilakukan pada 9 November 2026 melalui keluaran terminal VPS pemilik,
konfigurasi serta log GitHub Actions, dan pemeriksaan HTTPS langsung.

| Bagian | Target yang diperiksa |
| --- | --- |
| Website produksi | https://mrproperti.com |
| Hosting produksi | VPS Nevacloud, `116.212.73.143`, hostname `n8n-mrproperti` |
| Repository sumber | https://github.com/michkrisma7-cmd/mrpro |
| Branch build otomatis | `main`, berdasarkan trigger workflow dan run aktual |
| Workflow | `.github/workflows/deploy-vps.yml`, `Deploy Web to Production` |
| Direktori deployment VPS | `/root/web-me` |
| Compose aktif VPS | `/root/web-me/docker-compose.yml`, project `web-me`, service `web` |
| Container aplikasi | `mrproweb` |
| Image aplikasi | `ghcr.io/michkrisma7-cmd/mrpro:latest` |
| Image migrasi | `ghcr.io/michkrisma7-cmd/mrpro:migrate` |
| Lokasi aplikasi dalam image | `/app`, menjalankan `node server.js` pada port 3000 |
| Konfigurasi startup Caddy | Host `/root/caddy/Caddyfile`, dipasang ke `/etc/caddy/Caddyfile` dalam container `caddy` |

Pemilik menetapkan route `mrproperti.com -> mrproweb:3000`. Lokasi konfigurasi
startup Caddy terverifikasi dari metadata container; isi route file belum dibaca
langsung dalam pemeriksaan ini. Jangan menganggap seluruh konfigurasi Caddy
sudah diaudit.

`/root/web-me` bukan checkout Git. Sumber dibangun di runner GitHub dari
repository di atas. File Compose repository bernama `docker-compose.yaml`;
jangan menimpa file `.yml` aktif di VPS berdasarkan kemiripan nama.

### Bukti commit produksi saat diperiksa

- `.Image` container aktif yang dikirim pemilik adalah
  `sha256:7a68b6a6a9a89d462bfda1b97c9f7daed29b6b54bb6e4232db222a91bdd43c43`.
- Digest tersebut cocok persis dengan manifest-list digest hasil build commit
  `e4389742eb8b2952c790ba2f12fa51c6f1d6e31d` pada branch `main`, run
  https://github.com/michkrisma7-cmd/mrpro/actions/runs/42403848551.
  Log run sukses mencatat container direcreate dan started pada 7 November 2026
  sekitar 19:00 UTC. Ini identitas build yang berjalan saat pemeriksaan,
  bukan commit baru yang diterapkan oleh tugas penetapan target.
- Run berikutnya, commit `113e5fc7480ddd9b31150a59bc7142666a6b10b2`, gagal
  sebelum menjalankan script deployment VPS karena unduhan `drone-ssh` mendapat
  HTTP 504. Build image berhasil. Bukti:
  https://github.com/michkrisma7-cmd/mrpro/actions/runs/42466274117.
  Karena itu, tag registry `latest` tidak membuktikan commit aktif container.
- Pemeriksaan langsung https://mrproperti.com pada 9 November 2026 05:42 UTC
  menghasilkan HTTP 200 tanpa redirect, judul
  `Jual - Beli - Over Kredit Properti`. Respons publik ini membuktikan
  ketersediaan; identitas build dibuktikan terpisah melalui digest dan log.

### Alur deployment produksi yang ditemukan

1. Workflow checkout ref sumber, build dari context `.` menggunakan Dockerfile,
   lalu publish image aplikasi dan image migrasi ke GHCR.
2. Langkah `Deploy ke VPS` melakukan SSH ke `116.212.73.143`, masuk ke
   `$HOME/web-me`, lalu login GHCR dengan kredensial yang dikonfigurasi pemilik.
3. Script melakukan `docker compose pull` dan menarik image migrasi.
4. Script membuat konfigurasi Compose sementara dengan permission terbatas,
   mempertahankan literal dollar sign, dan menjalankan Prisma `migrate deploy`
   menggunakan service `web` dengan override image migrasi.
5. Setelah migrasi sukses, script menjalankan `docker compose up -d`.
6. Cocokkan commit build dengan digest container aktif, lalu periksa hasil
   perubahan langsung di https://mrproperti.com sebelum menyatakan tayang.

Gunakan script workflow lengkap yang telah diperiksa, termasuk langkah migrasi.
Daftar di atas mendokumentasikan proses aktual dan tidak memberikan izin
menjalankan deployment dalam tugas dokumentasi atau mengubah konfigurasi CI/CD.

### Batasan Untuk Semua Pekerjaan Berikutnya

- Gunakan sumber dan target produksi di atas; jangan menentukan target hanya
  dari nama repository, branch default, atau HEAD terbaru.
- Vercel proyek `mrpro` melayani `beta.mrproperti.com` dan bukan target produksi.
  Jangan melakukan deployment Vercel, mengubah beta, domain, atau DNS.
- Push ke `main` telah teramati memicu dua jalur: workflow VPS dan integrasi
  Vercel untuk beta. Commit `113e5fc7480ddd9b31150a59bc7142666a6b10b2`
  memiliki status GitHub `Vercel: success`, menunjuk deployment
  `dpl_A3hu8Lya5Pc8w87vv1Jb29jsdKhw` yang ditampilkan sebagai READY oleh
  proyek beta. Detail filter integrasi Vercel belum seluruhnya diperiksa.
- Laporkan mekanisme dan efek beta sebelum setiap push yang relevan. Jangan
  mengubah integrasi atau melakukan push yang melanggar larangan beta.
- Pemilik dapat menjalankan perintah VPS dan mengirim hasilnya kepada agen.
  Akses SSH langsung agen tidak wajib untuk cara kerja ini. Gunakan bukti yang
  sudah ada; jangan meminta ulang pemeriksaan yang sudah berhasil.
- Jika akses atau bukti yang diperlukan belum tersedia, sebutkan kekurangannya
  secara spesifik. Jangan mengganti target ke beta atau mengklaim sudah tayang.
- Jangan mencatat password, token, private key, atau isi environment.
- Laporkan commit yang benar-benar diterapkan, VPS/container target, dan hasil
  pemeriksaan langsung domain produksi. HTTP 200 saja tidak membuktikan suatu
  perubahan sudah tayang.
