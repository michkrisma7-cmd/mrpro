import Link from "next/link";
import { MapPin, ArrowUpRight } from "lucide-react";
import { areaPath, areaCategories } from "@/lib/areas";
import { getAreaCounts } from "@/lib/area-data";
import { breadcrumbs, jsonLd, pageMetadata } from "@/lib/seo";
import { siteUrl } from "@/lib/format";
export const dynamic = "force-dynamic";
const title = "Rumah Dijual & Over Kredit per Wilayah dan Kecamatan";
const description =
  "Cari rumah dijual, over kredit, sewa, ruko, dan tanah per wilayah: Bekasi, Cikarang, Karawang, Cikampek, serta kecamatan Tambun, Cibitung, Setu, Babelan, dan lainnya.";
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
  const all = await getAreaCounts();
  const counts = all.filter(
    ({ area }) =>
      !area.parent || area.slug === "cikarang" || area.slug === "cikampek",
  );
  const districts = all.filter(
    ({ area }) =>
      area.parent && area.slug !== "cikarang" && area.slug !== "cikampek",
  );
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
          {counts.map(({ area, total, categories }) => (
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
              <p>
                {categories
                  .filter((c) => c.total > 0)
                  .map((c, i) => (
                    <span key={c.category.slug}>
                      {i > 0 && " · "}
                      <Link href={`${areaPath(area)}/${c.category.slug}`}>
                        {c.category.label} ({c.total})
                      </Link>
                    </span>
                  ))}
              </p>
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
      <section aria-labelledby="area-districts">
        <h2 id="area-districts">Rumah dijual per kecamatan</h2>
        <nav className="catalog-tabs" aria-label="Kecamatan">
          {districts.map(({ area, total }) => (
            <Link key={area.slug} href={areaPath(area)}>
              Rumah di {area.name} ({total})
            </Link>
          ))}
        </nav>
        <p>
          Cari juga per kategori:{" "}
          {areaCategories.map((c, i) => (
            <span key={c.slug}>
              {i > 0 && " · "}
              <Link href={`/wilayah/cikarang/${c.slug}`}>
                {c.label} Cikarang
              </Link>
            </span>
          ))}
          .
        </p>
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
              itemListElement: all.map(({ area }, i) => ({
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
