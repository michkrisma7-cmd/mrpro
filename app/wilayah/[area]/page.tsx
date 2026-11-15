import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findArea, areaPath } from "@/lib/areas";
import { getAreaCatalog } from "@/lib/area-data";
import { getFields } from "@/lib/data";
import { pageMetadata, breadcrumbs, jsonLd } from "@/lib/seo";
import { siteUrl } from "@/lib/format";
import { ListingGrid } from "@/components/listing-grid";
import { AreaLinks } from "@/components/area-links";
export const dynamic = "force-dynamic";
type Props = {
  params: Promise<{ area: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
function pageNumber(raw: string | string[] | undefined) {
  return Math.max(
    1,
    Math.min(
      100000,
      Number.parseInt(typeof raw === "string" ? raw : "1", 10) || 1,
    ),
  );
}
export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const area = findArea((await params).area);
  if (!area) notFound();
  const page = pageNumber((await searchParams).page);
  const catalog = await getAreaCatalog(area.slug, page);
  return pageMetadata({
    title: `${area.title}${page > 1 ? ` — Halaman ${page}` : ""}`,
    description: area.description,
    path: `${areaPath(area)}${page > 1 ? `?page=${page}` : ""}`,
    noindex: !catalog.listings.length,
  });
}
export default async function AreaPage({ params, searchParams }: Props) {
  const area = findArea((await params).area);
  if (!area) notFound();
  const page = pageNumber((await searchParams).page);
  const [catalog, fields] = await Promise.all([
    getAreaCatalog(area.slug, page),
    getFields(),
  ]);
  const path = areaPath(area);
  const trail = [
    { name: "Beranda", path: "/" },
    { name: "Wilayah", path: "/wilayah" },
    { name: area.name, path },
  ];
  return (
    <article className="container page-wrap">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Beranda</Link>
        <span>/</span>
        <Link href="/wilayah">Wilayah</Link>
        <span>/</span>
        <span aria-current="page">{area.name}</span>
      </nav>
      <header className="page-heading">
        <h1>{area.title}</h1>
        <p>{area.intro}</p>
      </header>
      <AreaLinks />
      <section aria-labelledby="area-guide">
        <h2 id="area-guide">{area.guideTitle}</h2>
        <p>{area.guide}</p>
        <p>{area.checklist}</p>
      </section>
      <section aria-labelledby="area-listings">
        <h2 id="area-listings">Iklan properti {area.name}</h2>
        <p>
          {catalog.total} iklan tersedia. Daftar mengikuti lokasi administratif
          yang dicantumkan pemasang, atau alamat pada iklan lama. Konfirmasikan
          lokasi dan ketersediaan kepada pemasang.
        </p>
        {!catalog.total && (
          <p>
            Belum ada iklan yang sesuai saat ini. Gunakan panduan di atas untuk
            menyiapkan survei, atau jelajahi katalog nasional dan wilayah lain.
          </p>
        )}
        <ListingGrid listings={catalog.listings} fields={fields} />
        {catalog.total > 18 && (
          <nav className="pagination" aria-label="Halaman properti wilayah">
            {page > 1 && (
              <Link href={page === 2 ? path : `${path}?page=${page - 1}`}>
                Sebelumnya
              </Link>
            )}
            <span>
              Halaman {page} dari {Math.ceil(catalog.total / 18)}
            </span>
            {page * 18 < catalog.total && (
              <Link href={`${path}?page=${page + 1}`}>Berikutnya</Link>
            )}
          </nav>
        )}
      </section>
      <p>
        Platform pemasangan iklan tetap menerima properti dari seluruh
        Indonesia. <Link href="/titip-properti">Pasang iklan properti</Link>{" "}
        atau <Link href="/properti">lihat katalog nasional</Link>.
      </p>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd([
            breadcrumbs(trail),
            {
              "@context": "https://schema.org",
              "@type": "CollectionPage",
              name: area.title,
              url: `${siteUrl()}${path}`,
              description: area.description,
            },
            ...(catalog.listings.length
              ? [
                  {
                    "@context": "https://schema.org",
                    "@type": "ItemList",
                    itemListElement: catalog.listings.map((p, i) => ({
                      "@type": "ListItem",
                      position: (page - 1) * 18 + i + 1,
                      name: p.title,
                      url: `${siteUrl()}/properti/${p.slug}`,
                    })),
                  },
                ]
              : []),
          ]),
        }}
      />
    </article>
  );
}
