# Blog MR Properti di n8n → Next.js

Untuk otomasi properti baru ke Facebook Pages, gunakan [workflow Facebook](./mr-properti-facebook-pages.json) dan [panduan setup Facebook](./FACEBOOK.md).

Impor [mr-properti-blog-nextjs.json](./mr-properti-blog-nextjs.json) melalui menu import workflow n8n. File diimpor **nonaktif**. Tidak perlu plugin WordPress atau perubahan skema database.

## Setup

1. Deploy versi Next.js yang menyertai file ini. API `GET /api/blog` dan `POST /api/blog` perlu tersedia pada deployment tujuan, dengan `DATABASE_URL` dan `BLOG_API_KEY` terisi. Buat secret acak, misalnya `openssl rand -hex 32`, lalu simpan di environment server. Jangan masukkan secret ke JSON workflow.
2. Di node **Jadwal dan Topik**, ubah `baseUrl` bila origin Next.js bukan `https://mrproperti.com`. Gunakan origin deployment Next.js, bukan instalasi WordPress lama.
3. Buat credential n8n **Header Auth**: Name `x-api-key`, Value sama dengan `BLOG_API_KEY`. Pilih credential ini pada **Baca Artikel Terakhir** dan **Terbitkan Blog Next.js**.
4. Pilih credential OpenRouter dan Gemini milik akun Anda pada kedua node AI. Nama credential lama dipertahankan sebagai petunjuk; ID instance lama dihapus. Model mengikuti workflow sumber dan perlu dipastikan tersedia di akun. Jika mengganti model, pilih model yang mendukung instruksi JSON dan konteks prompt yang dipakai.
5. Jalankan dari **Uji Manual / Execute workflow**, bukan langsung dari node publikasi. Hasil harus berakhir pada **Pratinjau Tanpa Terbit**, dengan `dryRun: true`. Tidak ada POST ke API blog pada alur manual penuh. Periksa judul, isi, sumber, dan `payload`.
6. Setelah deploy dan pratinjau benar, nonaktifkan workflow blog WordPress lama, lalu aktifkan/publish workflow ini. Zona waktu disimpan sebagai `Asia/Jakarta`; jadwal **07.00, 11.00, 15.00, 19.00 WIB**. Periksa execution terjadwal pertama dan artikel `/blog/<slug>`.

Jadwal 4x sehari dipilih menggantikan alur uji 10 menit agar maksimal 4 artikel/hari, bukan 144. Untuk mengubah jam, sesuaikan **keduanya**: cron di Jadwal Blog WIB dan array `slots` di Jadwal dan Topik. Jadwal memulai proses penulisan, bukan menjamin waktu terbit tepat pada menit itu. Uji manual tetap memanggil AI sehingga dapat memakai kuota.

## Perubahan penting

- WordPress Basic Auth diganti Header Auth. Payload memakai `{ title, slug, excerpt, content, published: true }`. Field `status` dan `meta` WordPress dihapus.
- Isi berupa teks biasa dengan pemisah paragraf, sesuai renderer blog Next.js. Subjudul dan sumber juga berupa teks; URL sumber belum menjadi tautan klik otomatis pada tampilan blog saat ini.
- Cabang kondisi lama terbalik: `dryRun = false` justru menuju pratinjau. Workflow baru memakai kondisi `dryRun = true` menuju pratinjau.
- Satu GET memeriksa keberadaan slug slot secara persis sekaligus mengambil maksimal 100 judul terbaru, termasuk draft. Slot yang sudah ada berhenti sebelum RSS/AI, sehingga menghemat kuota pada pengulangan.
- Slug unik di PostgreSQL menjadi penjagaan terakhir saat POST bersamaan atau retry setelah timeout. HTTP 409 dianggap slot sudah ada dan dilewati; tidak menimpa artikel. Eksekusi bersamaan masih dapat memakai kuota AI dua kali sebelum satu POST ditolak. Gunakan satu workflow aktif dan jangan mengedit slug slot bila ingin penjagaan ini tetap berlaku.
- POST mencoba ulang kegagalan transport hingga 3 kali. Respons HTTP dibaca eksplisit: 201 berhasil, 409 dilewati, status lainnya menggagalkan execution agar terlihat di daftar Executions. HTTP error seperti 429/5xx pada POST tidak dicoba ulang oleh pemeriksa hasil; jalankan ulang execution bila diperlukan.
- RSS Bekasi dan Karawang memakai dua cabang; hingga 3 ringkasan relevan berumur maksimal 48 jam masuk prompt. Tanpa sumber relevan, AI menulis panduan umum. Ringkasan sumber dibatasi; prompt melarang mengikuti instruksi di dalam data RSS.
- AI utama mencoba hingga 2 kali, lalu Gemini jika panggilan utama gagal. Keluaran yang gagal validasi tidak diterbitkan dan tidak otomatis dipanggil ulang, sehingga biaya tidak terus bertambah. Validasi otomatis bukan pemeriksaan fakta menyeluruh.
- Maksimal eksekusi 9 menit. Tidak ada auto-publish dari uji manual penuh; jangan mengeksekusi node POST secara terpisah dengan pinned data produksi.

## Kontrak API

Kedua method memerlukan `x-api-key: <BLOG_API_KEY>`. Secret yang belum terkonfigurasi menghasilkan 503; key salah/tidak ada menghasilkan 401.

`GET /api/blog?slug=mr-blog-2026-10-20-07-00`:

```json
{
  "data": [{ "id": "...", "title": "...", "slug": "..." }],
  "slotExists": false
}
```

GET hanya mengambil metadata riwayat, dengan `Cache-Control: private, no-store`. Pemeriksaan slot tidak dibatasi 100 artikel riwayat. Query slug invalid menghasilkan 400; kegagalan database menghasilkan 503 dan workflow berhenti sebelum AI.

`POST /api/blog` dengan JSON:

```json
{
  "title": "Panduan memilih hunian untuk keluarga",
  "slug": "mr-blog-2026-10-20-07-00",
  "excerpt": "Hal yang perlu diperiksa sebelum memilih hunian keluarga.",
  "content": "Pengantar artikel.\n\nKebutuhan keluarga\n\nParagraf penjelasan artikel.",
  "published": true
}
```

201 berarti tersimpan, 409 berarti slug sudah dipakai, 400 berarti validasi gagal. API memperbarui jalur blog, beranda, admin dan sitemap setelah penyimpanan. Judul maksimal 160 karakter, excerpt 350 karakter, content 50.000 karakter. Jika `published` dihilangkan, API menyimpan draft; workflow ini selalu mengirim `true` pada jalur produksi.

## Batas pekerjaan dan validasi

File ini memigrasikan **otomasi artikel berikutnya**, bukan arsip artikel/media WordPress. Tidak ada secret ditambahkan ke repo dan tidak ada publikasi langsung dilakukan. Perubahan API dan kode node diperiksa lewat tes lokal; import dan execution pada server n8n pengguna tetap perlu diverifikasi setelah credential dipilih.

Referensi konfigurasi: [Schedule Trigger](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.scheduletrigger/), [HTTP Request](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/), [HTTP Request credentials](https://docs.n8n.io/integrations/builtin/credentials/httprequest/).
