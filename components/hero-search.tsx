"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Search } from "lucide-react";
import { SearchForm } from "./search-form";

export function HeroSearch({ types }: { types: string[] }) {
  const [transaction, setTransaction] = useState("Dijual");
  const panel = useRef<HTMLDivElement>(null);
  const router = useRouter();
  function selectTransaction(value: string) {
    setTransaction(value);
    const form = Array.from(panel.current?.querySelectorAll("form") || []).find(
      (form) => form.getClientRects().length > 0,
    );
    const query = new URLSearchParams();
    if (form)
      for (const [key, entry] of new FormData(form))
        if (typeof entry === "string" && entry) query.set(key, entry);
    query.set("transaksi", value);
    router.push(`/properti?${query}`);
  }
  return (
    <div className="property-hero-search" ref={panel}>
      <div
        className="property-hero-modes"
        role="group"
        aria-label="Jenis transaksi properti"
      >
        {[
          ["Dijual", "Dijual"],
          ["Disewa", "Sewa"],
          ["Over Kredit", "Over Kredit"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={transaction === value}
            onClick={() => selectTransaction(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="hero-search-desktop">
        <SearchForm types={types} initial={{ transaksi: transaction }} />
      </div>
      <form
        action="/properti"
        className="hero-search-mobile"
        aria-label="Pencarian lokasi atau nama properti"
      >
        <MapPin size={18} aria-hidden="true" />
        <input
          name="q"
          placeholder="Lokasi atau nama properti"
          aria-label="Lokasi atau nama properti"
        />
        <input type="hidden" name="transaksi" value={transaction} />
        <button
          type="submit"
          className="button home-neutral-button"
          aria-label="Cari Properti"
        >
          <Search size={19} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
