import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { rotationDayNumber, rotationDirection } from "../lib/listing-rotation";
import { catalogQueries } from "../lib/catalog-query";
import { areaQueries } from "../lib/area-query";
import { findArea } from "../lib/areas";

test("rotasi harian bergantian ASC/DESC berdasarkan tanggal WIB", () => {
  // 2026-01-01 00:00 WIB = hari ke-0 (genap → ASC)
  assert.equal(rotationDayNumber(new Date("2025-12-31T17:00:00Z")), 0);
  assert.equal(rotationDirection(new Date("2025-12-31T17:00:00Z")), "asc");
  // Masih 31 Des di WIB satu detik sebelumnya
  assert.equal(rotationDayNumber(new Date("2025-12-31T16:59:59Z")), -1);
  // 21 Nov 2026 WIB = hari ke-324 (genap), 22 Nov = 325 (ganjil)
  assert.equal(rotationDayNumber(new Date("2026-11-21T05:00:00+07:00")), 324);
  assert.equal(rotationDirection(new Date("2026-11-21T23:59:59+07:00")), "asc");
  assert.equal(
    rotationDirection(new Date("2026-11-22T00:00:00+07:00")),
    "desc",
  );
  assert.equal(rotationDirection(new Date("2026-11-23T00:00:00+07:00")), "asc");
});

test("LISTING_ROTATION_FORCE memaksa arah untuk uji simulasi", () => {
  const prev = process.env.LISTING_ROTATION_FORCE;
  try {
    process.env.LISTING_ROTATION_FORCE = "desc";
    assert.equal(
      rotationDirection(new Date("2026-11-21T12:00:00+07:00")),
      "desc",
    );
    process.env.LISTING_ROTATION_FORCE = "salah";
    assert.equal(
      rotationDirection(new Date("2026-11-21T12:00:00+07:00")),
      "asc",
    );
  } finally {
    if (prev === undefined) delete process.env.LISTING_ROTATION_FORCE;
    else process.env.LISTING_ROTATION_FORCE = prev;
  }
});

test("SQL katalog & wilayah membalik urutan sesuai arah, pilihan pengguna tetap dihormati", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      await readFile(
        "prisma/migrations/202610170001_initial/migration.sql",
        "utf8",
      ),
    );
    await db.query(
      'INSERT INTO "AppUser" (id,"authId",name,email) VALUES ($1,$2,$3,$4)',
      ["u", "n", "User", "user@test.id"],
    );
    for (let i = 0; i < 4; i++)
      await db.query(
        `INSERT INTO "Property" (id,slug,title,description,gallery,whatsapp,"ownerId","updatedAt","createdAt",status,"values") VALUES ($1,$2,'Rumah','D',$3,'628','u',NOW(),$4,'PUBLISHED',$5)`,
        [
          `p${i}`,
          `r-${i}`,
          ["f"],
          new Date(Date.UTC(2026, 0, 1 + i)),
          JSON.stringify({
            harga: 400 - i * 100,
            kota_kabupaten: "Kabupaten Bekasi",
            kecamatan: "Cikarang Utara",
          }),
        ],
      );
    const visible = new Set(["harga", "kota_kabupaten", "kecamatan"]);
    const ids = async (q: { text: string; values: unknown[] }) =>
      (await db.query<{ id: string }>(q.text, q.values)).rows.map((r) => r.id);

    assert.deepEqual(await ids(catalogQueries({ arah: "asc" }, visible).list), [
      "p0",
      "p1",
      "p2",
      "p3",
    ]);
    assert.deepEqual(
      await ids(catalogQueries({ arah: "desc" }, visible).list),
      ["p3", "p2", "p1", "p0"],
    );
    // Pilihan eksplisit tidak ikut rotasi
    assert.deepEqual(
      await ids(catalogQueries({ urut: "terbaru", arah: "asc" }, visible).list),
      ["p3", "p2", "p1", "p0"],
    );
    assert.deepEqual(
      await ids(
        catalogQueries({ urut: "termurah", arah: "desc" }, visible).list,
      ),
      ["p3", "p2", "p1", "p0"],
    );

    const area = findArea("bekasi");
    assert.ok(area);
    assert.deepEqual(await ids(areaQueries(area, 1, "asc").list), [
      "p0",
      "p1",
      "p2",
      "p3",
    ]);
    assert.deepEqual(await ids(areaQueries(area, 1, "desc").list), [
      "p3",
      "p2",
      "p1",
      "p0",
    ]);
  } finally {
    await db.close();
  }
});
