# Chat MR Properti — Next.js + n8n

Alur: tombol **Chat** → `POST /api/chat` → webhook n8n → `GET /api/chat/knowledge` pada origin sesuai DEV → OpenRouter/Gemini → validasi referensi di Next.js → jawaban atau WhatsApp. Next.js juga mencari sumber untuk memvalidasi ID hasil model; isi knowledge tidak berasal dari browser.

## Setup

1. Gunakan workflow [mr-properti-chat-nextjs.json](./mr-properti-chat-nextjs.json). Versi draft bernama **MR Properti — Chat Next.js** juga telah diimpor ke dashboard n8n selama pengerjaan.
2. Pada **Chat Webhook**, pilih/buat credential **Header Auth** khusus Chat. Name: `x-mr-token`. Value: secret yang sama dengan `N8N_CHAT_WEBHOOK_SECRET` di environment Next.js. Lokal sudah disiapkan di `.env.local`; jangan commit atau menaruh nilainya di file workflow. Pengisian credential di browser dilakukan pemilik akun.
3. Pilih credential OpenRouter dan Gemini yang sudah ada. Model mengikuti pilihan workflow lama. Pastikan model tersedia pada akun; kegagalan utama atau keluaran invalid mencoba Gemini, kegagalan kedua model mengarahkan ke WhatsApp.
4. Nonaktifkan/unpublish workflow chat WordPress lama sebelum mempublish workflow baru karena sama-sama memakai path `mr-konsultasi`.
5. Node **Konfigurasi** sekarang memiliki sakelar:

```js
const DEV = true;
const baseUrl = DEV
  ? "https://6084-114-79-5-7.ngrok-free.app"
  : "https://mrproperti.com";
```

**DEV memilih website sumber knowledge**, bukan memilih webhook test/produksi. Node **Baca Data MR** mengambil `/api/chat/knowledge?search=...` dari `baseUrl`, menggunakan header `x-mr-token` yang diterima webhook terautentikasi. Tidak perlu credential tambahan. Jika URL ngrok berubah, perbarui URL node dan `CHAT_DEV_SITE_URL` lokal.

Environment aplikasi Next.js:

```env
N8N_CHAT_WEBHOOK_URL=https://n8n.mrproperti.com/webhook/mr-konsultasi
N8N_CHAT_WEBHOOK_SECRET=<secret Header Auth n8n>
```

`DATABASE_URL` harus tersedia. WhatsApp memakai **Pengaturan Situs** di dashboard admin; tidak mengambil nomor dari AI. Tidak ada perubahan skema database. Isi environment produksi melalui pengelolaan server milik pemilik; perubahan CI/CD tidak diperlukan dalam kode fitur ini dan tidak dilakukan.

6. Untuk tes lokal/ngrok, `.env.local`:

```env
N8N_CHAT_WEBHOOK_URL=https://n8n.mrproperti.com/webhook-test/mr-konsultasi
CHAT_DEV_SITE_URL=https://6084-114-79-5-7.ngrok-free.app
```

Klik **Listen for test event** / **Execute workflow** di n8n **sebelum** mengirim satu pesan. Test listener harus diaktifkan lagi untuk panggilan berikutnya. Pesan yang memang ditolak langsung oleh pembatas topik website tidak memanggil n8n.

- **404 webhook is not registered**: listener belum aktif, sudah kedaluwarsa atau sudah menerima satu panggilan.
- **403 Authorization data is wrong!**: nama/value credential Header Auth tidak sama dengan `x-mr-token` / `N8N_CHAT_WEBHOOK_SECRET` Next.js. Kapitalisasi nama header tidak berpengaruh.
- **Knowledge 401**: secret website sumber knowledge berbeda dari secret webhook yang diteruskan.
- **Knowledge 404 / ngrok offline**: periksa nilai DEV, URL ngrok dan server lokal.
- Log terminal Next.js mencatat kode seperti `[chat] webhook_http_403` atau `webhook_http_404` tanpa menampilkan secret/isi pesan.

Untuk produksi, set **DEV=false**, gunakan URL `/webhook/mr-konsultasi` di environment website produksi dan publish workflow. Produksi tidak menerima origin ngrok hanya karena `CHAT_DEV_SITE_URL` terisi; izin tambahan ini khusus `next dev`.

7. Buka website, klik **Chat**, lalu uji:
   - “Berapa lama cuci AC?” → jawaban dari katalog beserta referensi halaman layanan.
   - “Bagaimana cara titip properti?” → penjelasan alur dari knowledge.
   - “Bantu buat kode Python” → menolak topik di luar MR Properti dan menawarkan WhatsApp.
   - Permintaan admin, pemesanan, survei atau data yang belum cukup → ajakan WhatsApp.
   - Jika n8n gagal/timeout, widget tetap menampilkan pesan bantuan dan WhatsApp.

## Sumber knowledge

- `SiteSettings`: informasi dan cakupan situs.
- `Property`: hanya `PUBLISHED`; hanya field dinamis yang ditampilkan pada kartu/detail publik. Pencarian judul, lokasi, jenis/transaksi dan proyek; maksimal 8 kandidat.
- `Service`: hanya layanan aktif; tarif selalu disebut “mulai”, bukan harga final.
- `BlogPost`: hanya judul dan excerpt artikel terbit; maksimal 4 kandidat, bukan isi artikel lengkap.
- `lib/home-services.json`: katalog pekerjaan yang sama dengan halaman layanan publik, termasuk cakupan pekerjaan, pengecualian, estimasi dan panduan waktu.
- Panduan aplikasi: titip properti dan konfirmasi transaksi melalui tim.

Tidak menggunakan data demo sebagai knowledge saat database tidak tersedia. Update pada data publik admin otomatis dibaca lagi tiap request; katalog pekerjaan mengikuti pembaruan file sumber yang dipakai halaman layanan. Maksimal 8 sumber relevan dikirim ke n8n agar prompt tidak membawa seluruh database. Daftar hasil bersifat sebagian; Chat tidak boleh menyimpulkan tidak ada pilihan lain.

## Pembatasan jawaban

Server menolak topik di luar cakupan yang eksplisit sebelum memanggil model. Prompt n8n membatasi sisa pertanyaan pada sumber yang diberikan. Setiap jawaban fakta harus membawa `source_ids`; ID yang tidak ada, JSON rusak, tautan buatan model atau jawaban tanpa sumber ditolak. Website membuat tautan referensi dan WhatsApp sendiri. Untuk hasil `handoff`, website memakai teks ajakan tim yang tetap, sehingga model tidak dapat mengklaim pemesanan berhasil.

Pemeriksaan ID sumber memastikan referensi berasal dari knowledge yang dikirim; ini bukan pembuktian otomatis bahwa setiap kalimat model benar. Untuk kepastian harga, ketersediaan, legalitas, kredit, jadwal, dan transaksi, prompt meminta alih ke tim.

Pesan maksimal 1.200 karakter, riwayat maksimal 6 pesan dan body request dibatasi 20 KB. Batas 15 pesan/sesi per 15 menit dan 300 panggilan per 15 menit untuk seluruh situs memakai tabel counter database yang sudah ada. Cookie sesi HttpOnly tidak berisi isi percakapan. Pembatasan global menjaga kuota meski pengunjung membuat sesi baru. Request wajib berasal dari origin website yang sesuai.

Riwayat widget hanya berada di memori tab; tidak disimpan ke database atau localStorage. Pesan dan cuplikan knowledge dikirim ke n8n serta provider model agar dapat dijawab. n8n dapat menyimpan payload di Executions sesuai konfigurasi retensinya; jangan membagikan execution yang berisi percakapan pribadi.

## Respons API

```json
{
  "reply": "Penjelasan berdasarkan informasi layanan MR Properti.",
  "handoff": false,
  "sources": [{ "title": "Cuci AC — AC", "path": "/layanan/ac" }],
  "whatsappUrl": "https://wa.me/..."
}
```

Browser dan server pemanggil webhook hanya mengirim `{message, history}`. Field `knowledge` dari browser ditolak. n8n mengambil knowledge melalui endpoint yang membutuhkan secret, lalu mengembalikan ID sumber. Secret dan URL webhook hanya dipakai server. Jika environment/layanan bermasalah, API mengembalikan jawaban handoff; UI tidak menampilkan error teknis provider. Respons 429 tetap berisi pesan dan tombol WhatsApp.

## Hasil verifikasi integrasi

Diuji lewat `POST /api/chat` lokal ke test listener workflow **MR Properti — Chat Next.js** dengan `DEV=true`. Endpoint knowledge lokal dan ngrok sama-sama mengembalikan 200. Pertanyaan “Berapa lama cuci AC?” berhasil melewati workflow penuh dan menghasilkan HTTP 200, `handoff: false`, jawaban estimasi 45–60 menit per unit setelah teknisi tiba, serta sumber `/layanan/ac`. UI n8n menampilkan **Workflow executed successfully**. Pada percobaan sebelumnya, OpenRouter sempat membalas rate limit; pembatasan provider dapat berubah sesuai kuota akun.

Test listener digunakan untuk pengujian ini; pengujian tersebut tidak mempublish workflow atau mengubah environment produksi.
