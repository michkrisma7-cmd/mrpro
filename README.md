# MR Properti

Website katalog properti dan layanan tukang berbahasa Indonesia. Bagian properti dan layanan dipisahkan. Dibangun dengan Next.js App Router, Prisma, Neon PostgreSQL, Neon Auth terkelola (Better Auth API), dan S3.

## Fitur

- Beranda responsif, pencarian properti, filter jenis/transaksi/harga, pagination, urutan harga, favorit per perangkat, galeri, dan detail SEO.
- Katalog/detail layanan: jenis layanan, nama tukang, skill, tarif mulai dari, dan koordinasi lewat WhatsApp admin. Tukang tidak memerlukan akun.
- Login/daftar Neon Auth, akun pengguna, kirim properti, serta pantau status tinjauan.
- Dashboard `/admin`: statistik, tinjau/terbitkan/arsipkan properti, edit informasi properti, CRUD definisi field, tambah/edit/nonaktifkan layanan, serta pengaturan hero/kontak/area.
- Field dinamis: teks, angka, harga, select, multi select; wajib/opsional; form/kartu/detail dikontrol terpisah; label kartu kosong memakai nama field. Galeri, judul, dan deskripsi merupakan field inti. WhatsApp diperlukan untuk listing.
- Semua mutasi admin memeriksa role di server. Pendaftaran tidak dapat memilih role. Kiriman pengguna selalu `PENDING`. Field khusus form disaring sebelum data publik dikirim.
- Unggah gambar JPG/PNG/WebP maksimal 5 MB, maksimal 12 foto per listing. Gambar didekode, dibatasi 25 megapiksel, metadata dibuang, dan disimpan sebagai WebP di S3. Endpoint unggah memerlukan sesi pengguna dan pemeriksaan origin. Batas dasar 36 unggahan/user/jam; pertimbangkan rate limit terdistribusi di gateway untuk beban besar.

## Konfigurasi

Gunakan Bun **1.4.3** dan Node **24**. Isi runtime environment atau `.env.local` dari [.env.example](.env.example). Jangan commit nilai rahasia.

| Variabel                                     | Kegunaan                                                                                         |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`                               | URL PostgreSQL Neon dengan TLS, untuk data aplikasi Prisma                                       |
| `NEON_AUTH_URL`                              | URL endpoint Neon Auth terkelola; menggunakan API Better Auth                                    |
| `NEON_AUTH_COOKIE_SECRET`                    | Secret acak aplikasi, minimal 32 karakter; buat dengan `openssl rand -base64 32` dan simpan aman |
| `NEXT_PUBLIC_SITE_URL`                       | Origin HTTPS kanonis produksi; saat lokal gunakan origin port yang dipakai                       |
| `AWS_ENDPOINT_URL_S3`                        | Endpoint layanan S3/S3-compatible                                                                |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Kredensial server yang dapat menandatangani request S3                                           |
| `AWS_REGION`                                 | Region bucket                                                                                    |
| `AWS_S3_BUCKET`                              | Default **`bucket`**, sesuai bucket publik yang sudah dibuat pemilik                             |

`DATABASE_URL` dan kredensial AWS signing memerlukan nilai runtime asli, bukan placeholder injeksi proxy HTTP. Secret hanya dibaca di modul server. Daftarkan origin aplikasi sebagai trusted/allowed origin pada Neon Auth. Aktifkan email/password di Neon Auth dan konfigurasi verifikasi email sesuai kebijakan proyek.

S3 menggunakan path-style endpoint agar mendukung layanan S3-compatible. Galeri menyimpan referensi media milik pengguna. Endpoint aplikasi membaca objek dari S3 sehingga URL gambar stabil dan dapat dioptimasi Next.js. Foto kiriman belum terbit hanya ditampilkan aplikasi kepada pemilik/admin. Karena bucket dipilih publik oleh pemilik, URL objek S3 itu sendiri bersifat publik; jangan unggah dokumen sensitif. `GetObject`, `PutObject`, dan `DeleteObject` diperlukan (delete untuk membersihkan unggahan yang gagal tersimpan di database).

## Menjalankan

```sh
bun install --frozen-lockfile
bun run db:generate
# Hanya setelah DATABASE_URL menunjuk branch/database tujuan yang benar:
bun run db:deploy
bun run db:seed
bun run dev --hostname 0.0.0.0
```

Migrasi awal membuat tabel aplikasi saja, tidak mengelola tabel internal Neon Auth. Jangan gunakan `prisma migrate reset`. Seed bersifat berulang dan hanya membuat field/pengaturan yang belum ada; seed tidak membuat listing, tukang, admin, atau kredensial contoh.

Prisma memakai `engineType = client` dan adapter Neon. `db:generate` menggunakan parser WASM dan protokol generator resmi dari versi Prisma yang dipin sehingga tidak memerlukan unduhan native query engine. `db:deploy` memakai Prisma Migrate dan membutuhkan akses `binaries.prisma.sh` serta koneksi ke database. Jangan menonaktifkan pemeriksaan checksum atau TLS bila jaringan menolak unduhan.

Produksi:

```sh
bun run build
bun run start --hostname 0.0.0.0
```

Gambar dan font contoh tersedia lokal. Foto rumah contoh dibuat untuk pratinjau, bukan listing properti nyata. Apabila `DATABASE_URL` belum tersedia, aplikasi menampilkan data contoh berlabel. Ketika database tersedia, hanya data dari database yang dipakai. Login dinonaktifkan bila konfigurasi Neon Auth belum lengkap. Dashboard pratinjau hanya baca, tidak menyediakan bypass autentikasi.

## Setup login lokal (Neon Auth)

Setelah `NEON_AUTH_URL` dan `DATABASE_URL` tersedia di `.env` atau `.env.local` pada Mac:

```sh
git pull origin main
bun install
bun auth:setup
bun dev --port 3000
```

`auth:setup` membuat `NEON_AUTH_COOKIE_SECRET` acak di `.env.local` hanya bila belum ada. Nilai lama dan isi file lain dipertahankan; nilai rahasia tidak ditampilkan. Skrip memeriksa konfigurasi, endpoint sesi Neon, format/akses JWKS bila disediakan, serta akses read-only ke tabel `AppUser`. Jalankan `bun auth:check` untuk pemeriksaan ulang tanpa menulis secret.

Di pengaturan Neon Auth, aktifkan login email/password dan izinkan origin lokal **`http://localhost:3000`**. Buka aplikasi menggunakan origin yang sama; `localhost`, `127.0.0.1`, port lain, dan domain produksi adalah origin berbeda. Gunakan `NEXT_PUBLIC_SITE_URL` sesuai origin yang sedang dipakai. Setelah mengubah environment, restart server. Buka `/login`, daftar akun, ikuti verifikasi email jika diminta, lalu masuk dan pastikan halaman `/akun` menampilkan nama Anda.

SDK Neon Auth memakai cookie `Secure`. Jika login mengembalikan 200 tetapi tetap kembali ke `/login` saat memakai HTTP, gunakan HTTPS lokal: hentikan server, ubah `NEXT_PUBLIC_SITE_URL=https://localhost:3000`, tambahkan `https://localhost:3000` ke origin yang diizinkan di Neon Auth, lalu jalankan `bun dev:https`. Buka `https://localhost:3000/login` dan masuk kembali. Next.js menyiapkan sertifikat lokal pada pemakaian pertama; ikuti permintaan pemasangan sertifikat jika muncul. Form login memeriksa sesi sebelum berpindah halaman dan menampilkan pesan jika cookie tidak tersimpan.

Versi `@neondatabase/auth@0.6.0-beta` dipatch lewat `patchedDependencies` Bun: batas waktu fetch untuk membuat cookie cache sesi dinaikkan dari 3 menjadi 15 detik agar menoleransi cold start/latensi Neon. Patch juga memakai satu respons Neon untuk membuat cookie dan mengembalikan sesi, sehingga cache miss tidak lagi memicu dua request serial. Cache sesi bertanda tangan berlaku 5 menit; role admin tetap dibaca dari database setiap request. Patch tersimpan di `patches/` dan otomatis diterapkan oleh `bun install`, termasuk build Vercel dan Docker. Validasi serta penandatanganan cookie tetap memakai SDK; ini tidak melewati autentikasi. Saat memperbarui SDK, evaluasi ulang patch dan jalankan `node --import tsx --test tests/auth-latency.test.ts`. Restart dev server setelah memasang patch agar bundle SDK lama tidak dipakai.

`JWKS_NEON` boleh berupa URL HTTPS JWKS atau JSON JWKS publik. Ini adalah kunci publik untuk verifikasi JWT, bukan cookie signing secret. Login web memakai SDK Neon Auth yang memeriksa sesi melalui layanan Neon dan cookie bertanda tangan; JWKS tidak menggantikan `NEON_AUTH_URL` atau `NEON_AUTH_COOKIE_SECRET`. `auth:check` memeriksa format/ketersediaan JWKS tetapi tidak mengklaim akun sudah berhasil login. Jangan menyalin private key atau token akses ke variabel JWKS.

Next.js `proxy.ts` memperbarui cookie sesi sebelum halaman akun/admin dirender. Hak admin tetap diperiksa di server dari `AppUser.role`; role dari input browser tidak dipercaya. Koneksi profil Prisma memakai implementasi WebSocket eksplisit agar bekerja pada Node 20, sama seperti seed.

Pengujian alur lengkap lokal:

```sh
bun run test:auth
```

Pengujian ini memakai layanan Better Auth terisolasi dengan protokol cookie Neon, PostgreSQL PGlite melalui WebSocket, dan browser Chromium. Ia menguji daftar, login, profil database, penolakan akses admin, logout, dan pembaruan cookie. Tidak memakai database/akun Neon produksi. Pengujian tersebut tidak menggantikan verifikasi login pada proyek Neon Anda.

## Admin pertama

1. Buat akun melalui `/login`, lalu masuk sehingga `AppUser` terbentuk dari sesi Neon yang valid.
2. Pemilik proyek memverifikasi ID user pada Neon Auth.
3. Jalankan dari lingkungan tepercaya:

```sh
bun run admin:grant <Neon-Auth-user-id>
```

Role admin disimpan di database aplikasi dan dibaca ulang saat otorisasi. Tidak ada admin otomatis berdasarkan email atau user pertama. User biasa yang membuka dashboard mendapat penolakan akses. Pengguna memantau kiriman di `/akun` dan admin melakukan koreksi serta peninjauan di `/admin`.

## SEO dan kecepatan

Konten publik dirender server saat request; data beranda disimpan dalam cache selama 60 detik. Layout menampilkan navigasi dan loading UI tanpa menunggu query pengaturan footer; footer dimuat terpisah melalui Suspense. Definisi field, pengaturan, layanan, dan detail memakai cache bertag yang dibatalkan saat admin mengubah konten. Katalog menggunakan filter dan pagination di PostgreSQL agar tidak mengirim seluruh listing ke browser. Detail hanya memilih listing `PUBLISHED`. Gambar memakai `next/image`, WebP, dan pemuatan malas; gambar hero diprioritaskan. Font disimpan lokal dan tidak memerlukan Google Fonts.

Metadata Indonesia, canonical, Open Graph, structured data properti/layanan, sitemap listing terbit, dan robots sudah disiapkan. Mode contoh/lokal tidak diindeks. Setelah domain HTTPS dan database terhubung, publikasikan situs, verifikasi domain di Google Search Console, lalu kirim `/sitemap.xml`. Implementasi SEO tidak menjamin peringkat atau waktu indeks Google.

## Validasi

```sh
bun run lint
bun run typecheck
bun run test
bun run build
bun run test:e2e
```

Unit/integration tests memvalidasi field dinamis, perlindungan unggah, role/status awal, dan constraint skema PostgreSQL. PGlite menjalankan migrasi SQL nyata secara lokal; ini bukan pengujian koneksi Neon. Playwright menguji pratinjau tanpa kredensial di Chromium desktop dan ponsel (server port 3100). Gunakan `PLAYWRIGHT_CHROMIUM_EXECUTABLE` bila lokasi browser berbeda.

Pada implementasi awal, variabel Neon/AWS belum terinjeksi ke mesin sehingga alur login Neon nyata, penerbitan ke Neon, unggah S3 nyata, dan WhatsApp bisnis belum dapat diverifikasi. Setelah konfigurasi aktif, uji: daftar/login → unggah foto → kirim properti → status pending → tinjau/terbitkan admin → katalog/detail publik. Pastikan user biasa ditolak oleh seluruh aksi admin. Isi kontak WhatsApp yang benar dari dashboard; contoh tidak memakai nomor bisnis palsu.

Template ZIP WordPress dipakai sebagai referensi visual dan perilaku field. ZIP tidak berisi database konten WordPress; listing, media, akun, dan URL lama belum dimigrasikan. Migrasi konten memerlukan ekspor dan pemetaan URL/redirect terpisah.

## Deploy ke Vercel atau VPS

Project siap untuk dua target; database tetap **Neon PostgreSQL**, auth tetap **Neon Auth**, dan media tetap **S3**. Compose tidak menyediakan PostgreSQL lokal karena adapter aplikasi memakai protokol Neon WebSocket. Tidak ada data permanen yang disimpan di container aplikasi.

### Vercel (saat nanti ingin deploy)

1. Import repository sebagai framework Next.js, root directory project ini, dan gunakan Node.js **24.x** (juga ditentukan lewat `engines`). `vercel.json` memakai Bun bawaan build image untuk install dengan frozen lockfile dan build project; versi Bun dicetak di build log. Bun harus mendukung lockfile 1.4.x. Perintah tidak memakai bootstrap `bunx bun@1.4.3`, yang dapat berhenti sebelum instalasi dependency dimulai. Runtime aplikasi tetap Node.js. Jika pernah memasang override command di dashboard, sesuaikan Install Command menjadi `bun --version && bun install --frozen-lockfile` dan Build Command menjadi `bun run build`.
2. Isi environment dari `.env.example` untuk environment tujuan sebelum build. Gunakan `NEXT_PUBLIC_SITE_URL=https://domain-anda` dan secret cookie yang tetap antar-deploy. Variabel publik ini melekat saat build; perubahan domain memerlukan rebuild. Jangan set `DOCKER_BUILD` di Vercel.
3. Dari mesin tepercaya yang sudah memiliki Bun/Node dan environment database tujuan, jalankan `bun run db:deploy`, kemudian `bun run db:seed` sebelum deployment pertama. Untuk pembaruan, jalankan migrasi yang diperlukan sebelum merilis versi yang membutuhkannya. Build tidak menjalankan migrasi atau seed otomatis.
4. Daftarkan origin HTTPS di Neon Auth dan pastikan bucket serta izin S3 sudah tersedia. Untuk preview yang memakai login, daftarkan origin preview juga dan gunakan database/layanan terpisah bila perlu. Nilai `NEXT_PUBLIC_SITE_URL` harus sesuai origin deployment yang diuji.
5. Deploy menggunakan alur Vercel pilihan Anda. Cek `/api/health`, login, katalog, dan unggah sesudah deploy.

Konfigurasi di repository tidak membuat project, menghubungkan akun, atau melakukan deployment Vercel. Referensi deteksi Bun dan install command: [dokumentasi resmi Vercel](https://vercel.com/docs/package-managers).

### VPS dengan Docker Compose

Prasyarat: Docker Engine + Compose v2, domain, dan reverse proxy dengan HTTPS (misalnya Nginx/Caddy) pada host. Login Neon menggunakan cookie Secure sehingga HTTPS diperlukan untuk produksi.

```sh
cp .env.example .env.production
# Edit .env.production: isi seluruh konfigurasi Neon/S3 dan origin HTTPS asli.
# Jaga izin secrets di VPS:
chmod 600 .env.production

# Build aplikasi; rahasia hanya masuk saat runtime, bukan ke image.
docker compose --env-file .env.production build web

# Pertama kali / jika ada migrasi: jalankan satu kali sebelum rilis.
docker compose --env-file .env.production run --rm --build tools bun run db:deploy
docker compose --env-file .env.production run --rm tools bun run db:seed

docker compose --env-file .env.production up -d web
docker compose --env-file .env.production ps
docker compose --env-file .env.production logs --tail=100 web
curl --fail http://127.0.0.1:3000/api/health
```

Compose membaca `.env.production` untuk interpolasi build dan runtime. Jangan memakai `.env` lokal sebagai konfigurasi produksi. `NEXT_PUBLIC_SITE_URL` wajib diisi sebelum build; setelah mengubahnya, build ulang. `APP_PORT` opsional (default 3000) mengubah port host; sesuaikan tujuan reverse proxy.

Arahkan reverse proxy host ke `127.0.0.1:3000`, teruskan `Host`, `X-Forwarded-Host`, dan `X-Forwarded-Proto`, serta izinkan request body minimal **6 MB** untuk unggahan gambar 5 MB beserta multipart overhead. Port aplikasi hanya di-bind ke loopback; akses publik lewat reverse proxy HTTPS. Bila reverse proxy berada di container lain, sesuaikan networking Compose agar proxy dapat mengakses service `web:3000`.

Image memakai multi-stage build, output Next.js standalone, Node 24, dan user non-root. Healthcheck `/api/health` memeriksa proses HTTP saja; status sehat tidak membuktikan koneksi Neon/S3. Halaman membaca data saat request dan tetap memakai cache data aplikasi agar hasil demo dari build tanpa database tidak terbawa ke produksi. Cache Next.js berada di filesystem container, boleh hilang saat container diganti; konfigurasi ini ditujukan untuk satu instance web.

Pembaruan:

```sh
git pull
# Jalankan migrasi terlebih dahulu jika versi ini memerlukannya.
docker compose --env-file .env.production run --rm --build tools bun run db:deploy
docker compose --env-file .env.production up -d --build web
```

Tool administrasi tersedia sebagai perintah sekali jalan:

```sh
docker compose --env-file .env.production run --rm tools bun run admin:grant <Neon-Auth-user-id>
```

Container tidak menjalankan migrasi/seed setiap restart. Simpan backup database di layanan Neon dan kebijakan backup media di S3; mengganti image tidak menghapus data layanan tersebut. Untuk produksi pertama, pastikan environment lengkap: tanpa database aplikasi masih mendukung mode demo dan tanpa auth lengkap login dinonaktifkan.

## Blog

Admin mengelola artikel lewat `/admin?tab=blog`: judul, slug unik, ringkasan, dan isi teks biasa. Simpan sebagai draf atau centang **Terbitkan di website**. Hapus centang untuk menarik artikel dari publik. Penyimpanan selalu memeriksa sesi dan role `ADMIN` di server. Tiga artikel terbit terbaru muncul di beranda; `/blog` menampilkan maksimal 30 artikel terbaru, dengan detail pada `/blog/<slug>`. Draf tidak tersedia di halaman publik atau sitemap. Isi dirender sebagai teks aman, tanpa HTML.

Sebelum menjalankan versi ini pada database yang sudah ada, jalankan `bun run db:generate`, lalu `bun run db:deploy` dengan `DATABASE_URL` database tujuan yang benar. Migrasi `202610180001_blog` menambahkan tabel blog tanpa mengubah data properti. Tanpa database, bagian blog menampilkan keadaan kosong dan dashboard tetap hanya baca.
