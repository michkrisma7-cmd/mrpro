# Pemetaan kata kunci MR Properti

Disusun 12 November 2026. Prioritas berdasarkan kesesuaian layanan dan contoh
hasil pencarian publik, bukan estimasi volume bulanan atau jaminan peringkat.
Platform listing mencakup seluruh Indonesia; pekerjaan lapangan terbatas pada
Bekasi, Cikarang, Karawang, dan Cikampek sesuai ketersediaan tim.

| URL                              | Fokus utama                                | Kata pendukung / penerapan                                                                                                                                                              |
| -------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                              | MR Properti; jual beli properti            | sewa properti, over kredit properti, listing properti Indonesia; title, H1, teks pengenalan, tautan pasang iklan                                                                        |
| `/properti`                      | properti dijual dan disewa                 | rumah, tanah, apartemen, ruko, over kredit; title, H1, deskripsi katalog                                                                                                                |
| `/properti/[slug]`               | jenis properti + transaksi + lokasi aktual | contoh: rumah dijual di Cikarang, rumah over kredit di Bekasi, sewa ruko di Cikarang, rumah dijual di Karawang/Cikampek; metadata otomatis memakai data listing tanpa memaksakan lokasi |
| `/titip-properti`                | pasang iklan properti                      | pasang iklan rumah, iklan jual/sewa/over kredit; metadata, H1, pengantar formulir, tautan beranda, sitemap                                                                              |
| `/layanan`                       | jasa renovasi dan perbaikan rumah          | jasa tukang; wilayah layanan sebenarnya                                                                                                                                                 |
| `/layanan/ac`                    | jasa servis dan pasang AC                  | cuci AC, bongkar pasang AC sesuai rincian yang sudah ada                                                                                                                                |
| `/layanan/plafon`                | jasa pasang plafon                         | rincian plafon dan material mengikuti isi halaman                                                                                                                                       |
| `/layanan/kanopi`                | jasa pasang kanopi                         | pemasangan dan perbaikan sesuai rincian halaman                                                                                                                                         |
| `/layanan/pagar`                 | jasa pembuatan dan perbaikan pagar         | material mengikuti pilihan pekerjaan                                                                                                                                                    |
| `/layanan/kelistrikan`           | jasa instalasi dan perbaikan listrik rumah | pekerjaan kelistrikan sesuai lingkup layanan                                                                                                                                            |
| `/layanan/baja-ringan`           | jasa pasang atap baja ringan               | rincian atap dan rangka sesuai isi halaman                                                                                                                                              |
| `/layanan/dak-peningkatan-rumah` | jasa dak dan peningkatan rumah             | kebutuhan survei dan peninjauan struktur mengikuti isi halaman                                                                                                                          |
| `/layanan/kitchen-set`           | jasa pembuatan kitchen set                 | pilihan pekerjaan dan material sesuai halaman                                                                                                                                           |
| `/layanan/pengecatan`            | jasa pengecatan rumah                      | rincian pengecatan sesuai isi halaman                                                                                                                                                   |
| `/layanan/perbaikan-rumah`       | jasa renovasi dan perbaikan rumah          | pekerjaan ringan hingga menengah sesuai kemampuan tim                                                                                                                                   |
| `/kalkulator-kpr`                | kalkulator KPR; simulasi cicilan rumah     | uang muka, tenor; BTN/BSI hanya sebagai ilustrasi pembiayaan yang tersedia                                                                                                              |
| `/blog`                          | tips properti dan panduan rumah            | jual beli, sewa, KPR, renovasi dan perawatan; setiap artikel tetap memakai topik sebenarnya                                                                                             |

Judul layanan menampilkan jenis jasa serta Bekasi dan Cikarang. Deskripsi dan
isi menjelaskan empat wilayah beserta batas ketersediaannya. Tidak membuat
puluhan halaman lokasi dengan isi serupa. Filter katalog tetap noindex untuk
menghindari indeks kombinasi pencarian tanpa batas.

Halaman Pasang Iklan adalah halaman publik, dapat dipakai tanpa akun, dan
dibuat dapat diindeks pada produksi yang memenuhi pengaman `indexingEnabled`.
Halaman akun/admin, preview/beta, dan hasil pencarian berfilter tetap mengikuti
aturan noindex yang sudah ada. Klaim gratis tidak ditambahkan.

## Referensi riset

- https://www.rumah123.com/jual/bekasi/cikarang/over-kredit/rumah/
- https://www.rumah123.com/jual/karawang/rumah/
- https://www.rumah123.com/jual/cikampek/rumah/
- https://www.brighton.co.id/disewa/ruko/cikarang
- https://www.pinhome.id/layanan/pasang-iklan-properti
- https://tukangcikarang.com/layanan
- https://www.rumah123.com/kpr/simulasi-kpr/
- https://developers.google.com/search/docs/essentials
- https://developers.google.com/search/docs/fundamentals/seo-starter-guide

## Evaluasi setelah penerapan

Bandingkan periode di Search Console setelah Google merayapi ulang. Periksa
kueri dan halaman bersama: tayangan/klik pencarian properti, pasang iklan, dan
jasa yang sesuai; gunakan kueri BSI untuk menemukan URL pemicunya. Jangan
menyimpulkan penyebab BSI tanpa data URL dari Search Console. Penyebutan bank
sebagai patokan lokasi yang benar tidak perlu dihapus dari deskripsi pemilik.
Tidak ada akses Search Console atau pengiriman permintaan pengindeksan dalam
perubahan kode ini.
