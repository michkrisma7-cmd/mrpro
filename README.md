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

1. Import repository sebagai framework Next.js, root directory project ini, dan gunakan Node.js **24.x** (juga ditentukan lewat `engines`). `vercel.json` memakai Bun bawaan build image untuk install dengan frozen lockfile dan build project; versi Bun dicetak di build log. Bun harus mendukung lockfile 1.4.x. Perintah tidak memakai bootstrap `bunx bun@1.4.3`, yang dapat berhenti sebelum instalasi dependency dimulai. Runtime aplikasi tetap Node.js. Jika pernah memasang override command di dashboard, sesuaikan Install Command menjadi `bun --version && bun install --frozen-lockfile` dan Build Command menjadi `bun run db:deploy && bun run build`.
2. Isi environment dari `.env.example` untuk environment tujuan sebelum build. Gunakan `NEXT_PUBLIC_SITE_URL=https://domain-anda` dan secret cookie yang tetap antar-deploy. Variabel publik ini melekat saat build; perubahan domain memerlukan rebuild. Jangan set `DOCKER_BUILD` di Vercel.
3. Build Vercel menjalankan `bun run db:deploy && bun run build`: migration yang belum diterapkan dijalankan otomatis sebelum build aplikasi. Jika migrasi gagal, build berhenti. Setiap perubahan schema harus disertai file migration di `prisma/migrations/` yang ikut di-commit; mengubah `schema.prisma` saja tidak memperbarui tabel produksi. Pastikan `DATABASE_URL` tersedia saat build dan menunjuk database environment tujuan; gunakan database terpisah untuk Preview dan Production karena keduanya menjalankan migrasi. Seed tidak otomatis; jalankan `bun run db:seed` dari mesin tepercaya dengan environment tujuan bila diperlukan saat penyiapan pertama.
4. Daftarkan origin HTTPS di Neon Auth dan pastikan bucket serta izin S3 sudah tersedia. Untuk preview yang memakai login, daftarkan origin preview juga dan gunakan database/layanan terpisah bila perlu. Nilai `NEXT_PUBLIC_SITE_URL` harus sesuai origin deployment yang diuji.
5. Deploy menggunakan alur Vercel pilihan Anda. Cek `/api/health`, login, katalog, dan unggah sesudah deploy.

Konfigurasi di repository tidak membuat project, menghubungkan akun, atau melakukan deployment Vercel. Referensi deteksi Bun dan install command: [dokumentasi resmi Vercel](https://vercel.com/docs/package-managers).

### VPS dengan Docker Compose

VPS memakai image yang sudah tersedia di registry. Simpan `docker-compose.yaml` dan `.env` produksi di `~/web-me`. Compose membaca environment dari `.env`; isi konfigurasi Neon/S3 dan origin HTTPS aplikasi di sana. Network eksternal `hostme` yang dipakai Compose harus sudah tersedia. Jika image GHCR private, login registry sekali sebagai user SSH yang menjalankan deployment.

```sh
cd ~/web-me
docker compose pull
docker compose up -d
```

Siapkan reverse proxy HTTPS menuju port aplikasi 3000. Login produksi membutuhkan HTTPS. Izinkan request body minimal 6 MB untuk unggahan gambar. Migrasi dan seed database dijalankan terpisah dari workflow deploy.

Dockerfile memakai tahap builder dan runner dengan base Node 24 bersama. Bun memasang dependency dan membangun Next.js; runtime menjalankan output standalone sebagai user non-root. Dockerfile ini digunakan oleh proses pembuat image, bukan oleh workflow SSH di bawah.

## Blog

Admin mengelola artikel lewat `/admin?tab=blog`: judul, slug unik, ringkasan, dan isi teks biasa. Simpan sebagai draf atau centang **Terbitkan di website**. Hapus centang untuk menarik artikel dari publik. Penyimpanan selalu memeriksa sesi dan role `ADMIN` di server. Tiga artikel terbit terbaru muncul di beranda; `/blog` menampilkan maksimal 30 artikel terbaru, dengan detail pada `/blog/<slug>`. Draf tidak tersedia di halaman publik atau sitemap. Isi dirender sebagai teks aman, tanpa HTML.

Sebelum menjalankan versi ini pada database yang sudah ada, jalankan `bun run db:generate`, lalu `bun run db:deploy` dengan `DATABASE_URL` database tujuan yang benar. Migrasi `202610180001_blog` menambahkan tabel blog tanpa mengubah data properti. Tanpa database, bagian blog menampilkan keadaan kosong dan dashboard tetap hanya baca.

### Membuat artikel lewat REST API

Set `BLOG_API_KEY` dengan secret acak (misalnya hasil `openssl rand -hex 32`) di environment server/Vercel, lalu redeploy. Simpan key di pemanggil server, bukan kode frontend atau variabel `NEXT_PUBLIC_*`. Jika key belum diisi, endpoint dinonaktifkan dengan status 503. Endpoint hanya menyediakan pembuatan artikel, tanpa login cookie.

```sh
curl -X POST 'https://domain-anda/api/blog' \
  -H "x-api-key: $BLOG_API_KEY" \
  -H 'Content-Type: application/json' \
  --data '{
    "title": "Tips memilih rumah pertama",
    "slug": "tips-memilih-rumah-pertama",
    "excerpt": "Panduan singkat sebelum membeli rumah pertama Anda.",
    "content": "Kenali kebutuhan keluarga dan tentukan anggaran sebelum memilih rumah.",
    "published": true
  }'
```

Field wajib: `title` (3–160 karakter), `slug` (1–180 karakter; huruf kecil, angka, tanda hubung), `excerpt` (10–350 karakter), dan `content` (20–50.000 karakter; teks biasa). `published` opsional berupa boolean, default `false` (draf); kirim `true` agar artikel langsung tampil di blog. Field tambahan ditolak. Respons sukses `201` berisi `{ "data": { ...artikel } }`, termasuk ID, slug, status publikasi, serta timestamp. Slug yang sudah dipakai menghasilkan `409`; endpoint ini tidak memperbarui artikel lama. API key salah/kosong menghasilkan `401`, JSON/data salah `400`, Content-Type salah `415`, database belum dikonfigurasi `503`, dan kegagalan penyimpanan `500`. Halaman utama, blog, sitemap, dan admin diperbarui pada kunjungan berikutnya. Tidak perlu migration database tambahan untuk endpoint ini.


### GitHub Actions → VPS

Workflow `.github/workflows/deploy-vps.yml` berjalan saat push ke `main` (termasuk merge PR ke `main`) atau manual melalui Actions. Membuka/memperbarui PR tidak melakukan deploy.

Alur: checkout → Docker Buildx → login GHCR → build dan push `ghcr.io/michkrisma7-cmd/mrpro:latest` → login SSH ke `116.212.73.143` menggunakan user/password lewat `appleboy/ssh-action` → login GHCR di VPS → `cd ~/web-me` → `docker compose pull` → `docker compose up -d`.

Isi GitHub repository **Settings → Secrets and variables → Actions**:

- Secret `VPS_USER`: username SSH VPS.
- Secret `VPS_PASSWORD`: password SSH VPS.
- Variable `VPS_PORT` opsional: port SSH, default `22`.

Login GHCR di runner dan VPS memakai `GITHUB_TOKEN` bawaan Actions; tidak perlu secret GHCR tambahan atau `VPS_KNOWN_HOSTS`. Workflow diberi izin `packages: write`. Jika package `mrpro` sudah ada, pastikan repository ini mendapat akses Actions untuk membaca/menulis package tersebut melalui pengaturan package GHCR.

User SSH harus bisa menjalankan Docker tanpa prompt sudo. `docker-compose.yaml` dan `.env` sudah tersedia di `~/web-me` pada VPS, dengan image yang sama seperti tag workflow. Workflow tidak mengirim source/Compose, mengubah env aplikasi, atau menjalankan migrasi. Build image tidak meminta konfigurasi `NEXT_PUBLIC_SITE_URL` dari GitHub.
