import Link from "next/link";
import { areas, areaPath } from "@/lib/areas";
export function AreaLinks() {
  return (
    <nav aria-label="Properti menurut wilayah" className="catalog-tabs">
      <Link href="/wilayah">Semua wilayah</Link>
      {areas.map((area) => (
        <Link key={area.slug} href={areaPath(area)}>
          Properti {area.name}
        </Link>
      ))}
    </nav>
  );
}
