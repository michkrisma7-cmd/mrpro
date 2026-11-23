"use client";
import { useEffect, useState } from "react";
import { useFavorites } from "@/lib/favorites";
import { PropertyCard } from "./property-card";
import { EmptyListings } from "./empty-listings";
import type { Field, Listing } from "@/lib/types";
export function SavedListingGrid({ fields }: { fields: Field[] }) {
  const { ids } = useFavorites();
  const [savedListings, setSavedListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const idKey = ids.join(",");
  useEffect(() => {
    if (!idKey) return;
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
  }, [idKey]);
  const items = savedListings.filter((p) => ids.includes(p.id));
  if (loading)
    return (
      <div className="empty-state">
        <p>Memuat properti tersimpan…</p>
      </div>
    );
  if (error)
    return (
      <div className="empty-state">
        <p>Properti tersimpan belum dapat dimuat. Coba muat ulang halaman.</p>
      </div>
    );
  return items.length ? (
    <div className="property-grid">
      {items.map((p, i) => (
        <PropertyCard key={p.id} property={p} fields={fields} index={i} />
      ))}
    </div>
  ) : (
    <EmptyListings favorites />
  );
}
