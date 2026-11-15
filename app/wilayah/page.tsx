import Link from "next/link";
import { MapPin, ArrowUpRight } from "lucide-react";
import { areaPath } from "@/lib/areas";
import { getAreaCounts } from "@/lib/area-data";
import { breadcrumbs, jsonLd, pageMetadata } from "@/lib/seo";
import { siteUrl } from "@/lib/format";
export const dynamic = "force-dynamic";
const title = "Jelajahi Properti Berdasarkan Wilayah";
const description =
  "Temukan rumah, tanah, ruko, dan pilihan properti lainnya di Bekasi, Cikarang, Karawang, dan Cikampek.";
const summaries: Record<string, string> = {
  bekasi:
    "Pilihan properti di Kota dan Kabupaten Bekasi. Cocokkan kecamatan, alamat, dan kebutuhan hunian atau usaha Anda.",
  cikarang:
    "Jelajahi properti di kecamatan Cikarang, bagian dari Kabupaten Bekasi, dengan panduan rumah subsidi dan over kredit.",
  karawang:
    "Bandingkan properti di Kabupaten Karawang, termasuk Cikampek. Periksa harga total, legalitas, serta lokasi objek sebelum survei.",
  cikampek:
    "Cari properti di Cikampek, bagian dari Kabupaten Karawang, dan gunakan daftar pemeriksaan pembelian rumah sebelum mengambil keputusan.",
};
export const metadata = pageMetadata({ title, description, path: "/wilayah" });
export default async function AreasPage() {
  const counts = await getAreaCounts();
  return (
    <article className="container page-wrap">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Beranda</Link>
        <span>/</span>
        <span aria-current="page">Wilayah</span>
      </nav>
      <header className="page-heading">
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
      <section aria-labelledby="area-choices">
        <h2 id="area-choices">Empat wilayah utama</h2>
        <p>
          Bekasi mencakup Kota dan Kabupaten Bekasi; Cikarang merupakan bagian
          dari Kabupaten Bekasi. Cikampek merupakan bagian dari Kabupaten
          Karawang. Iklan yang sama dapat muncul pada halaman kabupaten dan
          subwilayahnya, sehingga jumlah antarwilayah tidak dijumlahkan sebagai
          total properti unik.
        </p>
        <div className="service-grid">
          {counts.map(({ area, total }) => (
            <article
              className="service-card"
              key={area.slug}
              aria-labelledby={`area-${area.slug}`}
            >
              <div className="service-top">
                <span className="service-icon">
                  <MapPin size={24} aria-hidden="true" />
                </span>
              </div>
              <h3 id={`area-${area.slug}`}>{area.name}</h3>
              <p>{summaries[area.slug]}</p>
              <p>{total} listing aktif</p>
              <Link
                className="button"
                href={areaPath(area)}
                aria-label={`Lihat Properti di ${area.name}`}
              >
                Lihat Properti <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>
      </section>
      <section aria-labelledby="area-search-guide">
        <h2 id="area-search-guide">Pilih wilayah, lalu periksa detail objek</h2>
        <p>
          Jumlah listing mengikuti iklan berstatus tayang dan lokasi yang
          dicantumkan pemasang, dengan pembaruan cache berkala. Alamat pada
          iklan lama perlu dikonfirmasi kembali. Status tayang tidak menjamin
          objek belum terjual; hubungi pemasang sebelum survei.
        </p>
        <p>
          Bandingkan harga total, luas, kondisi bangunan, dan dokumen yang dapat
          dibuktikan. Untuk over kredit, periksa dana pengalihan, angsuran, sisa
          tenor, serta prosedur bank terkait.
        </p>
        <p>
          Jika suatu wilayah belum memiliki listing, subhalamannya tetap
          menyediakan panduan dan pilihan untuk melanjutkan pencarian. Anda juga
          dapat <Link href="/properti">menjelajahi katalog nasional</Link> atau{" "}
          <Link href="/titip-properti">
            memasang iklan dari seluruh Indonesia
          </Link>
          .
        </p>
      </section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd([
            breadcrumbs([
              { name: "Beranda", path: "/" },
              { name: "Wilayah", path: "/wilayah" },
            ]),
            {
              "@context": "https://schema.org",
              "@type": "CollectionPage",
              name: title,
              description,
              url: `${siteUrl()}/wilayah`,
            },
            {
              "@context": "https://schema.org",
              "@type": "ItemList",
              itemListElement: counts.map(({ area }, i) => ({
                "@type": "ListItem",
                position: i + 1,
                name: area.name,
                url: `${siteUrl()}${areaPath(area)}`,
              })),
            },
          ]),
        }}
      />
    </article>
  );
}
