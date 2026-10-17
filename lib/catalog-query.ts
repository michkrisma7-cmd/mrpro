import { Prisma } from "@prisma/client";
export function catalogQueries(
  params: Record<string, string>,
  visible: Set<string>,
) {
  const page = Math.max(
    1,
    Math.min(100000, Number.parseInt(params.page || "1", 10) || 1),
  );
  const size = 12;
  const conditions = [Prisma.sql`"status" = 'PUBLISHED'::"ListingStatus"`];
  if (params.q) {
    const q = params.q.slice(0, 150);
    conditions.push(
      visible.has("lokasi")
        ? Prisma.sql`POSITION(LOWER(${q}) IN LOWER("title" || ' ' || COALESCE("values"->>'lokasi',''))) > 0`
        : Prisma.sql`POSITION(LOWER(${q}) IN LOWER("title")) > 0`,
    );
  }
  if (params.jenis)
    conditions.push(
      visible.has("jenis")
        ? Prisma.sql`"values"->>'jenis' = ${params.jenis}`
        : Prisma.sql`FALSE`,
    );
  if (params.transaksi)
    conditions.push(
      visible.has("transaksi")
        ? Prisma.sql`"values"->>'transaksi' = ${params.transaksi}`
        : Prisma.sql`FALSE`,
    );
  const price = Prisma.sql`CASE WHEN jsonb_typeof("values"->'harga') = 'number' THEN ("values"->>'harga')::numeric END`;
  if (params.harga) {
    const n = Number(params.harga);
    conditions.push(
      visible.has("harga") && Number.isFinite(n) && n >= 0
        ? Prisma.sql`${price} <= ${n}`
        : Prisma.sql`FALSE`,
    );
  }
  const where = Prisma.join(conditions, " AND ");
  const order =
    params.urut === "termurah" && visible.has("harga")
      ? Prisma.sql`${price} ASC NULLS LAST, "createdAt" DESC`
      : Prisma.sql`"createdAt" DESC`;
  return {
    page,
    size,
    list: Prisma.sql`SELECT * FROM "Property" WHERE ${where} ORDER BY ${order} LIMIT ${size} OFFSET ${(page - 1) * size}`,
    count: Prisma.sql`SELECT COUNT(*) as count FROM "Property" WHERE ${where}`,
  };
}
