import type { Metadata } from "next";
import Link from "next/link";
import { getCatalog, getFields } from "@/lib/data";
import { SearchForm } from "@/components/search-form";
import { ListingGrid } from "@/components/listing-grid";
import { databaseConfigured } from "@/lib/db";
export const metadata: Metadata = {
  title: "Temukan Properti",
  description:
    "Jelajahi rumah, apartemen, tanah, dan ruko dijual atau disewa. Temukan ruang yang tepat bersama MR Properti.",
  alternates: { canonical: "/properti" },
};
export default async function Properties({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = Object.fromEntries(
    Object.entries(raw).filter(([, v]) => typeof v === "string"),
  ) as Record<string, string>;
  const [catalog, fields] = await Promise.all([
    getCatalog(params),
    getFields(),
  ]);
  const { listings, total, page, pages } = catalog;
  function pageLink(n: number) {
    const query = new URLSearchParams(params);
    query.set("page", String(n));
    return `/properti?${query.toString()}`;
  }
  return (
    <div className="page-wrap container">
      <div className="breadcrumb">
        <Link href="/">Beranda</Link>
        <span>/</span>Properti
      </div>
      <div className="page-heading">
        <p className="eyebrow">TEMPAT UNTUK RENCANA ANDA</p>
        <h1>
          {params.favorit
            ? "Ruang yang Anda simpan."
            : "Temukan tempat untuk pulang."}
        </h1>
        <p>Setiap ruang punya cerita. Temukan yang cocok untuk cerita Anda.</p>
      </div>
      <SearchForm
        initial={params}
        compact
        types={
          fields.find(
            (f) => f.key === "jenis" && (f.showOnCard || f.showOnDetail),
          )?.options || []
        }
      />
      <div className="catalog-toolbar">
        <div className="catalog-tabs">
          <Link className={!params.transaksi ? "active" : ""} href="/properti">
            Semua
          </Link>
          <Link
            className={params.transaksi === "Dijual" ? "active" : ""}
            href="/properti?transaksi=Dijual"
          >
            Dijual
          </Link>
          <Link
            className={params.transaksi === "Disewa" ? "active" : ""}
            href="/properti?transaksi=Disewa"
          >
            Disewa
          </Link>
        </div>
        <form>
          <input type="hidden" name="q" value={params.q || ""} />
          <input type="hidden" name="jenis" value={params.jenis || ""} />
          <input
            type="hidden"
            name="transaksi"
            value={params.transaksi || ""}
          />
          <input type="hidden" name="harga" value={params.harga || ""} />
          <label className="sort-label">
            Urutkan
            <select name="urut" defaultValue={params.urut || ""}>
              <option value="">Terbaru</option>
              <option value="termurah">Harga terendah</option>
            </select>
          </label>
          <button className="text-button" type="submit">
            Terapkan
          </button>
        </form>
      </div>
      <p className="result-count">
        {params.favorit
          ? "Properti favorit di perangkat ini"
          : `${total} properti ditemukan`}
        {!databaseConfigured && " · Data contoh untuk pratinjau"}
      </p>
      <ListingGrid
        listings={listings}
        fields={fields}
        favorites={params.favorit === "1"}
      />
      {pages > 1 && params.favorit !== "1" && (
        <nav className="pagination" aria-label="Halaman katalog">
          {page > 1 && (
            <Link className="outline-button" href={pageLink(page - 1)}>
              Sebelumnya
            </Link>
          )}
          <span>
            Halaman {page} dari {pages}
          </span>
          {page < pages && (
            <Link className="outline-button" href={pageLink(page + 1)}>
              Berikutnya
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
