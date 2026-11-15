export const areas = [
  {
    slug: "bekasi",
    name: "Bekasi",
    regencyCodes: ["32.16", "32.75"],
    title: "Rumah Dijual & Over Kredit di Kota dan Kabupaten Bekasi",
    description:
      "Cari rumah dijual dan over kredit di Kota dan Kabupaten Bekasi. Periksa harga total, dana pengalihan, lokasi, dan spesifikasi dari iklan yang tersedia.",
    intro:
      "Bandingkan properti di Kota dan Kabupaten Bekasi sesuai kebutuhan tempat tinggal maupun usaha. Kedua wilayah memiliki cakupan administratif berbeda; periksa kecamatan dan alamat pada detail iklan sebelum menjadwalkan survei.",
    guideTitle: "Membandingkan pilihan di Kota dan Kabupaten Bekasi",
    guide:
      "Pastikan alamat objek sesuai tujuan pencarian Anda, terutama untuk nama kawasan yang dipakai dalam pemasaran. Untuk rumah dijual, tanyakan harga total dan biaya yang belum termasuk. Pada over kredit rumah Bekasi, pisahkan dana pengalihan dari angsuran serta sisa tenor; konfirmasikan prosedur kepada bank terkait.",
    checklist:
      "Cocokkan identitas objek dengan dokumen, kondisi bangunan, akses harian, dan kebutuhan keluarga. Verifikasi keterangan pemasang melalui survei; judul iklan saja belum cukup untuk memastikan lokasi atau legalitas.",
  },
  {
    slug: "cikarang",
    name: "Cikarang",
    regencyCodes: ["32.16"],
    district: "cikarang",
    title: "Rumah Dijual, Subsidi & Over Kredit di Cikarang",
    description:
      "Jelajahi iklan properti Cikarang. Bandingkan rumah dijual, informasi rumah subsidi, dan over kredit dengan memeriksa lokasi serta rincian biaya pemasang.",
    intro:
      "Cari properti pada kecamatan Cikarang di Kabupaten Bekasi. Sebagian iklan lama hanya mencantumkan alamat; pastikan kembali kecamatan sebenarnya, karena nama Cikarang juga digunakan dalam pemasaran kawasan sekitarnya.",
    guideTitle: "Memeriksa rumah subsidi dan over kredit di Cikarang",
    guide:
      "Jika mencari rumah subsidi Cikarang, bedakan harga jual total dari booking fee, DP, dan promosi biaya awal. Mintalah rincian unit, status ketersediaan, dan persyaratan KPR dari developer serta bank penyalur. Penyebutan subsidi pada iklan bukan jaminan bahwa unit atau pemohon memenuhi syarat.",
    checklist:
      "Untuk over kredit rumah Cikarang, tanyakan dana pengalihan, sisa pokok, angsuran bulanan, sisa tenor, dan biaya proses. Periksa persetujuan bank serta dokumen melalui pihak berwenang sebelum menyerahkan dana. Sesuaikan lokasi survei dengan kecamatan pada iklan.",
  },
  {
    slug: "karawang",
    name: "Karawang",
    regencyCodes: ["32.15"],
    title: "Rumah Dijual & Pilihan Properti di Karawang",
    description:
      "Temukan iklan rumah dan properti Karawang. Periksa alamat kecamatan, harga total, persyaratan rumah subsidi, serta dokumen sebelum membeli.",
    intro:
      "Jelajahi properti di Kabupaten Karawang, termasuk pilihan di kecamatan yang berbeda. Gunakan alamat dan informasi objek untuk mempersempit pencarian; properti di Cikampek juga merupakan bagian dari cakupan Kabupaten Karawang.",
    guideTitle: "Menilai rumah dijual dan penawaran subsidi di Karawang",
    guide:
      "Saat mencari rumah dijual Karawang, tentukan dahulu kecamatan dan kebutuhan perjalanan Anda. Jika iklan menawarkan rumah subsidi Karawang, minta rincian harga, biaya awal, persyaratan pemohon, dan bank penyalur. Informasi subsidi perlu diperiksa pada sumber resmi yang berlaku, bukan disimpulkan dari harga promosi.",
    checklist:
      "Cocokkan luas dan batas objek, status dokumen, kondisi bangunan, serta biaya transaksi yang menjadi tanggungan pembeli. Tanyakan akses ke objek dan jadwalkan survei. Klaim bebas banjir, keuntungan investasi, atau kelayakan KPR perlu bukti tersendiri.",
  },
  {
    slug: "cikampek",
    name: "Cikampek",
    regencyCodes: ["32.15"],
    district: "cikampek",
    title: "Rumah Dijual & Properti di Cikampek",
    description:
      "Lihat properti Cikampek dan panduan membeli rumah. Cocokkan alamat, kondisi bangunan, harga penawaran, serta status dokumen sebelum survei.",
    intro:
      "Bandingkan iklan properti yang mencantumkan lokasi Cikampek. Cikampek berada di Kabupaten Karawang; untuk iklan lama dengan alamat bebas, konfirmasikan kecamatan objek karena nama kawasan pemasaran dapat melampaui batas administratif.",
    guideTitle: "Daftar pemeriksaan sebelum membeli rumah di Cikampek",
    guide:
      "Mulai dari alamat lengkap dan kondisi objek. Saat membandingkan rumah dijual Cikampek, tanyakan apakah harga merupakan harga penuh, dana pengalihan, atau biaya awal. Untuk penawaran lelang, periksa informasi penyelenggara resmi, syarat peserta, kondisi penguasaan objek, dan biaya terkait sebelum mengambil keputusan.",
    checklist:
      "Pada survei, cocokkan luas, batas tanah, akses masuk, serta kondisi bangunan dengan informasi iklan. Periksa legalitas melalui pihak berwenang dan pastikan rincian pembayaran tertulis. Jangan menganggap iklan yang masih tampil sebagai jaminan objek belum terjual.",
  },
] as const;
export type Area = (typeof areas)[number];
export function findArea(slug: string) {
  return areas.find((area) => area.slug === slug);
}
export function areaPath(area: Area) {
  return `/wilayah/${area.slug}`;
}
