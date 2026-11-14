import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("YouTube migration preserves existing listing data and enforces safe video IDs", async () => {
  const database = await PGlite.create();
  try {
    const target = "202611140001_property_youtube";
    for (const name of (await readdir("prisma/migrations"))
      .filter((name) => /^20/.test(name) && name < target)
      .sort())
      await database.exec(
        await readFile(`prisma/migrations/${name}/migration.sql`, "utf8"),
      );
    await database.exec(`INSERT INTO "Property" (id,slug,title,description,gallery,whatsapp,status,"values","updatedAt") VALUES
      ('legacy','legacy','Rumah lama','Deskripsi lama',ARRAY['/api/media/oldmain','/images/legacy.webp'],'081234567890','PUBLISHED','{"hidden":"tetap"}',NOW());`);
    const before = (
      await database.query<Record<string, unknown>>('SELECT * FROM "Property"')
    ).rows[0];
    await database.exec(
      await readFile(`prisma/migrations/${target}/migration.sql`, "utf8"),
    );
    assert.deepEqual(
      (await database.query('SELECT * FROM "Property"')).rows[0],
      { ...before, youtubeVideoId: null },
    );
    for (const value of ["dQw4w9WgXcQ", "M7lc1UVf-VE", null]) {
      await database.query('UPDATE "Property" SET "youtubeVideoId"=$1', [
        value,
      ]);
      assert.equal(
        (
          await database.query<{ youtubeVideoId: string | null }>(
            'SELECT "youtubeVideoId" FROM "Property"',
          )
        ).rows[0].youtubeVideoId,
        value,
      );
    }
    await assert.rejects(
      database.query('UPDATE "Property" SET "youtubeVideoId"=$1', [
        '<iframe src="evil">',
      ]),
      /check constraint/,
    );
  } finally {
    await database.close();
  }
});
