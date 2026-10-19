import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { catalogQueries } from "../lib/catalog-query";
test("catalog SQL filters, sorts and paginates published properties without exposing private field searches", async () => {
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
    for (let i = 0; i < 15; i++)
      await db.query(
        'INSERT INTO "Property" (id,slug,title,description,gallery,whatsapp,"ownerId","updatedAt",status,"values") VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),$8,$9)',
        [
          `p${i}`,
          `rumah-${i}`,
          "Rumah Nyaman",
          "Deskripsi",
          ["foto"],
          "628123456789",
          "u",
          i === 14 ? "PENDING" : "PUBLISHED",
          JSON.stringify({
            harga: 100 + i * 10,
            lokasi: "Bintaro",
            jenis: "Rumah",
            transaksi: "Dijual",
          }),
        ],
      );
    const visible = new Set(["harga", "lokasi", "jenis", "transaksi"]);
    const run = async (params: Record<string, string>, fields = visible) => {
      const q = catalogQueries(params, fields);
      return db.query<{ id: string; ownerName: string }>(
        q.list.text,
        q.list.values,
      );
    };
    assert.equal((await run({})).rows.length, 12);
    assert.equal((await run({})).rows[0].ownerName, "User");
    assert.equal("email" in (await run({})).rows[0], false);
    assert.equal((await run({ page: "2" })).rows.length, 2);
    assert.equal(
      (
        await run({
          q: "bintaro",
          harga: "120",
          jenis: "Rumah",
          transaksi: "Dijual",
        })
      ).rows.length,
      3,
    );
    assert.equal((await run({ urut: "termurah" })).rows[0].id, "p0");
    assert.equal((await run({ q: "' OR TRUE; --" })).rows.length, 0);
    assert.equal(
      (await run({ q: "Bintaro" }, new Set(["harga"]))).rows.length,
      0,
    );
    assert.equal((await run({ harga: "NaN" })).rows.length, 0);
    assert.equal((await run({ jenis: "Apartemen" })).rows.length, 0);
    const q = catalogQueries({}, visible);
    const count = await db.query<{ count: number }>(
      q.count.text,
      q.count.values,
    );
    assert.equal(Number(count.rows[0].count), 14);
    await db.query(
      'UPDATE "Property" SET "values" = "values" || $1::jsonb WHERE id = $2',
      [
        JSON.stringify({ nama_proyek: "Taman Melati", proyek: "Citra Asri" }),
        "p0",
      ],
    );
    for (const [key, name] of [
      ["nama_proyek", "melati"],
      ["proyek", "citra"],
    ]) {
      assert.equal(
        (await run({ q: name }, new Set([...visible, key]))).rows[0].id,
        "p0",
      );
      assert.equal(
        (await run({ q: name })).rows.length,
        0,
        "private project values must not be searchable",
      );
    }
  } finally {
    await db.close();
  }
});
