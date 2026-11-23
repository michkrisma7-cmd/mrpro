import { House, SearchX } from "lucide-react";
import Link from "next/link";

export function EmptyListings({ favorites = false }: { favorites?: boolean }) {
  return (
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
