# Foto pratinjau dan video listing

Halaman `/properti/[slug]` menghasilkan judul, deskripsi, canonical, `og:url`,
`og:image`, dan Twitter Card melalui `generateMetadata` di server. Foto pertama
di `gallery` tetap menjadi foto utama untuk kartu, galeri, dan pratinjau berbagi.

Unggahan `/api/media/[id]` memiliki varian `?variant=share`: JPEG 1200×630
dengan orientasi yang benar, tanpa EXIF, dan kompresi untuk crawler sosial.
Varian dibuat dari objek S3 yang sama ketika diminta; foto lossless asli dan
urutan galeri tidak ditulis ulang. Ini berlaku juga untuk unggahan listing lama.
URL foto publik lama di luar endpoint media tetap dipertahankan, tanpa fetch
URL pengguna oleh server. Metadata memakai URL absolut berdasarkan origin
runtime `NEXT_PUBLIC_SITE_URL`, beserta tipe dan dimensi untuk varian JPEG.

Endpoint varian menggunakan pemeriksaan akses yang sama dengan foto asli.
Foto listing yang diterbitkan dapat diambil tanpa cookie/login; foto privat
tetap dibatasi pemilik/admin. Bucket tidak harus dijadikan publik. `robots.txt`
telah mengizinkan `/api/media/`. Cache HTTP varian publik mengikuti foto asli.

WhatsApp dapat menyimpan metadata dan gambar dari URL listing yang pernah
dibagikan. Respons HTML/gambar terbaru tidak otomatis memperbarui pesan lama.
Untuk diagnosis, ambil HTML dengan User-Agent WhatsApp dan facebookexternalhit,
lalu GET URL `og:image` tanpa cookie. Jika keduanya benar tetapi pratinjau lama
masih tampil, tunggu crawl ulang atau uji kiriman baru menggunakan query URL
yang belum pernah dibagikan (misalnya `?preview=2`). Canonical tetap URL listing.
Teks dan tombol Bagikan tidak diubah.

Kolom **Link YouTube (opsional)** berada tepat setelah Galeri properti dalam
form Pasang Iklan dan form edit member. Editor admin juga mendukungnya, termasuk
listing tamu. Tautan watch, youtu.be, Shorts, dan embed dinormalisasi di server;
hanya ID video dengan 11 karakter `[A-Za-z0-9_-]` yang disimpan. Host harus cocok
dengan allowlist; markup, host tiruan, kredensial URL, dan ID tidak valid ditolak.
Kosongkan kolom untuk menghapus video. Kolom yang tidak dikirim oleh klien lama
tidak menimpa video yang sudah tersimpan.

Migrasi `202611140001_property_youtube` menambahkan kolom nullable
`Property.youtubeVideoId` dan CHECK constraint. Tidak ada reset, backfill, atau
perubahan data lama. Alur VPS yang ada menjalankan migrasi sebelum mengganti
container aplikasi. Konfigurasi deployment tidak perlu diubah.

Halaman detail menampilkan pemutar responsif 16:9 hanya jika ada ID valid.
Iframe youtube-nocookie baru dibuat setelah pengunjung menekan Putar video;
tidak ada permintaan YouTube sebelum interaksi. Ketersediaan pemutaran tergantung
pada status dan izin embed video di YouTube. Video tidak digunakan sebagai
gambar Open Graph.

Pemeriksaan terarah setelah build:

```sh
node node_modules/tsx/dist/cli.mjs --test tests/youtube.test.ts tests/youtube-migration.test.ts tests/share-image.test.ts
node node_modules/tsx/dist/cli.mjs --test tests/integration/property-photos-flow.test.ts
node node_modules/tsx/dist/cli.mjs --test tests/integration/seo-flow.test.ts
```

Tes integrasi memakai PostgreSQL dan S3 fixture terisolasi serta browser desktop
dan mobile. Tes mencakup akses gambar tanpa autentikasi, penolakan foto privat,
metadata HTML untuk tiga crawler, pergantian foto utama, create/edit video,
penghapusan video, serta pemuatan iframe setelah interaksi. Fixture iframe
memeriksa wiring pemutar tanpa bergantung pada ketersediaan video eksternal.
