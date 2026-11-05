import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("Over Kredit migration preserves existing options, settings and listing values on repeat", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      await readFile(
        "prisma/migrations/202610170001_initial/migration.sql",
        "utf8",
      ),
    );
    await db.exec(`
      INSERT INTO "PropertyField" (id,key,name,type,options,required,"showOnCard") VALUES
        ('transaksi','transaksi','Pilih properti','SELECT',ARRAY['Disewa','Dijual','Lelang'],true,true),
        ('jenis','jenis','Jenis','SELECT',ARRAY['Rumah'],false,false);
      INSERT INTO "AppUser" (id,"authId",name,email) VALUES ('owner','auth-owner','Owner','owner@example.test');
      INSERT INTO "Property" (id,slug,title,description,gallery,whatsapp,"ownerId","values","updatedAt") VALUES
        ('sale','sale','Rumah Dijual','Deskripsi',ARRAY[]::text[],'','owner','{"transaksi":"Dijual","harga":100}',NOW()),
        ('rent','rent','Rumah Disewa','Deskripsi',ARRAY[]::text[],'','owner','{"transaksi":"Disewa","harga":50}',NOW());
    `);
    const before = await db.query('SELECT * FROM "Property" ORDER BY id');
    const migration = await readFile(
      "prisma/migrations/202611050001_over_kredit/migration.sql",
      "utf8",
    );
    await db.exec(migration);
    await db.exec(migration);
    const fields = await db.query<{
      key: string;
      name: string;
      options: string[];
      required: boolean;
    }>('SELECT * FROM "PropertyField" ORDER BY key');
    assert.deepEqual(fields.rows[0].options, ["Rumah"]);
    assert.deepEqual(fields.rows[1].options, [
      "Disewa",
      "Dijual",
      "Lelang",
      "Over Kredit",
    ]);
    assert.equal(fields.rows[1].name, "Pilih properti");
    assert.equal(fields.rows[1].required, true);
    assert.deepEqual(
      (await db.query('SELECT * FROM "Property" ORDER BY id')).rows,
      before.rows,
    );
  } finally {
    await db.close();
  }
});
