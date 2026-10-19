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
