// Teks dinamis halaman landing wilayah: paragraf data & FAQ dari angka listing aktif.
import type { Area, AreaCategory } from "./areas";
import type { AreaStats } from "./area-data";

export function shortMoney(value: number) {
  if (value >= 1e9)
    return `Rp ${(value / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 2 })} miliar`;
  if (value >= 1e6)
    return `Rp ${Math.round(value / 1e6).toLocaleString("id-ID")} juta`;
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

export function landingHeading(area: Area, category?: AreaCategory) {
  return category ? `${category.label} di ${area.name}` : area.title;
}

export function landingTitle(area: Area, category?: AreaCategory) {
  return category
    ? `${category.label} di ${area.name} – Harga Terbaru`
    : area.title;
}

export function landingDescription(
  area: Area,
  total: number,
  stats: AreaStats,
  category?: AreaCategory,
) {
  if (!category) return area.description;
  const range =
    stats.min && stats.priced >= 2 ? ` mulai ${shortMoney(stats.min)}` : "";
  return `${total} iklan ${category.label.toLowerCase()} di ${area.name}${range}. Bandingkan harga, KT/KM, luas tanah & bangunan, lihat foto, dan hubungi pemilik langsung di MR Properti.`;
}

/** Kalimat ringkasan data, berbeda di tiap halaman karena angkanya dari listing aktif. */
export function statsSentence(
  area: Area,
  total: number,
  stats: AreaStats,
  category?: AreaCategory,
) {
  const what = category
    ? `${category.intro} di ${area.name}`
    : `properti dijual, disewakan, dan over kredit di ${area.name}`;
  if (!total)
    return `Belum ada iklan ${category ? category.label.toLowerCase() : "properti"} aktif di ${area.name} saat ini. Simpan halaman ini atau lihat wilayah sekitar di bawah.`;
  const price =
    stats.min && stats.max && stats.priced >= 2
      ? ` Harga yang dicantumkan berkisar ${shortMoney(stats.min)} hingga ${shortMoney(stats.max)}${stats.median ? `, dengan harga tengah sekitar ${shortMoney(stats.median)}` : ""}.`
      : "";
  return `Saat ini MR Properti menampilkan ${total} iklan aktif untuk ${what}.${price} Listing yang baru tayang selalu ditampilkan paling atas.`;
}

export type Faq = { q: string; a: string };

export function landingFaq(
  area: Area,
  total: number,
  stats: AreaStats,
  category?: AreaCategory,
): Faq[] {
  const label = category ? category.label.toLowerCase() : "rumah";
  const faq: Faq[] = [];
  if (stats.min && stats.max && stats.priced >= 2)
    faq.push({
      q: `Berapa harga ${label} di ${area.name}?`,
      a: `Berdasarkan ${stats.priced} iklan aktif di MR Properti, harga ${label} di ${area.name} mulai ${shortMoney(stats.min)} hingga ${shortMoney(stats.max)}${stats.median ? ` (harga tengah sekitar ${shortMoney(stats.median)})` : ""}. Harga bisa berubah; konfirmasikan kepada pemasang iklan.`,
    });
  if (category?.slug === "over-kredit")
    faq.push({
      q: `Apakah over kredit rumah di ${area.name} aman?`,
      a: "Over kredit aman bila pengalihan dilakukan resmi melalui bank (take over KPR atau alih debitur) di hadapan notaris, bukan di bawah tangan. Minta bukti sisa pokok, angsuran terakhir, dan sisa tenor dari bank sebelum membayar dana pengalihan.",
    });
  else if (category?.slug === "rumah-disewa")
    faq.push({
      q: `Apa yang perlu dicek sebelum menyewa rumah di ${area.name}?`,
      a: "Tanyakan harga sewa per bulan atau per tahun, uang jaminan, biaya listrik/air/IPL, kondisi bangunan, serta isi perjanjian sewa. Simpan bukti pembayaran dan foto kondisi rumah saat serah terima.",
    });
  else
    faq.push({
      q: `Dokumen apa yang perlu dicek sebelum membeli ${label} di ${area.name}?`,
      a: "Periksa sertifikat (SHM atau HGB) dan kecocokannya dengan objek, IMB/PBG, bukti lunas PBB, serta identitas penjual. Untuk transaksi jual beli, gunakan PPAT/notaris dan jangan membayar lunas sebelum dokumen diperiksa.",
    });
  faq.push({
    q: `Bagaimana cara survei ${label} di ${area.name}?`,
    a: "Buka detail iklan lalu klik tombol WhatsApp untuk menghubungi pemasang. Anda juga bisa minta dibantu admin MR Properti di WhatsApp 0881-1063-079 untuk menjadwalkan survei.",
  });
  faq.push({
    q: `Bisakah saya memasang iklan properti di ${area.name}?`,
    a: "Bisa. Buka halaman Pasang Iklan, isi data properti dan foto, lalu iklan tayang di katalog MR Properti dan halaman wilayahnya.",
  });
  if (total === 0) return faq.slice(-2);
  return faq;
}
