"use client";
import { useState } from "react";
import { MapPin } from "lucide-react";
// Facade: iframe Google Maps (±480 KB JS) baru dimuat setelah pengguna meminta.
export function MapEmbed({ title, query }: { title: string; query: string }) {
  const [open, setOpen] = useState(false);
  if (open)
    return (
      <iframe
        className="detail-map"
        title={title}
        src={`https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=14&output=embed`}
        referrerPolicy="no-referrer-when-downgrade"
      />
    );
  return (
    <button
      type="button"
      className="detail-map detail-map-facade"
      onClick={() => setOpen(true)}
      aria-label={`Tampilkan peta: ${title}`}
    >
      <MapPin size={28} aria-hidden="true" />
      <span>Tampilkan peta lokasi</span>
    </button>
  );
}
