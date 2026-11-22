import { Prisma } from "@prisma/client";
import type { Area, AreaCategory } from "./areas";
import { rotationOrderSql } from "./listing-rotation";
// Administrative codes/labels win over marketing copy. Never infer location from description/title.
export function areaCondition(area: Area) {
  const cityCode = Prisma.sql`COALESCE("values"->>'kota_kabupaten_kode', '')`;
  const city = Prisma.sql`LOWER(TRIM(COALESCE("values"->>'kota_kabupaten', '')))`;
  const district = Prisma.sql`LOWER(TRIM(COALESCE("values"->>'kecamatan', '')))`;
  const address = Prisma.sql`LOWER(COALESCE("values"->>'lokasi', ''))`;
  const cityPattern = area.regencyCodes.includes("32.15")
    ? "^(kabupaten |kab\\.? )?karawang$"
    : "^(kota |kabupaten |kab\\.? )?bekasi$";
  const cityMatches = Prisma.sql`CASE WHEN ${cityCode} <> '' THEN ${cityCode} IN (${Prisma.join([...area.regencyCodes])}) ELSE ${city} ~ ${cityPattern} END`;
  if (area.district) {
    const pattern = `^(${area.district})( |$)`;
    const legacyPattern = `(^|[^a-z])(${area.district})([^a-z]|$)`;
    return Prisma.sql`((${cityCode} = '' AND ${city} = '' OR ${cityMatches}) AND CASE WHEN ${district} <> '' THEN ${district} ~ ${pattern} ELSE ${address} ~ ${legacyPattern} END)`;
  }
  const legacyPattern = `(^|[^a-z])${area.slug}([^a-z]|$)`;
  const childName = area.slug === "bekasi" ? "cikarang" : "cikampek";
  const childPattern = `^${childName}( |$)`;
  const childAddressPattern = `(^|[^a-z])${childName}([^a-z]|$)`;
  // A child area also belongs to its parent, including records with incomplete legacy location.
  // OR conditions keep each Property row/count unique even when several conditions match.
  return Prisma.sql`(${cityMatches} OR (${cityCode} = '' AND ${city} = '' AND (${address} ~ ${legacyPattern} OR CASE WHEN ${district} <> '' THEN ${district} ~ ${childPattern} ELSE ${address} ~ ${childAddressPattern} END)))`;
}
export function categoryCondition(category?: AreaCategory) {
  if (!category) return Prisma.sql`TRUE`;
  const transaksi = Prisma.sql`"values"->>'transaksi' = ${category.transaksi}`;
  return category.jenis
    ? Prisma.sql`(${transaksi} AND "values"->>'jenis' = ${category.jenis})`
    : transaksi;
}
const price = Prisma.sql`CASE WHEN jsonb_typeof("values"->'harga') = 'number' THEN ("values"->>'harga')::numeric END`;
export function areaQueries(
  area: Area,
  page = 1,
  round?: number,
  category?: AreaCategory,
) {
  const where = Prisma.sql`"status" = 'PUBLISHED'::"ListingStatus" AND ${areaCondition(area)} AND ${categoryCondition(category)}`;
  const order =
    round === undefined
      ? Prisma.sql`COALESCE("publishedAt", "createdAt") DESC, "id" ASC`
      : rotationOrderSql(round);
  return {
    list: Prisma.sql`SELECT "Property".*, (SELECT "name" FROM "AppUser" WHERE "AppUser"."id" = "Property"."ownerId") AS "ownerName" FROM "Property" WHERE ${where} ORDER BY ${order} LIMIT 18 OFFSET ${(page - 1) * 18}`,
    count: Prisma.sql`SELECT COUNT(*) AS count FROM "Property" WHERE ${where}`,
    // Ringkasan harga untuk paragraf pembuka & FAQ (hanya harga angka > 0).
    stats: Prisma.sql`SELECT MIN(${price}) AS min, MAX(${price}) AS max, percentile_cont(0.5) WITHIN GROUP (ORDER BY ${price}) AS median, COUNT(${price}) AS priced FROM "Property" WHERE ${where} AND ${price} > 0`,
    // Jumlah per kategori untuk menentukan halaman mana yang layak diindeks.
    categories: Prisma.sql`SELECT "values"->>'jenis' AS jenis, "values"->>'transaksi' AS transaksi, COUNT(*) AS count FROM "Property" WHERE ${where} GROUP BY 1, 2`,
  };
}
