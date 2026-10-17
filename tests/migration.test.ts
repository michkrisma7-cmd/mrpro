import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("initial PostgreSQL migration preserves role defaults, moderation and ownership constraints", async () => {
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
      ["u1", "neon-1", "User", "user@example.com"],
    );
    const user = await db.query<{ role: string }>('SELECT role FROM "AppUser"');
    assert.equal(user.rows[0].role, "USER");
    await db.query(
      'INSERT INTO "Property" (id,slug,title,description,gallery,whatsapp,"ownerId","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())',
      [
        "p1",
        "rumah-1",
        "Rumah nyaman",
        "Deskripsi lengkap",
        ["/api/media/m1"],
        "628123456789",
        "u1",
      ],
    );
    const p = await db.query<{ status: string; values: unknown }>(
      'SELECT status,"values" FROM "Property"',
    );
    assert.equal(p.rows[0].status, "PENDING");
    assert.deepEqual(p.rows[0].values, {});
    await assert.rejects(
      db.query('UPDATE "Property" SET "ownerId"=$1', ["unknown"]),
      /foreign key/,
    );
    await assert.rejects(
      db.query('UPDATE "AppUser" SET role=$1', ["SUPERADMIN"]),
      /invalid input value/,
    );
    await assert.rejects(
      db.query(
        'INSERT INTO "AppUser" (id,"authId",name,email) VALUES ($1,$2,$3,$4)',
        ["u2", "neon-1", "Other", "other@example.com"],
      ),
      /unique constraint/,
    );
  } finally {
    await db.close();
  }
});
