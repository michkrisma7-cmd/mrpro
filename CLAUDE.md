# MR Properti (MRP) — mrproperti.com
Laporan diawali "[MRP]"; backup/file sementara berawalan `MRP-`. Bahasa Indonesia sederhana.

- Claude bebas bekerja. Minta izin hanya untuk daftar berisiko di `~/.claude/CLAUDE.md` (dijaga hook guard.py).
- Boleh membaca MRP dan Lavile. Ubah Lavile hanya kalau tugas menyebutnya. Jangan merusak website lain.
- Caddy: ubah hanya `/root/caddy/sites/MRP.caddy`. Alur: backup → `docker exec caddy caddy validate --config
  /etc/caddy/Caddyfile --adapter caddyfile` → `caddy reload` (bukan restart) → `curl -I` kedua domain (+www).
- Server RAM 2 GB: jangan pasang alat berat, jangan kerja berat paralel, catat `free -h` sebelum & sesudah kerja besar.
- Push ke `main` = deploy produksi (GitHub Actions) → kerja di branch, push setelah tes + build lulus.
  Larangan ubah CI/CD tetap berlaku (lihat `AGENTS.md`).
- Akhiri setiap tugas dengan mencatat hasil dan langkah berikutnya di `PROGRESS.md`.

Rincian teknis (server, container, n8n, perintah tes/build, kode penting): `CATATAN-SERVER.md`.
