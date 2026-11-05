# Referensi wilayah Indonesia

Snapshot lokal dari `cahyadsn/wilayah`, `db/wilayah.sql`, commit
`d68e8d5516f969d1905d0b2940f20034becb0db7` (13 Februari 2026), diambil
5 November 2026. Header sumber menyebut Kepmendagri 300.2.2-2138 Tahun 2025.
Jangan menyebut snapshot ini sebagai data pemerintah real-time.

Sumber: https://github.com/cahyadsn/wilayah
Lisensi MIT dan atribusi dipertahankan dalam LICENSE.

`indonesia.json` memuat 38 provinsi, 514 kabupaten/kota, 7.285 kecamatan,
dan 83.762 desa/kelurahan. Seluruh kode unik dan setiap wilayah memiliki induk.
Kode Kemendagri disimpan sebagai string bertitik; jangan mencampur kode BPS.
`provenance.json` mencatat versi sumber, jumlah baris, dan checksum SQL asli.

Data dikelompokkan per tingkat dan kode induk. Browser hanya menerima satu
kelompok melalui `/api/wilayah`; tidak ada permintaan ke penyedia data luar.
Dataset tidak diimpor oleh komponen client. JSON dipadatkan dengan sengaja.

Untuk pembaruan, tinjau perubahan sumber/lisensi, konversi pasangan `(kode,nama)`
SQL menjadi `{id,name}`, kelompokkan berdasarkan jumlah titik dan kode induk,
lalu jalankan tes kelengkapan dan integrasi. Perbarui provenance. Jangan
mengganti kode/nama pada listing tersimpan secara massal atau menebak kode
untuk alamat lama. Pembaruan ini tidak memerlukan perubahan CI/CD.

Field provinsi/kabupaten/kecamatan/desa bersifat opsional pada konfigurasi awal;
bila satu dipilih, seluruh tingkat yang tampil harus dilengkapi. Pengaturan
required/showInForm/visibilitas admin tetap dihormati. Menyembunyikan induk
juga menyembunyikan pilihan turunannya dari formulir bertingkat.
