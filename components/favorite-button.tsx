"use client";
import { Heart } from "lucide-react";
import { useFavorites } from "@/lib/favorites";

/** Satu-satunya bagian kartu properti yang butuh JS (selain tombol bagikan),
 * supaya kartu lain cukup dirender di server tanpa hidrasi. */
export function FavoriteButton({ id }: { id: string }) {
  const { ids, toggle } = useFavorites();
  const saved = ids.includes(id);
  return (
    <button
      type="button"
      onClick={() => toggle(id)}
      className={`favorite-button ${saved ? "is-saved" : ""}`}
      aria-label={saved ? "Hapus dari tersimpan" : "Simpan properti"}
      aria-pressed={saved}
    >
      <Heart size={18} fill={saved ? "currentColor" : "none"} />
    </button>
  );
}
