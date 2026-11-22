import Link from "next/link";
import { mainAreas, areaPath } from "@/lib/areas";
export function AreaLinks() {
  return (
    <nav aria-label="Properti menurut wilayah" className="catalog-tabs">
      <Link href="/wilayah">Semua wilayah</Link>
      {mainAreas.map((area) => (
        <Link key={area.slug} href={areaPath(area)}>
          Properti {area.name}
        </Link>
      ))}
    </nav>
  );
}
