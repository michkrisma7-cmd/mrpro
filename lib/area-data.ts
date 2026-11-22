import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { db, databaseConfigured } from "./db";
import { getFields } from "./data";
import {
  areas,
  areaCategories,
  findArea,
  findCategory,
  MIN_INDEXABLE_LISTINGS,
  type Area,
  type AreaCategory,
} from "./areas";
import { areaQueries } from "./area-query";
import { rotationRound } from "./listing-rotation";
import type { Listing } from "./types";
// Putaran rolling ikut jadi argumen (= kunci cache) agar berganti 00/06/12/18 WIB.
export const getAreaCatalog = cache(
  (slug: string, page = 1, categorySlug = "") =>
    getCachedAreaCatalog(slug, page, rotationRound(), categorySlug),
);
const getCachedAreaCatalog = cache(
  unstable_cache(
    async (slug: string, page: number, round: number, categorySlug: string) => {
      const area = findArea(slug);
      const category = categorySlug ? findCategory(categorySlug) : undefined;
      if (!area || !databaseConfigured || (categorySlug && !category))
        return { listings: [] as Listing[], total: 0 };
      const query = areaQueries(area, page, round, category);
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
    ["area-catalog-v2"],
    { revalidate: 60, tags: ["properties", "content"] },
  ),
);
export type AreaStats = {
  min: number | null;
  max: number | null;
  median: number | null;
  priced: number;
};
const toNumber = (v: unknown) =>
  v === null || v === undefined ? null : Number(v);
export const getAreaStats = cache(
  unstable_cache(
    async (slug: string, categorySlug = ""): Promise<AreaStats> => {
      const area = findArea(slug);
      const category = categorySlug ? findCategory(categorySlug) : undefined;
      if (!area || !databaseConfigured)
        return { min: null, max: null, median: null, priced: 0 };
      const [row] = await db().$queryRaw<Record<string, unknown>[]>(
        areaQueries(area, 1, undefined, category).stats,
      );
      return {
        min: toNumber(row?.min),
        max: toNumber(row?.max),
        median: toNumber(row?.median),
        priced: Number(row?.priced ?? 0),
      };
    },
    ["area-stats"],
    { revalidate: 300, tags: ["properties", "content"] },
  ),
);
export type AreaCount = {
  area: Area;
  total: number;
  categories: { category: AreaCategory; total: number }[];
};
// Index cards and sitemap need counts only, not listing rows or owner data.
export const getAreaCounts = cache(
  unstable_cache(
    async (): Promise<AreaCount[]> => {
      if (!databaseConfigured)
        return areas.map((area) => ({ area, total: 0, categories: [] }));
      return Promise.all(
        areas.map(async (area) => {
          const rows = await db().$queryRaw<
            { jenis: string | null; transaksi: string | null; count: bigint }[]
          >(areaQueries(area).categories);
          const total = rows.reduce((sum, r) => sum + Number(r.count), 0);
          const categories = areaCategories.map((category) => ({
            category,
            total: rows
              .filter(
                (r) =>
                  r.transaksi === category.transaksi &&
                  (!category.jenis || r.jenis === category.jenis),
              )
              .reduce((sum, r) => sum + Number(r.count), 0),
          }));
          return { area, total, categories };
        }),
      );
    },
    ["area-counts-v2"],
    { revalidate: 60, tags: ["properties", "content"] },
  ),
);
/** Halaman landing yang layak diindeks (≥ MIN_INDEXABLE_LISTINGS listing aktif). */
export async function getIndexablePages() {
  const pages: { area: Area; category?: AreaCategory; total: number }[] = [];
  for (const { area, total, categories } of await getAreaCounts()) {
    if (total >= MIN_INDEXABLE_LISTINGS) pages.push({ area, total });
    for (const c of categories)
      if (c.total >= MIN_INDEXABLE_LISTINGS)
        pages.push({ area, category: c.category, total: c.total });
  }
  return pages;
}
