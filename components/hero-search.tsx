"use client";

import { useState } from "react";
import { MapPin, Search } from "lucide-react";
import { SearchForm } from "./search-form";

export function HeroSearch({ types }: { types: string[] }) {
  const [transaction, setTransaction] = useState("Dijual");
  return (
    <div className="property-hero-search">
      <div
        className="property-hero-modes"
        role="group"
        aria-label="Jenis transaksi properti"
      >
        {[
          ["Dijual", "Dijual"],
          ["Disewa", "Sewa"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={transaction === value}
            onClick={() => setTransaction(value)}
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
        aria-label="Pencarian lokasi atau nama proyek"
      >
        <MapPin size={18} aria-hidden="true" />
        <input
          name="q"
          placeholder="Masukan lokasi atau nama proyek"
          aria-label="Lokasi atau nama proyek"
        />
        <input type="hidden" name="transaksi" value={transaction} />
        <button type="submit" className="button" aria-label="Cari Properti">
          <Search size={19} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
