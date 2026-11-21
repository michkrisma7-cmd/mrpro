"use client";
import { propertyLocation } from "@/lib/property-location";
import { isRegionKey } from "@/lib/region-config";
import { useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { useFavorites } from "@/lib/favorites";
import {
  Heart,
  UserRound,
  MapPin,
  BedDouble,
  Bath,
  Scan,
  ArrowUpRight,
  Phone,
  Camera,
} from "lucide-react";
import { displayTitle } from "@/lib/listing-title";
import type { Field, Listing } from "@/lib/types";
import { advertiserLabel, displayValue, filled, siteUrl } from "@/lib/format";
import { listingDetailPath } from "@/lib/listing-share";
import { PropertyShareButton } from "./property-share-button";
import {
  listingContactNumber,
  listingWhatsappLink,
} from "@/lib/listing-contact";

const subscribeOrigin = () => () => {};
const browserOrigin = () => window.location.origin;
const specKeys = ["kamar_tidur", "kamar_mandi", "luas_tanah", "luas_bangunan"];
const postedDate = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});

function WhatsappIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      <path d="M20.5 11.7a8.5 8.5 0 0 1-12.6 7.5L3 20.5l1.3-4.7a8.5 8.5 0 1 1 16.2-4.1Z" />
      <path d="m8.2 7.8 1.4 2.6-.9 1c.8 1.5 1.9 2.6 3.5 3.3l1-1 2.7 1.3c-.3 1.4-1.1 2-2.4 1.8-3.7-.6-6.7-3.5-7-6.9-.1-1.1.5-1.8 1.7-2.1Z" />
    </svg>
  );
}
export function PropertyCard({
  property: p,
  fields,
  index = 99,
}: {
  property: Listing;
  fields: Field[];
  /** Posisi di grid: kartu teratas dimuat langsung karena jadi elemen LCP. */
  index?: number;
}) {
  const { ids, toggle: toggleFavorite } = useFavorites();
  const saved = ids.includes(p.id);
  const ownerName = p.submitterName?.trim() || p.ownerName;
  const role = advertiserLabel(p.advertiserType);
  const origin = useSyncExternalStore(subscribeOrigin, browserOrigin, siteUrl);
  const detailPath = listingDetailPath(p.slug);
  const number = listingContactNumber(p.whatsapp);
  const whatsapp = number
    ? listingWhatsappLink(number, p.title, new URL(detailPath, origin).href)
    : null;
  function toggle() {
    toggleFavorite(p.id);
  }
  const visible = fields.filter((f) => f.showOnCard && filled(p.values[f.key]));
  const price = visible.find((f) => f.type === "PRICE");
  const locationField = visible.find((f) => f.key === "lokasi");
  const location = propertyLocation(p.values, fields, "showOnCard");
  const title = displayTitle(p.title);
  const posted = new Date(p.createdAt);
  return (
    <article className="property-card">
      <div className="property-image">
        <Link
          href={detailPath}
          prefetch={false}
          tabIndex={-1}
          aria-hidden="true"
        >
          <Image
            src={p.gallery[0] || "/images/hero.webp"}
            alt={title}
            fill
            sizes="(max-width: 640px) 92vw, (max-width: 900px) 46vw, 30vw"
            className="cover"
            loading={index < 3 ? "eager" : "lazy"}
            fetchPriority={index === 0 ? "high" : undefined}
          />
        </Link>
        <span className="property-badge">
          {visible.some((f) => f.key === "transaksi")
            ? `${visible.find((f) => f.key === "transaksi")?.cardLabel || visible.find((f) => f.key === "transaksi")?.name}: ${String(p.values.transaksi)}`
            : "Properti"}
        </span>
        <button
          type="button"
          onClick={toggle}
          className={`favorite-button ${saved ? "is-saved" : ""}`}
          aria-label={saved ? "Hapus dari tersimpan" : "Simpan properti"}
          aria-pressed={saved}
        >
          <Heart size={18} fill={saved ? "currentColor" : "none"} />
        </button>
        {p.featured && <span className="featured-badge">Pilihan MR</span>}
        {p.gallery.length > 1 && (
          <span className="photo-count-badge">
            <Camera size={13} aria-hidden="true" />
            {p.gallery.length}
            <span className="sr-only"> foto</span>
          </span>
        )}
      </div>
      <div className="property-body">
        <div className="property-specs">
          {specKeys
            .map((key) => visible.find((f) => f.key === key))
            .filter((f): f is Field => Boolean(f))
            .map((f) => {
              const Icon =
                f.key === "kamar_tidur"
                  ? BedDouble
                  : f.key === "kamar_mandi"
                    ? Bath
                    : Scan;
              const label =
                f.cardLabel ||
                {
                  kamar_tidur: "KT",
                  kamar_mandi: "KM",
                  luas_tanah: "LT",
                  luas_bangunan: "LB",
                }[f.key];
              return (
                <span key={f.key}>
                  <Icon size={15} aria-hidden="true" />
                  <span>
                    {f.key.startsWith("luas_")
                      ? `${label} ${displayValue(f, p.values[f.key])} m²`
                      : `${displayValue(f, p.values[f.key])} ${label}`}
                  </span>
                </span>
              );
            })}
        </div>

        <div className="property-price-row">
          {price && (
            <p className="property-price">
              <span className="sr-only">{price.cardLabel || price.name}: </span>
              {displayValue(price, p.values[price.key])}
              {p.values.transaksi === "Disewa" && <small> / tahun</small>}
            </p>
          )}
          <PropertyShareButton
            listing={{
              slug: p.slug,
              title,
              price: price
                ? `${displayValue(price, p.values[price.key])}${p.values.transaksi === "Disewa" ? " / tahun" : ""}`
                : undefined,
              location,
              image: p.gallery[0],
            }}
          />
        </div>
        <Link href={detailPath} prefetch={false}>
          <h3>{title}</h3>
        </Link>
        {location && (
          <p className="property-location">
            <MapPin size={14} />
            <span className="sr-only">
              {locationField?.cardLabel || locationField?.name || "Lokasi"}
              :{" "}
            </span>
            <span>{location}</span>
          </p>
        )}
        {visible.some(
          (f) =>
            f !== price &&
            f.key !== "lokasi" &&
            !isRegionKey(f.key) &&
            f.key !== "transaksi" &&
            !specKeys.includes(f.key),
        ) && (
          <div className="property-extra-fields">
            {visible
              .filter(
                (f) =>
                  f !== price &&
                  f.key !== "lokasi" &&
                  !isRegionKey(f.key) &&
                  f.key !== "transaksi" &&
                  !specKeys.includes(f.key),
              )
              .map((f) => (
                <span key={f.key}>
                  {f.cardLabel || f.name}: {displayValue(f, p.values[f.key])}
                </span>
              ))}
          </div>
        )}
        {!Number.isNaN(posted.getTime()) && (
          <p className="property-posted">
            Tayang{" "}
            <time dateTime={posted.toISOString()}>
              {postedDate.format(posted)}
            </time>
          </p>
        )}
        <Link href={detailPath} prefetch={false} className="card-more">
          Lihat properti <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
        <div className="property-contact">
          <span
            className="property-contact-owner"
            title={ownerName || undefined}
          >
            <UserRound size={16} aria-hidden="true" />
            <span>
              {role}
              {ownerName ? `: ${ownerName}` : " listing"}
            </span>
          </span>
          {number && (
            <a
              href={`tel:+${number}`}
              className="property-contact-phone"
              aria-label={`Telepon ${ownerName || `${role.toLowerCase()} listing`}`}
            >
              <Phone size={18} aria-hidden="true" />
            </a>
          )}
          {whatsapp && (
            <a
              href={whatsapp}
              className="property-contact-whatsapp"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`WhatsApp ${ownerName || `${role.toLowerCase()} listing`}`}
            >
              <WhatsappIcon /> WhatsApp
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
