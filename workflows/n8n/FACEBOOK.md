# Terbitkan properti → Webhook → Facebook Graph API

Impor [mr-properti-facebook-pages.json](./mr-properti-facebook-pages.json) ke n8n. Alur workflow:

**Properti Diterbitkan → Get Me → Siapkan Semua Foto → Upload Photos → Gabungkan ID Foto → Upload feed**

Tidak ada schedule, polling, antrean, API pembaca properti, atau migration database.

## Kapan berjalan

Aksi admin **Terbitkan** mengirim webhook setelah status tersimpan, hanya jika status berubah dari selain PUBLISHED menjadi PUBLISHED.

- Edit judul, harga, deskripsi, dan informasi lain tidak mengirim webhook.
- Menyimpan properti yang sudah PUBLISHED, termasuk mengubah unggulan, tidak mengirim webhook.
- Arsip lalu Terbitkan kembali mengirim webhook lagi karena ada perubahan status baru.
- Titipan baru yang langsung dibuat PUBLISHED tidak mengirim webhook; pemicu ini khusus perubahan status melalui aksi admin.

## Setup

1. Pada node **Properti Diterbitkan**, pilih credential **Header Auth**: Name `x-api-key`, Value secret acak milik Anda.
2. Pada **Get Me**, **Upload Photos**, dan **Upload feed**, pilih credential Page yang sama. Get Me membaca Page ID melalui `me`. File memakai Graph API `v25.0`.
3. Pilih credential **Facebook Graph API** berisi **Page Access Token** dengan izin posting ke Page tujuan. Token hanya disimpan pada credential n8n.
4. Aktifkan/publish workflow lalu salin **Production URL** dari node webhook.
5. Pada environment aplikasi, isi:

```dotenv
N8N_FACEBOOK_WEBHOOK_URL=https://n8n.example.com/webhook/mr-properti-published
N8N_FACEBOOK_WEBHOOK_SECRET=secret-yang-sama-dengan-header-auth-n8n
NEXT_PUBLIC_SITE_URL=https://mrproperti.com
```

Tidak ada konfigurasi CI/CD yang diubah. Tanpa URL webhook, integrasi tidak dijalankan.

## Payload

Aplikasi langsung mengirim caption siap pakai dan URL detail; n8n tidak perlu mengambil data lagi:

```json
{
  "event": "property.published",
  "propertyId": "id-properti",
  "message": "🏡 Properti baru di MR Properti\n\nRumah di Cikarang\n\nHarga: Rp 500.000.000",
  "link": "https://mrproperti.com/properti/rumah-di-cikarang",
  "image_urls": [
    "https://mrproperti.com/api/media/foto1",
    "https://mrproperti.com/api/media/foto2"
  ]
}
```

Website mengirim seluruh gallery sebagai `image_urls` HTTPS publik. Upload Photos memproses satu item per foto dengan `published=false`. Gabungkan ID Foto menunggu hasil seluruh upload, lalu menghasilkan satu item berisi semua `media_fbid`. Upload feed membuat satu post dengan `attached_media`; tautan properti disertakan dalam caption. Jika satu upload gagal atau tidak mengembalikan ID, feed tidak diterbitkan. Foto yang sudah terunggah dapat tertinggal sebagai unpublished; tidak ada retry otomatis.

## Pengujian dan kegagalan

Uji dengan Page khusus pengujian. Klik **Listen for test event** pada webhook, arahkan URL aplikasi sementara ke **Test URL**, lalu ubah status satu properti dari belum terbit menjadi Terbitkan. Uji webhook ini **benar-benar mengirim posting ke Facebook** bila credential terpasang. Sesudah uji, gunakan kembali Production URL.

Webhook merespons segera saat menerima request; hasil posting Facebook dilihat pada **Executions** n8n. Jika aplikasi gagal menghubungi webhook, status properti tetap terbit dan admin melihat pesan pengiriman gagal. Tidak ada retry otomatis atau penyimpanan antrean. Jika ada timeout atau eksekusi gagal, periksa Page sebelum mengulang agar tidak membuat duplikat. Menekan Terbitkan lagi ketika status masih PUBLISHED tidak mengirim ulang.

Workflow belum diimpor atau dijalankan pada n8n/Meta pengguna. Pengujian lokal memeriksa pemicu perubahan status, payload, dan penggabungan beberapa foto menjadi satu item feed, serta penolakan hasil upload yang tidak lengkap.

Referensi: [Facebook Graph API node](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.facebookgraphapi/).
