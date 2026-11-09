# Foto listing: versi tampilan, galeri, dan cache

## Alur foto

- URL yang disimpan di database tetap `/api/media/<id>`. URL ini mengembalikan master WebP tanpa perubahan dimensi atau piksel.
- Kartu listing dan galeri memakai `mediaDisplayUrl()`, yang menunjuk ke `/api/media/<id>/display.webp`.
- Saat upload, server menyiapkan master dan versi tampilan terpisah. Versi tampilan dibatasi 1200 piksel pada sisi terpanjang, tidak memperbesar foto kecil, dan memakai WebP quality 78. Quality diturunkan bertahap ke 68/58 bila hasilnya melampaui target 250 KiB. Ukuran byte merupakan target; foto dengan detail sangat padat dapat melebihinya.
- Foto lama dibuatkan versi tampilan ketika pertama kali diminta. Hasilnya disimpan di S3 dengan suffix `.display-v1.webp`, sehingga kunjungan berikutnya memakai hasil yang sama. Permintaan bersamaan untuk satu foto berbagi pekerjaan yang sedang berjalan dalam proses aplikasi.
- Galeri meminta versi tampilan langsung, sehingga tidak perlu optimasi Next.js kedua. Kartu listing tetap memakai `next/image` untuk thumbnail responsif yang lebih kecil.
- Galeri mulai menyiapkan satu foto berikutnya setelah foto aktif selesai dimuat. Foto lama tetap terlihat sampai foto tujuan selesai didekode. Mode hemat data menunda pemuatan foto lain sampai pengguna menavigasi.

Tidak ada migrasi database, penggantian URL tersimpan, atau penghapusan master dalam perubahan ini. Integrasi Facebook, metadata, dan form edit tetap dapat menggunakan URL master.

## Cloudflare

Path galeri baru berakhiran `.webp`, yang termasuk ekstensi cache standar Cloudflare. Respons versi tampilan yang publik memisahkan kebijakan browser dari edge:

```http
Cache-Control: private, no-cache
Cloudflare-CDN-Cache-Control: public, max-age=300, must-revalidate
```

Browser harus memvalidasi ulang, sedangkan Cloudflare dapat melayani salinan selama lima menit. Header khusus Cloudflare menentukan cache edge meskipun kebijakan browser memakai `private`. Respons media privat, tidak ditemukan, dan error mengirim `private, no-store` pada kedua header. Tidak ada `stale-while-revalidate` untuk versi tampilan.

Jangan mengaktifkan Cache Everything untuk seluruh `/api/`, halaman admin, atau URL master. Aturan bypass yang sudah ada di akun Cloudflare dapat mengalahkan perilaku standar; periksa hasil di domain produksi setelah kode diterbitkan.

Permintaan pertama pada lokasi edge yang belum menyimpan foto dapat menghasilkan `MISS`; pengulangan URL yang sama diharapkan menghasilkan `HIT`. Header `x-nextjs-cache` pada thumbnail menunjukkan cache aplikasi, sedangkan `cf-cache-status` menunjukkan cache Cloudflare.

Contoh pemeriksaan menggunakan ID foto listing yang sedang dipublikasikan:

```sh
curl -sS -D - -o /dev/null https://mrproperti.com/api/media/ID_FOTO/display.webp
```

Jalankan ulang URL yang sama, lalu periksa `Content-Type: image/webp`, ukuran `Content-Length`, kebijakan cache, dan `CF-Cache-Status`. Header khusus Cloudflare dapat dikonsumsi oleh edge sehingga tidak terlihat di browser. Di Network browser, foto n+1 harus mulai diminta sebelum klik berikutnya. Gambar yang pernah dipublikasikan dapat tetap tersedia selama masa cache; penarikan mendesak memerlukan purge edge dan mempertimbangkan cache browser. Thumbnail kartu tetap mengikuti masa cache optimizer Next.js yang sudah ada; kebijakan lima menit di atas berlaku untuk versi tampilan langsung di galeri.

## Pengujian

- `tests/image-upload.test.ts`: master tetap utuh, batas dimensi versi tampilan, alpha, dan pemetaan URL.
- `tests/media-variants.test.ts`: foto lama, penyimpanan ulang, akses publik/privat, konversi bersamaan, dan rollback upload.
- `tests/e2e/gallery.spec.ts`: pemuatan foto berikutnya, penggunaan URL versi tampilan, foto lambat/gagal, navigasi cepat, hemat data, keyboard, swipe, serta ukuran frame.
- Integrasi tim/testimonial tetap menguji upload dan akses media dengan PostgreSQL serta penyimpanan S3 lokal.

### Hasil validasi perubahan, 9 November 2026

- Build produksi dan pemeriksaan TypeScript berhasil.
- Seluruh 90 unit test berhasil.
- Seluruh 20 pengujian galeri produksi di desktop/mobile berhasil.
- `tests/integration/media-flow.test.ts` berhasil menguji browser, listing terbit, dua foto lama, konversi dan penyimpanan versi tampilan, pemuatan n+1, akses privat/owner, upload baru, serta penarikan listing. Master tetap utuh dan konversi foto lama tidak diulang.
- ESLint untuk seluruh file yang diubah berhasil. Lint global masih menemukan 21 pelanggaran `react-hooks/error-boundaries` pada `components/partner-admin.tsx`, yang tidak diubah dalam pekerjaan ini.
- Pengujian integrasi yang lebih luas belum seluruhnya hijau: alur tim berhenti pada ekspektasi refresh urutan setelah SQL langsung melewati cache; testimonial berhenti pada posisi section; alur formulir properti berhenti pada timeout pencarian `field_harga` sebelum pemeriksaan galeri. Pemeriksaan upload/media tim dan testimonial sebelum kegagalan tersebut berhasil. Pengujian media khusus di atas memverifikasi alur foto tanpa asumsi UI lain itu.
