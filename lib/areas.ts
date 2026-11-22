// Wilayah & kecamatan untuk halaman landing /wilayah/<slug> dan /wilayah/<slug>/<kategori>.
// Konten ditulis tangan; angka (jumlah, kisaran harga) diambil dari data listing saat render.
export type Area = {
  slug: string;
  name: string;
  /** Kode BPS kabupaten/kota induk. */
  regencyCodes: readonly string[];
  /** Pola awal nama kecamatan (regex, huruf kecil). Kosong = seluruh kota/kabupaten. */
  district?: string;
  /** Slug wilayah induk untuk breadcrumb. */
  parent?: string;
  title: string;
  description: string;
  intro: string;
  guideTitle: string;
  guide: string;
  checklist: string;
  /** Wilayah tetangga untuk link internal. */
  neighbors: readonly string[];
};

function kecamatan(a: {
  slug: string;
  name: string;
  parent: "bekasi" | "karawang" | "cikarang";
  district: string;
  about: string;
  tips: string;
  neighbors: string[];
}): Area {
  const karawang = a.parent === "karawang";
  const kab = karawang ? "Kabupaten Karawang" : "Kabupaten Bekasi";
  return {
    slug: a.slug,
    name: a.name,
    regencyCodes: karawang ? ["32.15"] : ["32.16"],
    district: a.district,
    parent: a.parent,
    title: `Rumah Dijual & Over Kredit di ${a.name}`,
    description: `Cari rumah dijual, over kredit, dan sewa di ${a.name}, ${kab}. Bandingkan harga, luas tanah, dan lokasi dari iklan pemilik & agen di MR Properti.`,
    intro: a.about,
    guideTitle: `Tips memilih rumah di ${a.name}`,
    guide: a.tips,
    checklist: `Sebelum survei di ${a.name}, cocokkan alamat dan kecamatan pada iklan dengan lokasi sebenarnya, minta rincian harga total atau dana over kredit secara tertulis, dan periksa sertifikat (SHM/HGB), IMB/PBG, serta tagihan PBB. Untuk over kredit, pastikan proses pengalihan dilakukan resmi melalui bank.`,
    neighbors: a.neighbors,
  };
}

export const areas: readonly Area[] = [
  {
    slug: "bekasi",
    neighbors: ["cikarang", "tambun", "cibitung", "babelan", "setu"],
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
    parent: "bekasi",
    neighbors: [
      "cikarang-utara",
      "cikarang-selatan",
      "cikarang-barat",
      "cikarang-timur",
      "cikarang-pusat",
      "cibitung",
    ],
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
    neighbors: ["cikampek", "klari", "telukjambe", "cikarang"],
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
    parent: "karawang",
    neighbors: ["klari", "karawang", "telukjambe"],
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
  kecamatan({
    slug: "cikarang-utara",
    name: "Cikarang Utara",
    parent: "cikarang",
    district: "cikarang utara",
    about:
      "Cikarang Utara adalah salah satu kecamatan tersibuk di Kabupaten Bekasi. Stasiun Cikarang (ujung timur KRL Commuter Line) dan kawasan industri Jababeka berada di sekitarnya, sehingga rumah di sini banyak dicari pekerja pabrik dan komuter ke Jakarta. Pilihan propertinya beragam: rumah kampung, perumahan subsidi, rumah second di kompleks lama, hingga rumah over kredit dengan dana pengalihan terjangkau.",
    tips: "Bandingkan jarak ke stasiun, gerbang tol, dan tempat kerja. Rumah di perumahan lama Cikarang Utara biasanya sudah ramai penghuni dan fasilitasnya lengkap, sedangkan perumahan baru lebih murah tetapi aksesnya perlu dicek langsung, terutama saat jam berangkat kerja dan musim hujan.",
    neighbors: [
      "cikarang-selatan",
      "cikarang-timur",
      "cikarang-barat",
      "cikarang",
      "cibitung",
    ],
  }),
  kecamatan({
    slug: "cikarang-selatan",
    name: "Cikarang Selatan",
    parent: "cikarang",
    district: "cikarang selatan",
    about:
      "Cikarang Selatan dikenal dengan kota mandiri Lippo Cikarang dan kawasan industri di sekitarnya. Perumahan yang tertata, pusat belanja, sekolah, dan rumah sakit membuat kecamatan ini populer untuk keluarga muda dan karyawan. Selain rumah dijual di perumahan besar, ada juga rumah over kredit dan rumah sewa yang cocok untuk pekerja kawasan industri.",
    tips: "Di perumahan besar seperti Lippo Cikarang, cek iuran pengelolaan lingkungan (IPL) bulanan, status sertifikat (sering HGB), dan aturan renovasi dari pengelola. Untuk rumah di luar kawasan, perhatikan akses jalan dan kepadatan lalu lintas truk industri.",
    neighbors: [
      "cikarang-utara",
      "cikarang-pusat",
      "cikarang-barat",
      "setu",
      "cikarang",
    ],
  }),
  kecamatan({
    slug: "cikarang-barat",
    name: "Cikarang Barat",
    parent: "cikarang",
    district: "cikarang barat",
    about:
      "Cikarang Barat berada di sisi barat Cikarang, dekat gerbang tol Cikarang Barat dan kawasan industri MM2100. Lokasinya yang dekat dengan Cibitung dan Tambun membuat kecamatan ini strategis bagi pekerja yang bolak-balik ke Bekasi atau Jakarta. Banyak perumahan subsidi dan menengah, sehingga pilihan rumah murah dan over kredit cukup banyak.",
    tips: "Hitung waktu tempuh ke gerbang tol dan stasiun terdekat pada jam sibuk. Untuk rumah subsidi atau over kredit, tanyakan sisa tenor, besar angsuran, dan apakah pengalihan bisa dilakukan resmi di bank penyalur KPR.",
    neighbors: [
      "cibitung",
      "cikarang-utara",
      "cikarang-selatan",
      "setu",
      "cikarang",
    ],
  }),
  kecamatan({
    slug: "cikarang-timur",
    name: "Cikarang Timur",
    parent: "cikarang",
    district: "cikarang timur",
    about:
      "Cikarang Timur terletak di sisi timur Cikarang, berbatasan dengan Cikarang Utara dan Cikarang Pusat serta tidak jauh dari perbatasan Karawang. Harga tanah dan rumah di sini umumnya lebih terjangkau dibanding Cikarang Utara atau Selatan, sehingga cocok untuk pembeli rumah pertama yang mencari rumah murah di Cikarang dengan luas tanah lebih lega.",
    tips: "Karena masih berkembang, cek kondisi jalan lingkungan, saluran air, dan risiko genangan saat hujan. Bandingkan juga jarak ke pusat kegiatan di Cikarang Utara dan kawasan industri tempat Anda bekerja.",
    neighbors: ["cikarang-utara", "cikarang-pusat", "karawang", "cikarang"],
  }),
  kecamatan({
    slug: "cikarang-pusat",
    name: "Cikarang Pusat",
    parent: "cikarang",
    district: "cikarang pusat",
    about:
      "Cikarang Pusat adalah pusat pemerintahan Kabupaten Bekasi dan lokasi kota mandiri Deltamas. Kawasannya relatif baru dan tertata, dengan perumahan, kawasan industri, dan area komersial yang terus berkembang. Rumah di Cikarang Pusat cocok bagi yang mencari lingkungan lebih lega dan tenang namun tetap dekat dengan pusat kerja di Cikarang.",
    tips: "Untuk perumahan di kawasan terpadu seperti Deltamas, cek IPL, status sertifikat, dan rencana pembangunan di sekitarnya. Pastikan juga akses ke gerbang tol dan transportasi umum sesuai kebutuhan harian Anda.",
    neighbors: [
      "cikarang-selatan",
      "cikarang-timur",
      "cikarang-utara",
      "cikarang",
    ],
  }),
  kecamatan({
    slug: "tambun",
    name: "Tambun",
    parent: "bekasi",
    district: "tambun",
    about:
      "Tambun (Tambun Selatan dan Tambun Utara) berbatasan langsung dengan Kota Bekasi, sehingga menjadi pilihan favorit keluarga yang bekerja di Bekasi maupun Jakarta. Stasiun Tambun dilalui KRL Commuter Line, dan banyak perumahan lama maupun baru tersebar di kecamatan ini. Rumah second, rumah over kredit, dan kontrakan di Tambun termasuk yang paling banyak dicari di Kabupaten Bekasi.",
    tips: "Bedakan Tambun Selatan (lebih padat, dekat stasiun dan jalan raya) dan Tambun Utara (lebih lega, harga umumnya lebih rendah). Periksa akses ke stasiun, kemacetan di Jalan Sultan Hasanudin, dan riwayat banjir di lingkungan perumahan.",
    neighbors: ["cibitung", "babelan", "setu", "bekasi"],
  }),
  kecamatan({
    slug: "cibitung",
    name: "Cibitung",
    parent: "bekasi",
    district: "cibitung",
    about:
      "Cibitung berada di antara Tambun dan Cikarang, dilalui KRL Commuter Line (Stasiun Cibitung) dan dekat dengan gerbang tol. Banyak perumahan menengah dan subsidi di Cibitung, seperti kawasan Gramapuri dan Metland Cibitung, sehingga pilihan rumah dijual dan over kredit cukup beragam untuk pekerja kawasan industri maupun komuter.",
    tips: "Bandingkan harga per meter persegi antarperumahan dan cek jarak ke stasiun. Untuk rumah over kredit, minta bukti angsuran terakhir dan sisa pokok dari bank, lalu lakukan pengalihan secara resmi.",
    neighbors: [
      "tambun",
      "cikarang-barat",
      "cikarang-utara",
      "babelan",
      "bekasi",
    ],
  }),
  kecamatan({
    slug: "setu",
    name: "Setu",
    parent: "bekasi",
    district: "setu",
    about:
      "Setu adalah kecamatan di bagian selatan Kabupaten Bekasi yang suasananya masih lebih hijau dan tenang. Harga rumah dan tanah di Setu umumnya lebih terjangkau dibanding Tambun atau Cikarang, cocok untuk keluarga yang mencari rumah dengan luas tanah lebih besar. Catatan: Setu Bekasi berbeda dengan Setu di Tangerang Selatan atau Setu Babakan di Jakarta.",
    tips: "Pastikan iklan benar-benar berada di Kecamatan Setu, Kabupaten Bekasi. Cek akses jalan menuju jalan raya, ketersediaan angkutan umum, serta jarak ke sekolah dan fasilitas kesehatan terdekat.",
    neighbors: ["cikarang-selatan", "cikarang-barat", "tambun", "bekasi"],
  }),
  kecamatan({
    slug: "babelan",
    name: "Babelan",
    parent: "bekasi",
    district: "babelan",
    about:
      "Babelan terletak di bagian utara Kabupaten Bekasi dan berbatasan dengan Kota Bekasi bagian utara. Kecamatan ini banyak dipilih keluarga muda karena harga rumah yang relatif terjangkau, termasuk rumah subsidi, rumah kampung, dan rumah over kredit dengan dana pengalihan kecil.",
    tips: "Cek akses jalan ke Kota Bekasi dan Tambun pada jam sibuk serta riwayat genangan di lingkungan perumahan. Untuk rumah subsidi, pastikan persyaratan pengalihan dari bank penyalur dan status sertifikat.",
    neighbors: ["tambun", "cibitung", "bekasi"],
  }),
  kecamatan({
    slug: "klari",
    name: "Klari",
    parent: "karawang",
    district: "klari",
    about:
      "Klari berada di Kabupaten Karawang, di jalur antara pusat kota Karawang dan Cikampek. Kedekatannya dengan kawasan industri Karawang membuat rumah di Klari banyak dicari karyawan pabrik. Pilihan yang tersedia meliputi rumah subsidi, rumah dijual di perumahan menengah, serta rumah over kredit.",
    tips: "Hitung jarak ke kawasan industri tempat Anda bekerja dan ke gerbang tol terdekat. Untuk rumah subsidi Karawang, cek syarat penghuni dan aturan pengalihan dari bank penyalur sebelum memberi uang muka.",
    neighbors: ["karawang", "cikampek", "telukjambe"],
  }),
  kecamatan({
    slug: "telukjambe",
    name: "Telukjambe",
    parent: "karawang",
    district: "teluk ?jambe",
    about:
      "Telukjambe (Telukjambe Timur dan Telukjambe Barat) berada di sisi barat pusat kota Karawang dan dekat dengan kawasan industri besar seperti KIIC. Banyak perumahan menengah hingga atas di sini, sehingga Telukjambe menjadi salah satu lokasi favorit untuk rumah dijual dan rumah sewa bagi karyawan di Karawang.",
    tips: "Bandingkan perumahan di Telukjambe Timur yang dekat pusat kota dengan Telukjambe Barat yang dekat kawasan industri. Cek IPL, status sertifikat, dan akses ke gerbang tol Karawang Barat.",
    neighbors: ["karawang", "klari", "cikampek", "cikarang"],
  }),
];

export function findArea(slug: string) {
  return areas.find((area) => area.slug === slug);
}
export function areaPath(area: Area) {
  return `/wilayah/${area.slug}`;
}
/** Wilayah utama (kota/kabupaten & Cikarang/Cikampek) untuk navigasi ringkas. */
export const mainAreas = areas.filter(
  (area) =>
    !area.parent || area.slug === "cikarang" || area.slug === "cikampek",
);
export const districtAreas = areas.filter(
  (area) => area.parent && area.slug !== "cikarang" && area.slug !== "cikampek",
);
export function districtMatches(area: Area, district: string) {
  return Boolean(
    area.district && new RegExp(`^(${area.district})( |$)`).test(district),
  );
}
/** Rantai breadcrumb dari wilayah teratas sampai wilayah ini. */
export function areaTrail(area: Area): Area[] {
  const chain = [area];
  let parent = area.parent && findArea(area.parent);
  while (parent && chain.length < 4) {
    chain.unshift(parent);
    parent = parent.parent ? findArea(parent.parent) : undefined;
  }
  return chain;
}
// Wilayah paling spesifik untuk breadcrumb: kecamatan terpanjang yang cocok, lalu kota/kabupaten.
export function listingArea(values: Record<string, unknown>): Area | undefined {
  const text = (key: string) =>
    typeof values[key] === "string" ? values[key].trim().toLowerCase() : "";
  const district = text("kecamatan");
  const code = text("kota_kabupaten_kode");
  const city = text("kota_kabupaten");
  const byDistrict = areas
    .filter((area) => district && districtMatches(area, district))
    .sort((a, b) => b.district!.length - a.district!.length)[0];
  if (byDistrict) return byDistrict;
  if (code)
    return areas.find(
      (area) => !area.district && area.regencyCodes.includes(code),
    );
  if (/(^|\s)bekasi$/.test(city)) return findArea("bekasi");
  if (/(^|\s)karawang$/.test(city)) return findArea("karawang");
  return undefined;
}

// Kategori landing: kombinasi jenis + transaksi yang dicari orang.
export type AreaCategory = {
  slug: string;
  label: string;
  jenis?: string;
  transaksi: string;
  /** Kata kunci utama, dipakai di judul: "<label> di <wilayah>". */
  intro: string;
};
export const areaCategories: readonly AreaCategory[] = [
  {
    slug: "rumah-dijual",
    label: "Rumah Dijual",
    jenis: "Rumah",
    transaksi: "Dijual",
    intro:
      "rumah dijual dari pemilik dan agen, mulai rumah subsidi, rumah second, hingga rumah di perumahan menengah",
  },
  {
    slug: "over-kredit",
    label: "Over Kredit Rumah",
    transaksi: "Over Kredit",
    intro:
      "rumah over kredit (take over KPR / oper kredit) dengan rincian dana pengalihan, angsuran, dan sisa tenor",
  },
  {
    slug: "rumah-disewa",
    label: "Rumah Disewakan",
    jenis: "Rumah",
    transaksi: "Disewa",
    intro: "rumah disewakan dan kontrakan bulanan maupun tahunan",
  },
  {
    slug: "ruko-dijual",
    label: "Ruko Dijual",
    jenis: "Ruko",
    transaksi: "Dijual",
    intro: "ruko dijual untuk usaha dan investasi",
  },
  {
    slug: "tanah-dijual",
    label: "Tanah Dijual",
    jenis: "Tanah",
    transaksi: "Dijual",
    intro: "tanah dan kavling dijual",
  },
];
export function findCategory(slug: string) {
  return areaCategories.find((category) => category.slug === slug);
}
/** Halaman tipis tidak diindeks: minimal 3 listing aktif. */
export const MIN_INDEXABLE_LISTINGS = 3;
