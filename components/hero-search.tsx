"use client";

import { useState } from "react";
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
      <SearchForm types={types} initial={{ transaksi: transaction }} />
    </div>
  );
}
