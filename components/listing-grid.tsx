"use client";
import { useEffect, useState } from "react";
import { useFavorites } from "@/lib/favorites";
import { House, SearchX } from "lucide-react";
import Link from "next/link";
import { PropertyCard } from "./property-card";
import type { Field, Listing } from "@/lib/types";
export function ListingGrid({
  listings,
  fields,
  favorites = false,
}: {
  listings: Listing[];
  fields: Field[];
  favorites?: boolean;
}) {
  const { ids } = useFavorites();
  const [savedListings, setSavedListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const idKey = ids.join(",");
  useEffect(() => {
    if (!favorites || !idKey) return;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(false);
      try {
        const response = await fetch(
          `/api/favorites?ids=${encodeURIComponent(idKey)}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error();
        const data = await response.json();
        setSavedListings(data);
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [favorites, idKey]);
  const items = favorites
    ? savedListings.filter((p) => ids.includes(p.id))
    : listings;
  if (favorites && loading)
    return (
      <div className="empty-state">
        <p>Memuat properti tersimpan…</p>
      </div>
    );
  if (favorites && error)
    return (
      <div className="empty-state">
        <p>Properti tersimpan belum dapat dimuat. Coba muat ulang halaman.</p>
      </div>
    );
  return items.length ? (
    <div className="property-grid">
      {items.map((p) => (
        <PropertyCard key={p.id} property={p} fields={fields} />
      ))}
    </div>
  ) : (
    <div className="empty-state">
      <SearchX size={38} />
      <h3>
        {favorites
          ? "Belum ada properti tersimpan"
          : "Belum menemukan yang cocok?"}
      </h3>
      <p>
        {favorites
          ? "Tekan ikon hati di kartu properti untuk menyimpannya di perangkat ini."
          : "Coba lokasi atau filter lain. Ruang yang tepat mungkin hanya selangkah lagi."}
      </p>
      <Link className="button" href="/properti">
        <House size={17} />
        Lihat semua properti
      </Link>
    </div>
  );
}
