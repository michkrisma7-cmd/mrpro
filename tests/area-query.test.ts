import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { areaQueries } from "../lib/area-query";
import { findArea, findCategory } from "../lib/areas";

test("regional queries honor administrative locations, legacy addresses and publication status", async () => {
  const database = new PGlite();
  try {
    await database.exec(`CREATE TYPE "ListingStatus" AS ENUM ('PUBLISHED','PENDING');
      CREATE TABLE "Property" (id text, "ownerId" text, "createdAt" timestamp DEFAULT NOW(), "publishedAt" timestamp, status "ListingStatus", values jsonb);
      CREATE TABLE "AppUser" (id text, name text);`);
    const fixtures = [
      [
        "city",
        { kota_kabupaten_kode: "32.75", kota_kabupaten: "Kota Bekasi" },
        "PUBLISHED",
      ],
      [
        "district",
        { kota_kabupaten_kode: "32.16", kecamatan: "Cikarang Utara" },
        "PUBLISHED",
      ],
      ["district-only", { kecamatan: "Cikarang Selatan" }, "PUBLISHED"],
      ["legacy-cikarang", { lokasi: "Jalan Cikarang" }, "PUBLISHED"],
      ["legacy", { lokasi: "Jalan Raya Kali CBL Bekasi" }, "PUBLISHED"],
      [
        "wrong-city",
        {
          kota_kabupaten_kode: "32.01",
          kota_kabupaten: "Kabupaten Bogor",
          lokasi: "Jalan Bekasi Cikarang",
        },
        "PUBLISHED",
      ],
      [
        "wrong-label",
        { kota_kabupaten: "Kabupaten Bogor", lokasi: "Dekat Bekasi Cikarang" },
        "PUBLISHED",
      ],
      [
        "karawang",
        { kota_kabupaten: "Kabupaten Karawang", kecamatan: "Klari" },
        "PUBLISHED",
      ],
      [
        "cikampek",
        { kota_kabupaten_kode: "32.15", kecamatan: "Cikampek" },
        "PUBLISHED",
      ],
      [
        "legacy-cikampek",
        { lokasi: "Jalan Raya Kotabaru Cikampek" },
        "PUBLISHED",
      ],
      [
        "not-subdistrict",
        {
          kota_kabupaten: "Bekasi",
          kecamatan: "Sukatani",
          lokasi: "Jalan Cikarang",
        },
        "PUBLISHED",
      ],
      [
        "pending",
        { kota_kabupaten: "Bekasi", kecamatan: "Cikarang Utara" },
        "PENDING",
      ],
      ["substring", { lokasi: "Bekasiku Cikarangku" }, "PUBLISHED"],
    ] as const;
    for (const [id, values, status] of fixtures)
      await database.query(
        'INSERT INTO "Property" (id,values,status) VALUES ($1,$2,$3)',
        [id, JSON.stringify(values), status],
      );
    for (const [slug, expected] of Object.entries({
      bekasi: [
        "city",
        "district",
        "district-only",
        "legacy-cikarang",
        "legacy",
        "not-subdistrict",
      ],
      cikarang: ["district", "district-only", "legacy-cikarang"],
      karawang: ["karawang", "cikampek", "legacy-cikampek"],
      cikampek: ["cikampek", "legacy-cikampek"],
      "cikarang-utara": ["district"],
      "cikarang-selatan": ["district-only"],
      klari: ["karawang"],
      tambun: [],
    })) {
      const q = areaQueries(findArea(slug)!);
      const rows = await database.query<{ id: string }>(
        q.list.text,
        q.list.values,
      );
      assert.deepEqual(
        rows.rows.map((r) => r.id).sort(),
        expected.sort(),
        slug,
      );
      const counts = await database.query<{ count: number }>(
        q.count.text,
        q.count.values,
      );
      assert.equal(Number(counts.rows[0].count), expected.length);
    }
    const q = areaQueries(findArea("bekasi")!, 2);
    assert.equal(
      (await database.query(q.list.text, q.list.values)).rows.length,
      0,
    );
    assert.equal(findArea("bogor"), undefined);
    await database.query(
      `UPDATE "Property" SET values = values || '{"jenis":"Rumah","transaksi":"Over Kredit"}' WHERE id = 'district'`,
    );
    const over = areaQueries(
      findArea("cikarang")!,
      1,
      undefined,
      findCategory("over-kredit"),
    );
    assert.deepEqual(
      (
        await database.query<{ id: string }>(over.list.text, over.list.values)
      ).rows.map((r) => r.id),
      ["district"],
    );
    const dijual = areaQueries(
      findArea("cikarang")!,
      1,
      undefined,
      findCategory("rumah-dijual"),
    );
    assert.equal(
      (await database.query(dijual.list.text, dijual.list.values)).rows.length,
      0,
    );
  } finally {
    await database.close();
  }
});
