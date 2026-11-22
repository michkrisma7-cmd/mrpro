import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import {
  rotationDayNumber,
  rotationRound,
  roundReversed,
  rotateIds,
} from "../lib/listing-rotation";
import { catalogQueries } from "../lib/catalog-query";
import { areaQueries } from "../lib/area-query";
import { findArea } from "../lib/areas";

test("putaran = hari sejak 2026-01-01 × 4 + slot 00/06/12/18 WIB", () => {
  assert.equal(rotationDayNumber(new Date("2025-12-31T17:00:00Z")), 0);
  assert.equal(rotationDayNumber(new Date("2025-12-31T16:59:59Z")), -1);
  assert.equal(rotationRound(new Date("2026-01-01T00:00:00+07:00")), 0);
  assert.equal(rotationRound(new Date("2026-01-01T05:59:59+07:00")), 0);
  assert.equal(rotationRound(new Date("2026-01-01T06:00:00+07:00")), 1);
  assert.equal(rotationRound(new Date("2026-01-01T12:00:00+07:00")), 2);
  assert.equal(rotationRound(new Date("2026-01-01T23:59:59+07:00")), 3);
  // 22 Nov 2026 = hari ke-325 (ganjil → tidak dibalik)
  assert.equal(rotationRound(new Date("2026-11-22T18:30:00+07:00")), 1303);
  assert.equal(roundReversed(1303), false);
  assert.equal(roundReversed(1296), true); // 21 Nov (hari 324, genap)
});

test("LISTING_ROTATION_ROUND memaksa putaran untuk simulasi", () => {
  const prev = process.env.LISTING_ROTATION_ROUND;
  try {
    process.env.LISTING_ROTATION_ROUND = "7";
    assert.equal(rotationRound(new Date("2026-11-21T12:00:00+07:00")), 7);
  } finally {
    if (prev === undefined) delete process.env.LISTING_ROTATION_ROUND;
    else process.env.LISTING_ROTATION_ROUND = prev;
  }
});

test("rotateIds: hari genap dibalik, tiap putaran bergeser melingkar", () => {
  const ids = ["a", "b", "c", "d", "e"];
  assert.deepEqual(rotateIds(ids, 0, 2), ["e", "d", "c", "b", "a"]);
  assert.deepEqual(rotateIds(ids, 1, 2), ["c", "b", "a", "e", "d"]);
  assert.deepEqual(rotateIds(ids, 4, 2), ["d", "e", "a", "b", "c"]); // hari 1: maju, offset 8 mod 5 = 3
});

async function setup() {
  const db = new PGlite();
  const dirs = (await readdir("prisma/migrations"))
    .filter((d) => /^\d/.test(d))
    .sort();
  for (const d of dirs)
    await db.exec(
      await readFile(`prisma/migrations/${d}/migration.sql`, "utf8"),
    );
  return db;
}

async function insert(
  db: PGlite,
  id: string,
  published: Date | null,
  created: Date,
  status = "PUBLISHED",
) {
  await db.query(
    `INSERT INTO "Property" (id,slug,title,description,gallery,whatsapp,"updatedAt","createdAt","publishedAt",status,"values") VALUES ($1,$2,'Rumah','D',$3,'628',NOW(),$4,$5,$6::"ListingStatus",$7)`,
    [
      id,
      `r-${id}`,
      ["f"],
      created,
      published,
      status,
      JSON.stringify({
        harga: 100,
        kota_kabupaten: "Kabupaten Bekasi",
        kecamatan: "Cikarang Utara",
      }),
    ],
  );
}

const visible = new Set(["harga", "kota_kabupaten", "kecamatan"]);

test("SQL rolling: listing baru di atas, sisanya sesuai rotateIds, tanpa duplikat antar halaman", async () => {
  const db = await setup();
  try {
    const old = Array.from(
      { length: 23 },
      (_, i) => `o${String(i).padStart(2, "0")}`,
    );
    for (const [i, id] of old.entries())
      await insert(db, id, null, new Date(Date.UTC(2026, 0, 1 + i)));
    const day = 86_400_000;
    // Baru: 1 hari & 3 hari lalu; tepat 8 hari lalu = bukan baru lagi.
    await insert(
      db,
      "n1",
      new Date(Date.now() - day),
      new Date(Date.UTC(2025, 0, 1)),
    );
    await insert(
      db,
      "n3",
      new Date(Date.now() - 3 * day),
      new Date(Date.now() - 3 * day),
    );
    await insert(
      db,
      "x8",
      new Date(Date.now() - 8 * day),
      new Date(Date.now() - 8 * day),
    );
    await insert(db, "arsip", new Date(), new Date(), "ARCHIVED");
    const baseOld = [...old, "x8"];
    const ids = async (q: { text: string; values: unknown[] }) =>
      (await db.query<{ id: string }>(q.text, q.values)).rows.map((r) => r.id);

    const seenTop = new Set<string>();
    for (let round = 1296; round < 1304; round++) {
      const p1 = await ids(
        catalogQueries({ putaran: String(round) }, visible).list,
      );
      const p2 = await ids(
        catalogQueries({ putaran: String(round), page: "2" }, visible).list,
      );
      const all = [...p1, ...p2];
      assert.deepEqual(all, ["n1", "n3", ...rotateIds(baseOld, round, 18)]);
      assert.equal(new Set(all).size, all.length);
      seenTop.add(all.slice(2, 7).join());
      const area = findArea("cikarang");
      assert.ok(area);
      assert.deepEqual(await ids(areaQueries(area, 1, round).list), p1);
    }
    assert.equal(seenTop.size, 8, "setiap putaran 5 teratas berbeda");

    // Pilihan pengguna tidak ikut rotasi.
    const terbaru = await ids(
      catalogQueries({ urut: "terbaru", putaran: "1300" }, visible).list,
    );
    assert.equal(terbaru[0], "n1");
  } finally {
    await db.close();
  }
});
