"use client";
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
} from "lucide-react";
import type { Field, Listing } from "@/lib/types";
import { displayValue, filled } from "@/lib/format";
export function PropertyCard({
  property: p,
  fields,
}: {
  property: Listing;
  fields: Field[];
}) {
  const { ids, toggle: toggleFavorite } = useFavorites();
  const saved = ids.includes(p.id);
  function toggle() {
    toggleFavorite(p.id);
  }
  const visible = fields.filter((f) => f.showOnCard && filled(p.values[f.key]));
  const price = visible.find((f) => f.type === "PRICE");
  const location = visible.find((f) => f.key === "lokasi");
  return (
    <article className="property-card">
      <div className="property-image">
        <Link
          href={`/properti/${p.slug}`}
          prefetch={false}
          tabIndex={-1}
          aria-hidden="true"
        >
          <Image
            src={p.gallery[0] || "/images/hero.webp"}
            alt={p.title}
            fill
            sizes="(max-width: 640px) 92vw, (max-width: 900px) 46vw, 30vw"
            className="cover"
          />
        </Link>
        <span className="property-badge">
          {visible.some((f) => f.key === "transaksi")
            ? `${visible.find((f) => f.key === "transaksi")?.cardLabel || visible.find((f) => f.key === "transaksi")?.name}: ${String(p.values.transaksi)}`
            : "Properti"}
        </span>
        <button
          onClick={toggle}
          className={`favorite-button ${saved ? "is-saved" : ""}`}
          aria-label={saved ? "Hapus dari tersimpan" : "Simpan properti"}
          aria-pressed={saved}
        >
          <Heart size={18} fill={saved ? "currentColor" : "none"} />
        </button>
        {p.featured && <span className="featured-badge">Pilihan MR</span>}
      </div>
      <div className="property-body">
        {price && (
          <p className="property-price">
            <span className="price-label">{price.cardLabel || price.name}</span>
            {displayValue(price, p.values[price.key])}
            {p.values.transaksi === "Disewa" && <small> / tahun</small>}
          </p>
        )}
        <Link href={`/properti/${p.slug}`} prefetch={false}>
          <h3>{p.title}</h3>
        </Link>
        {location && (
          <p className="property-location">
            <MapPin size={14} />
            {location.cardLabel || location.name}:{" "}
            {displayValue(location, p.values[location.key])}
          </p>
        )}
        {p.ownerName && (
          <p className="property-owner">
            <UserRound size={14} aria-hidden="true" />
            Pemilik: {p.ownerName}
          </p>
        )}
        <div className="property-specs">
          {visible
            .filter(
              (f) => f !== price && f !== location && f.key !== "transaksi",
            )
            .map((f) => {
              const Icon =
                f.key === "kamar_tidur"
                  ? BedDouble
                  : f.key === "kamar_mandi"
                    ? Bath
                    : Scan;
              return (
                <span key={f.key}>
                  <Icon size={15} />
                  {displayValue(f, p.values[f.key])} {f.cardLabel || f.name}
                  {f.key.startsWith("luas_") ? " m²" : ""}
                </span>
              );
            })}
        </div>
        <Link
          href={`/properti/${p.slug}`}
          prefetch={false}
          className="card-more"
        >
          Lihat properti <ArrowUpRight size={15} />
        </Link>
      </div>
    </article>
  );
}
