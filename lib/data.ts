import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { catalogQueries } from "./catalog-query";
import { db, databaseConfigured } from "./db";
import {
  defaultFields,
  defaultSettings,
  demoListings,
  demoServices,
} from "./demo";
import type { Field, Listing, Service, Settings, Values } from "./types";
export const getFields = cache(
  unstable_cache(
    async (): Promise<Field[]> =>
      databaseConfigured
        ? db().propertyField.findMany({
            orderBy: [{ position: "asc" }, { createdAt: "asc" }],
          })
        : defaultFields,
    ["property-fields"],
    { revalidate: 60, tags: ["content"] },
  ),
);
export const getSettings = cache(
  unstable_cache(
    async (): Promise<Settings> =>
      databaseConfigured
        ? ((await db().siteSettings.findUnique({ where: { id: "main" } })) ??
          defaultSettings)
        : defaultSettings,
    ["site-settings"],
    { revalidate: 60, tags: ["content"] },
  ),
);
function publicListing(
  p: Omit<Listing, "values"> & { values: unknown; owner?: { name: string } },
  fields: Field[],
): Listing {
  const visible = new Set(
    fields.filter((f) => f.showOnCard || f.showOnDetail).map((f) => f.key),
  );
  const { owner, ...listing } = p;
  return {
    ...listing,
    ownerName: owner?.name || p.ownerName,
    values: Object.fromEntries(
      Object.entries(p.values as Values).filter(([key]) => visible.has(key)),
    ),
  };
}
// Share the catalog's LIMIT 12, count and newest-first order; home always uses page one.
export function getHomeListings(category = "") {
  return getCatalog(category ? { jenis: category } : {});
}
export const getListing = cache(
  unstable_cache(
    async (slug: string): Promise<Listing | undefined> => {
      if (!databaseConfigured) return demoListings.find((p) => p.slug === slug);
      const [p, fields] = await Promise.all([
        db().property.findUnique({
          where: { slug },
          include: { owner: { select: { name: true } } },
        }),
        getFields(),
      ]);
      if (!p || p.status !== "PUBLISHED") return undefined;
      return publicListing(p, fields);
    },
    ["property-detail"],
    { revalidate: 60, tags: ["properties", "content"] },
  ),
);
export const getServices = cache(
  unstable_cache(
    async (): Promise<Service[]> =>
      databaseConfigured
        ? db().service.findMany({
            where: { active: true },
            orderBy: { createdAt: "desc" },
          })
        : demoServices,
    ["services"],
    { revalidate: 60, tags: ["content"] },
  ),
);
export async function getPublishedByIds(ids: string[]): Promise<Listing[]> {
  if (!databaseConfigured)
    return demoListings.filter((p) => ids.includes(p.id));
  const fields = await getFields();
  return (
    await db().property.findMany({
      include: { owner: { select: { name: true } } },
      where: { status: "PUBLISHED", id: { in: ids } },
      take: 100,
    })
  ).map((p) => publicListing(p, fields));
}
// Canonical arguments prevent duplicate entries for equivalent filter orders.
export function getCatalog(params: Record<string, string>) {
  const normalized = Object.fromEntries(
    ["q", "jenis", "transaksi", "harga", "urut", "page"]
      .filter((key) => Boolean(params[key]))
      .map((key) => [key, params[key]]),
  );
  return getCachedCatalog(normalized);
}
const getCachedCatalog = unstable_cache(
  async (params: Record<string, string>) => {
    const page = Math.max(
      1,
      Math.min(100000, Number.parseInt(params.page || "1", 10) || 1),
    );
    const size = 12;
    if (!databaseConfigured) {
      const q = (params.q || "").toLowerCase();
      let all = demoListings.filter(
        (p) =>
          (!q ||
            `${p.title} ${p.values.lokasi || ""} ${p.values.proyek || ""} ${p.values.nama_proyek || ""}`
              .toLowerCase()
              .includes(q)) &&
          (!params.jenis || p.values.jenis === params.jenis) &&
          (!params.transaksi || p.values.transaksi === params.transaksi) &&
          (!params.harga || Number(p.values.harga) <= Number(params.harga)),
      );
      if (params.urut === "termurah")
        all = all.sort(
          (a, b) => Number(a.values.harga || 0) - Number(b.values.harga || 0),
        );
      return {
        listings: all.slice((page - 1) * size, page * size),
        total: all.length,
        page,
        pages: Math.ceil(all.length / size),
      };
    }
    const fields = await getFields();
    const visible = new Set(
      fields.filter((f) => f.showOnCard || f.showOnDetail).map((f) => f.key),
    );
    const queries = catalogQueries(params, visible);
    const [rows, count] = await Promise.all([
      db().$queryRaw<Listing[]>(queries.list),
      db().$queryRaw<{ count: bigint }[]>(queries.count),
    ]);
    const total = Number(count[0].count);
    return {
      listings: rows.map((p) => publicListing(p, fields)),
      total,
      page,
      pages: Math.ceil(total / size),
    };
  },
  ["property-catalog"],
  { revalidate: 60, tags: ["properties", "content"] },
);
