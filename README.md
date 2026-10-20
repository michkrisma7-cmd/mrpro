# MR Properti

Website katalog properti dan layanan tukang berbahasa Indonesia. Bagian properti dan layanan dipisahkan. Dibangun dengan Next.js App Router, Prisma, PostgreSQL (native atau Neon melalui TCP), NextAuth (Auth.js) dengan akun Prisma, dan S3.

## Fitur

- Beranda responsif, pencarian properti, filter jenis/transaksi/harga, pagination, urutan harga, favorit per perangkat, galeri, dan detail SEO.
- Katalog/detail layanan: jenis layanan, nama tukang, skill, tarif mulai dari, dan koordinasi lewat WhatsApp admin. Tukang tidak memerlukan akun.
- Login/daftar email dan password, akun pengguna, kirim properti, serta pantau status tinjauan.
- Dashboard `/admin`: statistik, tinjau/terbitkan/arsipkan properti, edit informasi properti, CRUD definisi field, tambah/edit/nonaktifkan layanan, serta pengaturan hero/kontak/area.
- Field dinamis: teks, angka, harga, select, multi select; wajib/opsional; form/kartu/detail dikontrol terpisah; label kartu kosong memakai nama field. Galeri, judul, dan deskripsi merupakan field inti. WhatsApp diperlukan untuk listing.
- Semua mutasi admin memeriksa role di server. Pendaftaran tidak dapat memilih role. Selama masa uji coba, kiriman baru dari Titip Properti langsung `PUBLISHED` (Tayang) hingga ada instruksi berikutnya. Validasi field, sesi, dan kepemilikan foto tetap berlaku; admin masih dapat mengarsipkan properti. Status kiriman lama tidak diubah. Field khusus form disaring sebelum data publik dikirim.
- Unggah gambar JPG/PNG/WebP maksimal 5 MB, maksimal 12 foto per listing. Gambar didekode, dibatasi 25 megapiksel, metadata dibuang, dan disimpan sebagai WebP di S3. Endpoint unggah memerlukan sesi pengguna dan pemeriksaan origin. Batas dasar 36 unggahan/user/jam; pertimbangkan rate limit terdistribusi di gateway untuk beban besar.

## Konfigurasi

Gunakan Bun **1.4.3** dan Node **24**. Isi runtime environment atau `.env.local` dari [.env.example](.env.example). Jangan commit nilai rahasia.

| Variabel                                     | Kegunaan                                                                                         |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`                               | URL PostgreSQL TCP untuk data aplikasi Prisma; gunakan TLS untuk database cloud                  |
| `AUTH_SECRET`                                | Secret acak aplikasi, minimal 32 karakter; buat dengan `openssl rand -base64 32` dan simpan aman |
| `NEXT_PUBLIC_SITE_URL`                       | Origin HTTPS kanonis produksi; saat lokal gunakan origin port yang dipakai                       |
| `AWS_ENDPOINT_URL_S3`                        | Endpoint layanan S3/S3-compatible                                                                |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Kredensial server yang dapat menandatangani request S3                                           |
| `AWS_REGION`                                 | Region bucket                                                                                    |
| `AWS_S3_BUCKET`                              | Default **`bucket`**, sesuai bucket publik yang sudah dibuat pemilik                             |

`DATABASE_URL` dan kredensial AWS signing memerlukan nilai runtime asli, bukan placeholder injeksi proxy HTTP. Secret hanya dibaca di modul server.

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

Skema auth menyimpan email unik dan hash password pada AppUser. Tidak ada migrasi data akun lama. Jangan gunakan `prisma migrate reset`. Seed bersifat berulang dan hanya membuat field/pengaturan yang belum ada; seed tidak membuat listing, tukang, admin, atau kredensial contoh.

Prisma memakai `engineType = client` dan adapter PostgreSQL TCP (`@prisma/adapter-pg` dan `pg`). `db:generate` menggunakan parser WASM dan protokol generator resmi dari versi Prisma yang dipin sehingga tidak memerlukan unduhan native query engine. `db:deploy` memakai Prisma Migrate dan membutuhkan akses `binaries.prisma.sh` serta koneksi ke database. Jangan menonaktifkan pemeriksaan checksum atau TLS bila jaringan menolak unduhan.

Produksi:

```sh
bun run build
bun run start --hostname 0.0.0.0
```

Gambar dan font contoh tersedia lokal. Foto rumah contoh dibuat untuk pratinjau, bukan listing properti nyata. Apabila `DATABASE_URL` belum tersedia, aplikasi menampilkan data contoh berlabel. Ketika database tersedia, hanya data dari database yang dipakai. Login dinonaktifkan bila konfigurasi auth belum lengkap. Dashboard pratinjau hanya baca, tidak menyediakan bypass autentikasi.

## Setup login lokal (NextAuth + Prisma)

Isi `DATABASE_URL`, lalu jalankan `bun auth:setup` untuk membuat `AUTH_SECRET` lokal. Jalankan `bun dev` dan buka `http://localhost:3000/login`. Tidak diperlukan layanan auth eksternal atau HTTPS lokal. `bun auth:check` memeriksa konfigurasi dan akses kolom akun tanpa mengubah data.

Akun disimpan di Prisma, password di-hash dengan scrypt dan salt acak. NextAuth mengelola cookie sesi JWT, CSRF login/logout, serta cookie Secure di HTTPS produksi. Role selalu dibaca ulang dari database. Pendaftaran otomatis masuk dengan role USER. Batas per email berlaku lintas instance melalui database: 10 percobaan login dan 5 pendaftaran per 15 menit. Verifikasi email eksternal tidak digunakan.

Perubahan skema tetap perlu diterapkan dengan `bun db:deploy` sebelum menjalankan versi baru. Ini hanya perubahan skema, tanpa pemindahan data user. Perubahan skema auth sengaja gagal bila tabel AppUser sudah berisi akun, sesuai asumsi belum ada user; jangan reset database produksi.

Pengujian auth terisolasi: `bun test:auth`.

## Admin pertama

1. Buat akun melalui `/login`.
2. Pemilik proyek memverifikasi email akun yang akan diberi akses.
3. Jalankan dari lingkungan tepercaya:

```sh
bun run admin:grant <email>
```

Role admin disimpan di database aplikasi dan dibaca ulang saat otorisasi. Tidak ada admin otomatis berdasarkan email atau user pertama. User biasa yang membuka dashboard mendapat penolakan akses. Pengguna memantau kiriman di `/akun` dan admin melakukan koreksi serta peninjauan di `/admin`.

## SEO dan kecepatan

Metadata utama menargetkan Cikarang dan Bekasi: jual beli/sewa properti, jasa tukang, dan renovasi. Detail properti memakai judul/lokasi listing; detail layanan memakai jenis pekerjaan dan nama tenaga. Setiap halaman publik memiliki canonical dan metadata Open Graph/Twitter sendiri. Pagination katalog memiliki canonical per halaman; pencarian, filter, urutan alternatif, dan favorit diberi noindex. Halaman akun, admin, login, dan form titip properti juga noindex.

Konfigurasi runtime produksi:

```env
NEXT_PUBLIC_SITE_URL=https://domain-production-anda
SEO_INDEXING=true
# Opsional: isi token HTML verification dari Google Search Console.
GOOGLE_SITE_VERIFICATION=
```

Pada beta/staging gunakan `SEO_INDEXING=false`, termasuk bila beta memakai HTTPS dan database nyata. Development, preview Vercel, URL localhost, dan mode tanpa database selalu noindex. Production HTTPS dengan database mengaktifkan indexing secara default kecuali `SEO_INDEXING=false`. Nilai `false` pada `.env.example` perlu diubah untuk production. URL kanonis berasal dari origin `NEXT_PUBLIC_SITE_URL`, tanpa path atau query.

Sitemap `/sitemap.xml` hanya memuat properti PUBLISHED, layanan aktif, artikel terbit, serta halaman publik utama. Gambar properti juga tercantum. Robots mengizinkan media publik di `/api/media/` tanpa membuka API lain. Halaman privat tetap memeriksa autentikasi; robots bukan kontrol akses. Structured data berisi WebSite/Organization pada beranda, RealEstateListing, Service, BlogPosting, dan breadcrumb pada halaman detail. Data yang dirender sebagai JSON-LD di-escape untuk mencegah penutupan tag script dari konten pengguna.

Setelah deploy pada domain production yang benar, verifikasi kepemilikan domain di Google Search Console (DNS atau token HTML di atas), submit `/sitemap.xml`, lalu periksa URL beranda, listing, layanan, dan artikel menggunakan URL Inspection. Gunakan Rich Results Test untuk memeriksa markup yang didukung Google. Schema RealEstateListing/Service membantu mendeskripsikan konten, bukan jaminan rich result atau ranking. Indexing dan perubahan tampilan hasil pencarian memerlukan pemrosesan Google; deployment tidak otomatis mendaftarkan Search Console.

Konten publik dirender server. Data beranda/field/layanan/detail memakai cache 60 detik yang dibatalkan saat mutasi admin. Footer dimuat melalui Suspense. Katalog memakai filter/pagination PostgreSQL; detail hanya menampilkan listing PUBLISHED dan field publik. Gambar memakai next/image, WebP, dan lazy loading; font lokal tidak meminta Google Fonts. UI tidak berubah oleh pengaturan SEO ini. Setelah build, jalankan `bun test:seo` untuk memverifikasi metadata HTML, sitemap publik, canonical domain runtime, structured data, dan beta noindex menggunakan database terisolasi.

## Kalkulator KPR

Halaman `/kalkulator-kpr` tersedia dari tombol utama beranda dan footer bagian Untuk Rumah Anda. Pilihan BTN konvensional memakai anuitas atas sisa pokok: bunga awal berlaku selama masa tetap, lalu angsuran dihitung ulang berdasarkan sisa pokok, sisa tenor, dan asumsi floating. BSI syariah menyediakan ilustrasi angsuran tetap dengan margin ekuivalen efektif; tidak mengasumsikan margin flat atau mereplikasi seluruh pilihan akad/jadwal angsuran BSI. Semua tenor 5–25 tahun dapat dibandingkan.

Harga awal Rp750 juta, DP 20%, bunga/margin ekuivalen 8%, masa tetap BTN 3 tahun, dan floating 12% adalah **contoh asumsi**, bukan tarif resmi bank. Pengguna mengubahnya sesuai penawaran bank. Total DP + cicilan mengecualikan pajak, notaris, administrasi, provisi, asuransi, dan biaya lain. Pembulatan hanya pada tampilan. Persyaratan di bawah kalkulator merupakan panduan dokumen umum; batas usia, tenor, tarif, dan persetujuan final mengikuti bank. Situs resmi BTN/BSI tidak dapat diakses dari lingkungan pengerjaan (kebijakan jaringan), sehingga tarif dan detail syarat terkini belum diverifikasi langsung.

Perhitungan diuji dengan pembayaran acuan, pelunasan pokok setelah perubahan bunga, bunga nol, seluruh 21 tenor, serta penolakan angka tidak valid. Playwright menguji pilihan bank, nilai DP, perubahan tenor, validasi, tautan masuk, dan lebar layar desktop/ponsel.

## Validasi

```sh
bun run lint
bun run typecheck
bun run test
bun run build
bun run test:e2e
```

Unit/integration tests memvalidasi field dinamis, perlindungan unggah, role/status awal, dan constraint skema PostgreSQL. PGlite menjalankan migrasi SQL nyata secara lokal; ini bukan pengujian koneksi Neon. Playwright menguji pratinjau tanpa kredensial di Chromium desktop dan ponsel (server port 3100). Gunakan `PLAYWRIGHT_CHROMIUM_EXECUTABLE` bila lokasi browser berbeda.

Pada implementasi awal, variabel Neon/AWS belum terinjeksi ke mesin sehingga alur login produksi, penerbitan ke Neon, unggah S3 nyata, dan WhatsApp bisnis belum dapat diverifikasi. Setelah konfigurasi aktif, uji: daftar/login → unggah foto → kirim properti → langsung Tayang → katalog/detail publik → arsipkan dari admin bila diperlukan. Pastikan user biasa ditolak oleh seluruh aksi admin. Isi kontak WhatsApp yang benar dari dashboard; contoh tidak memakai nomor bisnis palsu.

Template ZIP WordPress dipakai sebagai referensi visual dan perilaku field. ZIP tidak berisi database konten WordPress; listing, media, akun, dan URL lama belum dimigrasikan. Migrasi konten memerlukan ekspor dan pemetaan URL/redirect terpisah.

## Deploy ke Vercel atau VPS

Project siap untuk dua target; database memakai **PostgreSQL melalui TCP (native atau Neon)**, auth memakai **NextAuth + Prisma**, dan media tetap **S3**. Compose menghubungkan aplikasi ke database melalui `DATABASE_URL` dan tidak membuat server PostgreSQL. Untuk PostgreSQL native di host VPS, gunakan IP gateway Docker dan izinkan subnet network aplikasi di `pg_hba.conf`. Tidak ada data permanen yang disimpan di container aplikasi.

### Vercel (saat nanti ingin deploy)

1. Import repository sebagai framework Next.js, root directory project ini, dan gunakan Node.js **24.x** (juga ditentukan lewat `engines`). `vercel.json` memakai Bun bawaan build image untuk install dengan frozen lockfile dan build project; versi Bun dicetak di build log. Bun harus mendukung lockfile 1.4.x. Perintah tidak memakai bootstrap `bunx bun@1.4.3`, yang dapat berhenti sebelum instalasi dependency dimulai. Runtime aplikasi tetap Node.js. Jika pernah memasang override command di dashboard, sesuaikan Install Command menjadi `bun --version && bun install --frozen-lockfile` dan Build Command menjadi `bun run db:deploy && bun run build`.
2. Isi environment dari `.env.example` untuk environment tujuan sebelum build. Gunakan `NEXT_PUBLIC_SITE_URL=https://domain-anda` dan secret cookie yang tetap antar-deploy. Variabel publik ini melekat saat build; perubahan domain memerlukan rebuild. Jangan set `DOCKER_BUILD` di Vercel.
3. Build Vercel menjalankan `bun run db:deploy && bun run build`: migration yang belum diterapkan dijalankan otomatis sebelum build aplikasi. Jika migrasi gagal, build berhenti. Setiap perubahan schema harus disertai file migration di `prisma/migrations/` yang ikut di-commit; mengubah `schema.prisma` saja tidak memperbarui tabel produksi. Pastikan `DATABASE_URL` tersedia saat build dan menunjuk database environment tujuan; gunakan database terpisah untuk Preview dan Production karena keduanya menjalankan migrasi. Seed tidak otomatis; jalankan `bun run db:seed` dari mesin tepercaya dengan environment tujuan bila diperlukan saat penyiapan pertama.
4. Isi AUTH_SECRET acak minimal 32 karakter dan pastikan bucket serta izin S3 sudah tersedia. Gunakan database terpisah untuk preview. Nilai `NEXT_PUBLIC_SITE_URL` harus sesuai origin deployment yang diuji.
5. Deploy menggunakan alur Vercel pilihan Anda. Cek `/api/health`, login, katalog, dan unggah sesudah deploy.

Konfigurasi di repository tidak membuat project, menghubungkan akun, atau melakukan deployment Vercel. Referensi deteksi Bun dan install command: [dokumentasi resmi Vercel](https://vercel.com/docs/package-managers).

### VPS dengan Docker Compose

VPS memakai image yang sudah tersedia di registry. Simpan `docker-compose.yaml` dan `.env` produksi di `~/web-me`. Compose membaca environment dari `.env`; isi konfigurasi database/auth/S3 dan origin HTTPS aplikasi di sana. Network eksternal `hostme` yang dipakai Compose harus sudah tersedia. Jika image GHCR private, login registry sekali sebagai user SSH yang menjalankan deployment.

```sh
cd ~/web-me
docker compose pull
docker compose up -d
```

Siapkan reverse proxy HTTPS menuju port aplikasi 3000. Login produksi membutuhkan HTTPS. Izinkan request body minimal 6 MB untuk unggahan gambar. Workflow deploy menjalankan migrasi sebelum memperbarui container web. Seed tetap dijalankan terpisah.

Dockerfile memakai tahap tools (Prisma CLI dan file migrasi), builder, serta runner dengan base Node 24 bersama. Bun memasang dependency dan membangun Next.js; runtime menjalankan output standalone sebagai user non-root. Dockerfile ini digunakan oleh proses pembuat image, bukan oleh workflow SSH di bawah.

## Blog

Admin mengelola artikel lewat `/admin?tab=blog`: judul, slug unik, ringkasan, dan isi teks biasa. Slug boleh dikosongkan agar dibuat otomatis dari judul; jika sudah digunakan, sistem menambahkan akhiran unik. Simpan sebagai draf atau centang **Terbitkan di website**. Hapus centang untuk menarik artikel dari publik. Penyimpanan selalu memeriksa sesi dan role `ADMIN` di server. Tiga artikel terbit terbaru muncul di beranda; `/blog` menampilkan maksimal 30 artikel terbaru, dengan detail pada `/blog/<slug>`. Draf tidak tersedia di halaman publik atau sitemap. Isi dirender sebagai teks aman, tanpa HTML.

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

Alur: checkout → Docker Buildx → login GHCR → build dan push `ghcr.io/michkrisma7-cmd/mrpro:latest` → login SSH ke `116.212.73.143` menggunakan user/password lewat `appleboy/ssh-action` → login GHCR di VPS → `cd ~/web-me` → `docker compose pull` → jalankan image `mrpro:migrate` pada network `hostme` dengan `.env` VPS → `docker compose up -d`.

Isi GitHub repository **Settings → Secrets and variables → Actions**:

- Secret `VPS_USER`: username SSH VPS.
- Secret `VPS_PASSWORD`: password SSH VPS.
- Variable `VPS_PORT` opsional: port SSH, default `22`.

Login GHCR di runner dan VPS memakai `GITHUB_TOKEN` bawaan Actions; tidak perlu secret GHCR tambahan atau `VPS_KNOWN_HOSTS`. Workflow diberi izin `packages: write`. Jika package `mrpro` sudah ada, pastikan repository ini mendapat akses Actions untuk membaca/menulis package tersebut melalui pengaturan package GHCR.

User SSH harus bisa menjalankan Docker tanpa prompt sudo. File Compose dan `.env` sudah tersedia di `~/web-me` pada VPS, dengan image yang sama seperti tag workflow. Workflow tidak mengirim source/Compose, atau mengubah env aplikasi. Migrasi Prisma dijalankan otomatis; jika gagal, workflow berhenti sebelum mengganti container web. Build image tidak meminta konfigurasi `NEXT_PUBLIC_SITE_URL` dari GitHub.

Image `ghcr.io/michkrisma7-cmd/mrpro:migrate` hanya memasang Prisma CLI 6.19.3 beserta dependency CLI dan menyalin folder `prisma`, tanpa dependency aplikasi, Bun, atau source Next.js; image web tetap memakai output standalone. Untuk menerapkan migrasi secara manual setelah image baru dipublikasikan:

```sh
cd ~/web-me
docker pull ghcr.io/michkrisma7-cmd/mrpro:migrate
umask 077
migration_config=$(mktemp)
trap 'rm -f "$migration_config"' EXIT
docker compose config > "$migration_config"
sed -i 's/\$/$$/g' "$migration_config"
docker compose --project-directory "$PWD" -f "$migration_config" -f - run --rm --no-deps -T web node node_modules/prisma/build/index.js migrate deploy <<'MIGRATION'
services:
  web:
    image: ghcr.io/michkrisma7-cmd/mrpro:migrate
MIGRATION
```

Pastikan `DATABASE_URL` menunjuk database tujuan yang benar. Database yang sudah berisi tabel dari proses lain mungkin memerlukan baseline Prisma terlebih dahulu; jangan memakai `migrate reset` pada produksi. Migrasi yang berhasil tidak otomatis di-rollback bila deployment berikutnya gagal.

Migrasi memakai Compose yang sama dengan service web, dengan override image sementara melalui stdin. Environment dan network mengikuti service web; file Compose di VPS tidak diubah. Ini menghindari perbedaan parsing `.env` antara `docker run --env-file` dan Compose, termasuk tanda kutip serta interpolasi variabel.

Pull dan up langsung memakai `docker compose` dari `~/web-me`. Migrasi memakai konfigurasi hasil `docker compose config` dalam file sementara dengan izin terbatas yang dihapus setelah proses selesai; nama file Compose di VPS tidak perlu ditentukan.

Build image web dan migrasi memakai cache GitHub Actions terpisah. Perubahan kode aplikasi tidak membatalkan layer instalasi Prisma CLI; perubahan migrasi hanya mengganti layer folder `prisma`.

## Otomasi blog n8n

Workflow WordPress yang dimigrasikan ke API Next.js tersedia di [workflows/n8n/mr-properti-blog-nextjs.json](workflows/n8n/mr-properti-blog-nextjs.json). Ikuti [panduan setup](workflows/n8n/README.md) untuk credential Header Auth, uji manual tanpa publikasi, dan jadwal 4x sehari WIB. Kedua method `GET /api/blog` (riwayat dan pemeriksaan slot) dan `POST /api/blog` (simpan artikel) memakai `BLOG_API_KEY` melalui header `x-api-key`.

## Chat

Tombol **Chat** di kanan bawah membantu informasi properti dan layanan dari knowledge publik MR Properti. Pertanyaan di luar cakupan, data yang belum cukup, permintaan tim dan kegagalan layanan diarahkan ke WhatsApp dari Pengaturan Situs. Integrasi memakai webhook n8n melalui server Next.js; ikuti [setup Chat](workflows/n8n/CHAT.md). Isi `N8N_CHAT_WEBHOOK_URL` dan `N8N_CHAT_WEBHOOK_SECRET` pada environment server. Secret tidak dikirim ke browser.
