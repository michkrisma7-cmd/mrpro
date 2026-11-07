import { propertyLocation } from "@/lib/property-location";
import { isRegionKey } from "@/lib/region-config";
import type { Metadata } from "next";
import { pageMetadata, breadcrumbs, jsonLd } from "@/lib/seo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, ArrowUpRight, ShieldCheck, MessageCircle } from "lucide-react";
import { getFields, getListing } from "@/lib/data";
import { displayValue, filled, siteUrl } from "@/lib/format";
import {
  listingContactNumber,
  listingWhatsappLink,
} from "@/lib/listing-contact";
import { Gallery } from "@/components/gallery";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const p = await getListing((await params).slug);
  if (!p)
    return { title: "Properti tidak ditemukan", robots: { index: false } };
  const location = typeof p.values.lokasi === "string" ? p.values.lokasi : "";
  const title =
    location && !p.title.toLowerCase().includes(location.toLowerCase())
      ? `${p.title} di ${location}`
      : p.title;
  return pageMetadata({
    title,
    description: p.description,
    path: `/properti/${p.slug}`,
    images: p.gallery.slice(0, 1),
  });
}
export default async function PropertyDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const property = await getListing((await params).slug);
  if (!property) notFound();
  const fields = await getFields();
  const visible = fields.filter(
    (f) => f.showOnDetail && filled(property.values[f.key]),
  );
  const price = visible.find((f) => f.type === "PRICE");
  const location = propertyLocation(property.values, fields, "showOnDetail");
  const specifications = visible.filter(
    (f) => f.key !== "lokasi" && !isRegionKey(f.key),
  );
  const phone = listingContactNumber(property.whatsapp);
  const wa = phone
    ? listingWhatsappLink(
        phone,
        property.title,
        `${siteUrl()}/properti/${property.slug}`,
      )
    : null;
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
              {location}
            </p>
          )}
          <section className="detail-section">
            <h2>Tentang properti ini</h2>
            <p className="preserve-lines">{property.description}</p>
          </section>
          {specifications.length > 0 && (
            <section className="detail-section">
              <h2>Spesifikasi properti</h2>
              <dl className="specification-grid">
                {specifications.map((f) => (
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
          {phone && (
            <small className="contact-number">
              <a href={`tel:+${phone}`}>{property.whatsapp}</a>
            </small>
          )}
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
          __html: jsonLd([
            schema,
            breadcrumbs([
              { name: "Beranda", path: "/" },
              { name: "Properti", path: "/properti" },
              { name: property.title, path: `/properti/${property.slug}` },
            ]),
          ]),
        }}
      />
    </article>
  );
}
