import { propertyLocation } from "@/lib/property-location";
import { isRegionKey } from "@/lib/region-config";
import type { Metadata } from "next";
import { pageMetadata, breadcrumbs, jsonLd } from "@/lib/seo";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { MapPin, ArrowUpRight, ShieldCheck, MessageCircle } from "lucide-react";
import {
  getFields,
  getListing,
  getRetiredListingTarget,
  getSimilarListings,
} from "@/lib/data";
import { listingArea, areaPath, areaTrail } from "@/lib/areas";
import { displayTitle } from "@/lib/listing-title";
import { PropertyCard } from "@/components/property-card";
import { displayValue, filled, siteUrl } from "@/lib/format";
import {
  listingContactNumber,
  listingWhatsappLink,
} from "@/lib/listing-contact";
import { Gallery } from "@/components/gallery";
import { listingSearchText } from "@/lib/listing-seo";
import { listingPreviewImage } from "@/lib/listing-preview";
import { PropertyVideo } from "@/components/property-video";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const slug = (await params).slug;
  const p = await getListing(slug);
  if (!p) {
    const target = await getRetiredListingTarget(slug);
    if (target) permanentRedirect(target);
    return { title: "Properti tidak ditemukan", robots: { index: false } };
  }
  const { documentTitle: title, description } = listingSearchText(p);
  const image = listingPreviewImage(p.gallery, p.title);
  const metadata = pageMetadata({
    title,
    absoluteTitle: true,
    description,
    path: `${siteUrl()}/properti/${p.slug}`,
    images: [image.url],
  });
  return { ...metadata, openGraph: { ...metadata.openGraph, images: [image] } };
}
export default async function PropertyDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const slug = (await params).slug;
  const property = await getListing(slug);
  if (!property) {
    const target = await getRetiredListingTarget(slug);
    if (target) permanentRedirect(target);
    notFound();
  }
  const fields = await getFields();
  const visible = fields.filter(
    (f) => f.showOnDetail && filled(property.values[f.key]),
  );
  const price = visible.find((f) => f.type === "PRICE");
  const location = propertyLocation(property.values, fields, "showOnDetail");
  const specifications = visible.filter(
    (f) => f.key !== "lokasi" && !isRegionKey(f.key),
  );
  const title = displayTitle(property.title);
  const area = listingArea(property.values);
  const text = (key: string) =>
    typeof property.values[key] === "string"
      ? (property.values[key] as string)
      : "";
  const kind = [text("jenis"), text("transaksi")].filter(Boolean).join(" · ");
  const similar = await getSimilarListings(
    property.id,
    text("jenis"),
    text("transaksi"),
    property.values,
  );
  const harga = Number(property.values.harga);
  const crumbs = [
    { name: "Beranda", path: "/" },
    ...(area
      ? [
          { name: "Wilayah", path: "/wilayah" },
          ...areaTrail(area).map((a) => ({ name: a.name, path: areaPath(a) })),
        ]
      : [{ name: "Properti", path: "/properti" }]),
    { name: title, path: `/properti/${property.slug}` },
  ];
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
    name: title,
    description: property.description,
    image: property.gallery.map((src) => new URL(src, siteUrl()).href),
    url: `${siteUrl()}/properti/${property.slug}`,
    datePosted: new Date(property.createdAt).toISOString(),
    ...(Number.isFinite(harga) && harga > 0
      ? {
          offers: {
            "@type": "Offer",
            price: harga,
            priceCurrency: "IDR",
            availability: "https://schema.org/InStock",
            url: `${siteUrl()}/properti/${property.slug}`,
          },
        }
      : {}),
  };
  return (
    <article className="container page-wrap">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        {crumbs.slice(0, -1).map((c) => (
          <span key={c.path}>
            <Link href={c.path}>{c.name}</Link>
            <span aria-hidden="true"> › </span>
          </span>
        ))}
        <span aria-current="page">{title}</span>
      </nav>
      <Gallery images={property.gallery} title={title} />
      <div className="detail-layout">
        <div>
          {kind && <p className="eyebrow">{kind}</p>}
          <h1 className="detail-title">{title}</h1>
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
          {location && (
            <section className="detail-section">
              <h2>Lokasi</h2>
              <iframe
                className="detail-map"
                title={`Peta lokasi ${title}`}
                src={`https://maps.google.com/maps?q=${encodeURIComponent(location)}&z=14&output=embed`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <p className="detail-map-note">
                Peta perkiraan berdasarkan alamat di iklan.{" "}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Buka di Google Maps
                </a>
              </p>
            </section>
          )}
          {property.youtubeVideoId && (
            <PropertyVideo
              videoId={property.youtubeVideoId}
              title={property.title}
            />
          )}
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
          {property.advertiserType && (
            <p className="advertiser-type">
              {property.advertiserType === "AGEN"
                ? "Diiklankan oleh agen / perantara"
                : "Diiklankan langsung oleh pemilik"}
            </p>
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
      {similar.length > 0 && (
        <section className="detail-section similar-listings">
          <h2>Properti serupa</h2>
          <div className="property-grid">
            {similar.map((p) => (
              <PropertyCard key={p.id} property={p} fields={fields} />
            ))}
          </div>
        </section>
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd([schema, breadcrumbs(crumbs)]),
        }}
      />
    </article>
  );
}
