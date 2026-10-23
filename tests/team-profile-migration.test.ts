import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("team profile migration preserves existing identities, photos, experience and visibility", async () => {
  const db = await PGlite.create();
  try {
    const migration = "202610230001_team_profiles";
    for (const name of (await readdir("prisma/migrations"))
      .filter((n) => /^20/.test(n) && n < migration)
      .sort())
      await db.exec(
        await readFile(`prisma/migrations/${name}/migration.sql`, "utf8"),
      );
    await db.exec(`INSERT INTO "AppUser" (id,name,email,"passwordHash") VALUES ('owner','Owner','owner@example.test','unused');
      INSERT INTO "Media" (id,key,"ownerId") VALUES ('old-photo','old.webp','owner');
      INSERT INTO "TeamMember" (id,name,expertise,experience,"photoId",active,"updatedAt") VALUES ('old','Nama lama','AC','Pengalaman lama yang utuh.','old-photo',false,NOW());`);
    await db.exec(
      await readFile(`prisma/migrations/${migration}/migration.sql`, "utf8"),
    );
    const row = (
      await db.query<{
        id: string;
        photoId: string;
        experience: string;
        active: boolean;
        description: string;
        fullProfile: string;
        position: number;
      }>('SELECT * FROM "TeamMember"')
    ).rows[0];
    assert.equal(row.id, "old");
    assert.equal(row.photoId, "old-photo");
    assert.equal(row.experience, "Pengalaman lama yang utuh.");
    assert.equal(row.active, false);
    assert.equal(row.description, "");
    assert.equal(row.fullProfile, "");
    assert.equal(row.position, 0);
    await assert.rejects(
      db.exec('UPDATE "TeamMember" SET position=-1'),
      /check/,
    );
  } finally {
    await db.close();
  }
});
