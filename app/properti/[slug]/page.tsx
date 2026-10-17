import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, ArrowUpRight, ShieldCheck, MessageCircle } from "lucide-react";
import { getFields, getListing, getSettings } from "@/lib/data";
import { displayValue, filled, whatsappLink, siteUrl } from "@/lib/format";
import { Gallery } from "@/components/gallery";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const p = await getListing((await params).slug);
  if (!p)
    return { title: "Properti tidak ditemukan", robots: { index: false } };
  return {
    title: p.title,
    description: p.description.slice(0, 155),
    alternates: { canonical: `/properti/${p.slug}` },
    openGraph: {
      title: p.title,
      description: p.description.slice(0, 155),
      images: p.gallery.slice(0, 1),
    },
  };
}
export default async function PropertyDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const property = await getListing((await params).slug);
  if (!property) notFound();
  const [fields, settings] = await Promise.all([getFields(), getSettings()]);
  const visible = fields.filter(
    (f) => f.showOnDetail && filled(property.values[f.key]),
  );
  const price = visible.find((f) => f.type === "PRICE");
  const location = visible.find((f) => f.key === "lokasi");
  const phone = property.whatsapp || settings.whatsapp;
  const wa = whatsappLink(
    phone,
    `Halo, saya tertarik dengan ${property.title}. ${siteUrl()}/properti/${property.slug}`,
  );
  const schema = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: property.title,
    description: property.description,
    image: property.gallery.map((src) => new URL(src, siteUrl()).href),
    url: `${siteUrl()}/properti/${property.slug}`,
    datePosted: new Date(property.createdAt).toISOString(),
  };
  return (
    <article className="container page-wrap">
      <div className="breadcrumb">
        <Link href="/">Beranda</Link>
        <span>/</span>
        <Link href="/properti">Properti</Link>
        <span>/</span>
        {property.title}
      </div>
      <Gallery images={property.gallery} title={property.title} />
      <div className="detail-layout">
        <div>
          <p className="eyebrow">RUANG UNTUK CERITA BARU</p>
          <h1 className="detail-title">{property.title}</h1>
          {location && (
            <p className="property-location">
              <MapPin size={17} />
              {displayValue(location, property.values[location.key])}
            </p>
          )}
          <section className="detail-section">
            <h2>Tentang properti ini</h2>
            <p className="preserve-lines">{property.description}</p>
          </section>
          {visible.length > 0 && (
            <section className="detail-section">
              <h2>Spesifikasi properti</h2>
              <dl className="specification-grid">
                {visible.map((f) => (
                  <div key={f.key}>
                    <dt>{f.name}</dt>
                    <dd>
                      {displayValue(f, property.values[f.key])}
                      {f.key.startsWith("luas_") ? " m²" : ""}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>
        <aside className="contact-panel">
          {price && (
            <>
              <p>Harga penawaran</p>
              <strong>{displayValue(price, property.values[price.key])}</strong>
            </>
          )}
          <h3>Tertarik dengan properti ini?</h3>
          <p>
            Tanyakan informasi lebih lanjut atau jadwalkan kunjungan melalui
            WhatsApp.
          </p>
          {wa ? (
            <a
              className="button full-width"
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle size={18} />
              Hubungi via WhatsApp
              <ArrowUpRight size={16} />
            </a>
          ) : (
            <p className="notice">
              Properti contoh. Kontak akan tersedia pada listing yang
              diterbitkan.
            </p>
          )}
          {wa && <small className="contact-number">{phone}</small>}
          <div className="contact-assurance">
            <ShieldCheck size={19} />
            <span>
              Pastikan kondisi dan dokumen properti sebelum bertransaksi.
            </span>
          </div>
        </aside>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
        }}
      />
    </article>
  );
}
