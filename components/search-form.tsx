import { MapPin, Search, House, SlidersHorizontal } from "lucide-react";
export function SearchForm({
  initial = {},
  compact = false,
  types = [],
}: {
  initial?: Record<string, string>;
  compact?: boolean;
  types?: string[];
}) {
  return (
    <form
      action="/properti"
      className={`search-form ${compact ? "compact" : ""}`}
    >
      <label>
        <span>
          <MapPin size={14} />
          Lokasi atau kata kunci
        </span>
        <input
          name="q"
          placeholder="Mau tinggal di mana?"
          defaultValue={initial.q}
        />
      </label>
      <label>
        <span>
          <House size={14} />
          Tipe properti
        </span>
        <select name="jenis" defaultValue={initial.jenis || ""}>
          <option value="">Semua tipe</option>
          {types.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </label>
      <label>
        <span>
          <SlidersHorizontal size={14} />
          Rentang harga
        </span>
        <select name="harga" defaultValue={initial.harga || ""}>
          <option value="">Semua harga</option>
          <option value="500000000">Di bawah Rp500 juta</option>
          <option value="1000000000">Di bawah Rp1 miliar</option>
          <option value="2000000000">Di bawah Rp2 miliar</option>
          <option value="5000000000">Di bawah Rp5 miliar</option>
        </select>
      </label>
      <input type="hidden" name="transaksi" value={initial.transaksi || ""} />
      <button className="button" type="submit">
        <Search size={18} />
        Cari Properti
      </button>
    </form>
  );
}
