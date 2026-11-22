import Link from "next/link";
import {
  areaCategories,
  areaPath,
  areaTrail,
  findArea,
  MIN_INDEXABLE_LISTINGS,
  type Area,
  type AreaCategory,
} from "@/lib/areas";
import { getAreaCatalog, getAreaCounts, getAreaStats } from "@/lib/area-data";
import { getFields } from "@/lib/data";
import { landingFaq, landingHeading, statsSentence } from "@/lib/area-content";
import { breadcrumbs, jsonLd } from "@/lib/seo";
import { siteUrl } from "@/lib/format";
import { ListingGrid } from "@/components/listing-grid";
import { AreaLinks } from "@/components/area-links";

export function landingPath(area: Area, category?: AreaCategory) {
  return category ? `${areaPath(area)}/${category.slug}` : areaPath(area);
}

export async function AreaLanding({
  area,
  category,
  page,
}: {
  area: Area;
  category?: AreaCategory;
  page: number;
}) {
  const [catalog, fields, stats, counts] = await Promise.all([
    getAreaCatalog(area.slug, page, category?.slug ?? ""),
    getFields(),
    getAreaStats(area.slug, category?.slug ?? ""),
    getAreaCounts(),
  ]);
  const path = landingPath(area, category);
  const heading = landingHeading(area, category);
  const faq = landingFaq(area, catalog.total, stats, category);
  const areaCount = counts.find((c) => c.area.slug === area.slug);
  const countOf = (slug: string, cat?: AreaCategory) => {
    const c = counts.find((x) => x.area.slug === slug);
    if (!c) return 0;
    return cat
      ? (c.categories.find((x) => x.category.slug === cat.slug)?.total ?? 0)
      : c.total;
  };
  const trail = [
    { name: "Beranda", path: "/" },
    { name: "Wilayah", path: "/wilayah" },
    ...areaTrail(area).map((a) => ({ name: a.name, path: areaPath(a) })),
    ...(category ? [{ name: category.label, path }] : []),
  ];
  const neighbors = area.neighbors
    .map((slug) => findArea(slug))
    .filter((a): a is Area => Boolean(a));
  const children = counts
    .filter((c) => c.area.parent === area.slug && c.total > 0)
    .map((c) => c.area);
  return (
    <article className="container page-wrap">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        {trail.map((item, i) =>
          i < trail.length - 1 ? (
            <span key={item.path}>
              <Link href={item.path}>{item.name}</Link> <span>/</span>{" "}
            </span>
          ) : (
            <span key={item.path} aria-current="page">
              {item.name}
            </span>
          ),
        )}
      </nav>
      <header className="page-heading">
        <h1>{heading}</h1>
        <p>{area.intro}</p>
        <p>{statsSentence(area, catalog.total, stats, category)}</p>
      </header>
      <nav
        aria-label={`Kategori properti ${area.name}`}
        className="catalog-tabs"
      >
        <Link href={areaPath(area)} className={category ? "" : "active"}>
          Semua ({areaCount?.total ?? 0})
        </Link>
        {areaCategories
          .map((c) => ({ c, total: countOf(area.slug, c) }))
          .filter(({ c, total }) => total > 0 || c.slug === category?.slug)
          .map(({ c, total }) => (
            <Link
              key={c.slug}
              href={landingPath(area, c)}
              className={c.slug === category?.slug ? "active" : ""}
            >
              {c.label} ({total})
            </Link>
          ))}
      </nav>
      <section aria-labelledby="area-listings">
        <h2 id="area-listings">
          {category
            ? `Daftar ${category.label.toLowerCase()} di ${area.name}`
            : `Iklan properti ${area.name}`}
        </h2>
        {!catalog.total && (
          <p>
            Belum ada iklan yang sesuai saat ini. Lihat wilayah sekitar di bawah
            atau <Link href="/properti">jelajahi katalog lengkap</Link>.
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
              <Link href={`${path}?page=${page + 1}`}>Listing Selanjutnya</Link>
            )}
          </nav>
        )}
      </section>
      {!category && (
        <section aria-labelledby="area-guide">
          <h2 id="area-guide">{area.guideTitle}</h2>
          <p>{area.guide}</p>
          <p>{area.checklist}</p>
        </section>
      )}
      {(children.length > 0 || neighbors.length > 0) && (
        <section aria-labelledby="area-nearby">
          <h2 id="area-nearby">
            {category
              ? `${category.label} di wilayah sekitar ${area.name}`
              : `Properti di sekitar ${area.name}`}
          </h2>
          <nav className="catalog-tabs" aria-label="Wilayah sekitar">
            {[
              ...children,
              ...neighbors.filter((n) => !children.includes(n)),
            ].map((n) => (
              <Link key={n.slug} href={landingPath(n, category)}>
                {category
                  ? `${category.label} ${n.name}`
                  : `Rumah di ${n.name}`}{" "}
                ({countOf(n.slug, category)})
              </Link>
            ))}
          </nav>
        </section>
      )}
      {faq.length > 0 && (
        <section className="faq-section" aria-labelledby="area-faq">
          <div>
            <h2 id="area-faq">Pertanyaan seputar {heading.toLowerCase()}</h2>
          </div>
          <div>
            {faq.map(({ q, a }) => (
              <details key={q}>
                <summary>
                  {q}
                  <span>+</span>
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
      )}
      <AreaLinks />
      <p>
        MR Properti juga menerima iklan dari seluruh Indonesia.{" "}
        <Link href="/titip-properti">Pasang iklan properti</Link> atau{" "}
        <Link href="/properti">lihat semua properti</Link>.
      </p>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd([
            breadcrumbs(trail),
            {
              "@context": "https://schema.org",
              "@type": "CollectionPage",
              name: heading,
              url: `${siteUrl()}${path}`,
              inLanguage: "id-ID",
            },
            ...(catalog.listings.length
              ? [
                  {
                    "@context": "https://schema.org",
                    "@type": "ItemList",
                    numberOfItems: catalog.total,
                    itemListElement: catalog.listings.map((p, i) => ({
                      "@type": "ListItem",
                      position: (page - 1) * 18 + i + 1,
                      name: p.title,
                      url: `${siteUrl()}/properti/${p.slug}`,
                    })),
                  },
                ]
              : []),
            ...(faq.length
              ? [
                  {
                    "@context": "https://schema.org",
                    "@type": "FAQPage",
                    mainEntity: faq.map(({ q, a }) => ({
                      "@type": "Question",
                      name: q,
                      acceptedAnswer: { "@type": "Answer", text: a },
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

export function indexable(total: number) {
  return total >= MIN_INDEXABLE_LISTINGS;
}
