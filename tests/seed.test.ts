import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createConnection } from "node:net";
import { once } from "node:events";
import { spawn } from "node:child_process";
import { WebSocketServer, WebSocket } from "ws";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { defaultFields } from "../lib/demo";

test(
  "seed writes through the actual Neon WebSocket adapter and preserves existing records on repeat",
  { timeout: 60000 },
  async () => {
    const database = await PGlite.create();
    const postgres = new PGLiteSocketServer({
      db: database,
      host: "127.0.0.1",
      port: 0,
    });
    const proxy = new WebSocketServer({ host: "127.0.0.1", port: 0 });
    const cwd = await mkdtemp(join(tmpdir(), "mrpro-seed-"));
    try {
      if (!proxy.address()) await once(proxy, "listening");
      await database.exec(
        await readFile(
          "prisma/migrations/202610170001_initial/migration.sql",
          "utf8",
        ),
      );
      await postgres.start();
      const databaseUrl = new URL(
        `postgresql://postgres:postgres@${postgres.getServerConn()}/postgres`,
      );
      let connections = 0;
      proxy.on("connection", (websocket) => {
        connections++;
        const tcp = createConnection({
          host: databaseUrl.hostname,
          port: Number(databaseUrl.port),
        });
        websocket.on("message", (data) => {
          const bytes = Array.isArray(data)
            ? Buffer.concat(data)
            : Buffer.from(data as ArrayBuffer);
          // A real PostgreSQL server closes the transport on Terminate (X).
          if (bytes.length === 5 && bytes[0] === 0x58) {
            tcp.destroy();
            websocket.close();
            return;
          }
          tcp.write(bytes);
        });
        tcp.on("data", (bytes) => {
          if (websocket.readyState === WebSocket.OPEN) websocket.send(bytes);
        });
        tcp.on("error", () => websocket.close());
        tcp.on("close", () => websocket.close());
        websocket.on("close", () => tcp.destroy());
        websocket.on("error", () => tcp.destroy());
      });
      const address = proxy.address();
      assert.ok(address && typeof address === "object");
      async function seed() {
        const result = await new Promise<{
          code: number | null;
          stdout: string;
          stderr: string;
        }>((resolveResult, reject) => {
          const child = spawn(
            process.execPath,
            [
              resolve("node_modules/tsx/dist/cli.mjs"),
              resolve("scripts/seed.ts"),
            ],
            {
              cwd,
              env: {
                ...process.env,
                NODE_OPTIONS: [
                  process.env.NODE_OPTIONS,
                  `--require=${JSON.stringify(resolve("tests/fixtures/seed-websocket.cjs"))}`,
                ]
                  .filter(Boolean)
                  .join(" "),
                DATABASE_URL: databaseUrl.href,
                MR_TEST_WEBSOCKET_PROXY: `127.0.0.1:${(address as { port: number }).port}`,
              },
              stdio: ["ignore", "pipe", "pipe"],
            },
          );
          let stdout = "",
            stderr = "";
          const timer = setTimeout(() => {
            child.kill();
            reject(new Error("Seed timed out."));
          }, 20000);
          child.stdout.on("data", (chunk) => {
            stdout += chunk;
          });
          child.stderr.on("data", (chunk) => {
            stderr += chunk;
          });
          child.on("error", (error) => {
            clearTimeout(timer);
            reject(error);
          });
          child.on("close", (code) => {
            clearTimeout(timer);
            resolveResult({ code, stdout, stderr });
          });
        });
        assert.equal(result.code, 0, result.stderr);
        assert.match(result.stdout, /Field awal dan pengaturan tersimpan/);
      }
      await seed();
      assert.ok(
        connections > 0,
        "The seed must use a real WebSocket connection.",
      );
      assert.equal(
        (await database.query('SELECT * FROM "PropertyField"')).rows.length,
        defaultFields.length,
      );
      assert.equal(
        (await database.query('SELECT * FROM "SiteSettings"')).rows.length,
        1,
      );
      await database.query('UPDATE "PropertyField" SET name=$1 WHERE key=$2', [
        "Harga pengelola",
        "harga",
      ]);
      await database.query(
        'UPDATE "SiteSettings" SET "heroTitle"=$1 WHERE id=$2',
        ["Judul pengelola", "main"],
      );
      await database.exec(`INSERT INTO "AppUser" (id,"authId",name,email) VALUES ('owner','auth-owner','Owner','owner@example.test');
    INSERT INTO "Property" (id,slug,title,description,gallery,whatsapp,"ownerId","updatedAt") VALUES ('listing','rumah','Rumah pemilik','Data pemilik',ARRAY[]::text[],'628123456789','owner',NOW());`);
      await seed();
      assert.equal(
        (await database.query('SELECT * FROM "PropertyField"')).rows.length,
        defaultFields.length,
      );
      assert.equal(
        (
          await database.query<{ name: string }>(
            'SELECT name FROM "PropertyField" WHERE key=$1',
            ["harga"],
          )
        ).rows[0].name,
        "Harga pengelola",
      );
      assert.equal(
        (
          await database.query<{ heroTitle: string }>(
            'SELECT "heroTitle" FROM "SiteSettings" WHERE id=$1',
            ["main"],
          )
        ).rows[0].heroTitle,
        "Judul pengelola",
      );
      assert.equal(
        (await database.query('SELECT * FROM "AppUser"')).rows.length,
        1,
      );
      assert.equal(
        (await database.query('SELECT * FROM "Property"')).rows.length,
        1,
      );
    } finally {
      for (const client of proxy.clients) client.terminate();
      await new Promise<void>((done) => proxy.close(() => done()));
      await postgres.stop();
      await database.close();
      await rm(cwd, { recursive: true, force: true });
    }
  },
);
