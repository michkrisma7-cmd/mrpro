import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { db, databaseConfigured } from "./db";
import { getFields } from "./data";
import { areas, findArea } from "./areas";
import { areaQueries } from "./area-query";
import { rotationDirection, type RotationDirection } from "./listing-rotation";
import type { Listing } from "./types";
// Arah rotasi harian ikut jadi argumen (= kunci cache) agar berganti 00:00 WIB.
export const getAreaCatalog = cache((slug: string, page = 1) =>
  getCachedAreaCatalog(slug, page, rotationDirection()),
);
const getCachedAreaCatalog = cache(
  unstable_cache(
    async (slug: string, page: number, arah: RotationDirection) => {
      const area = findArea(slug);
      if (!area || !databaseConfigured)
        return { listings: [] as Listing[], total: 0 };
      const query = areaQueries(area, page, arah);
      const [rows, counts, fields] = await Promise.all([
        db().$queryRaw<Listing[]>(query.list),
        db().$queryRaw<{ count: bigint }[]>(query.count),
        getFields(),
      ]);
      const visible = new Set(
        fields.filter((f) => f.showOnCard || f.showOnDetail).map((f) => f.key),
      );
      return {
        listings: rows.map((row) => ({
          ...row,
          values: Object.fromEntries(
            Object.entries(row.values).filter(([key]) => visible.has(key)),
          ),
        })),
        total: Number(counts[0].count),
      };
    },
    ["area-catalog"],
    { revalidate: 60, tags: ["properties", "content"] },
  ),
);
// Index cards and sitemap need counts only, not listing rows or owner data.
export const getAreaCounts = cache(
  unstable_cache(
    async () => {
      if (!databaseConfigured) return areas.map((area) => ({ area, total: 0 }));
      return Promise.all(
        areas.map(async (area) => {
          const counts = await db().$queryRaw<{ count: bigint }[]>(
            areaQueries(area).count,
          );
          return { area, total: Number(counts[0].count) };
        }),
      );
    },
    ["area-counts"],
    { revalidate: 60, tags: ["properties", "content"] },
  ),
);
export async function getIndexableAreas() {
  return (await getAreaCounts())
    .filter(({ total }) => total > 0)
    .map(({ area }) => area);
}
