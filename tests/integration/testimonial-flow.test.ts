import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import { createServer as createSocket } from "node:net";
import {
  setImmediate as nextTurn,
  setTimeout as delay,
} from "node:timers/promises";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { chromium, expect } from "@playwright/test";
import sharp from "sharp";
import { hashPassword } from "../../lib/password";

test(
  "testimonial seeds, admin editing, photo upload, rating and public visibility work together",
  { timeout: 180000 },
  async () => {
    const database = await PGlite.create();
    const postgres = new PGLiteSocketServer({
      db: database,
      host: "127.0.0.1",
      port: 0,
      maxConnections: 20,
    });
    const objects = new Map<string, Buffer>();
    // Local S3 fixture: exercise image decoding, upload, DB ownership and media delivery without cloud credentials.
    const storage = createServer(async (req, res) => {
      const key = new URL(req.url!, "http://fixture").pathname;
      if (req.method === "PUT") {
        const chunks = [];
        for await (const chunk of req) chunks.push(Buffer.from(chunk));
        objects.set(key, Buffer.concat(chunks));
        res.writeHead(200, { ETag: '"fixture"' });
        res.end();
      } else if (req.method === "GET" && objects.has(key)) {
        res.writeHead(200, { "Content-Type": "image/webp" });
        res.end(objects.get(key));
      } else if (req.method === "DELETE") {
        objects.delete(key);
        res.writeHead(204);
        res.end();
      } else {
        res.writeHead(404);
        res.end();
      }
    });
    let child: ReturnType<typeof spawn> | undefined;
    let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
    let logs = "";
    try {
      for (const name of (await readdir("prisma/migrations"))
        .filter((n) => /^20/.test(n))
        .sort())
        await database.exec(
          await readFile(`prisma/migrations/${name}/migration.sql`, "utf8"),
        );
      assert.deepEqual(
        (
          await database.query<{ name: string }>(
            'SELECT name FROM "Testimonial" ORDER BY position',
          )
        ).rows.map((row) => row.name),
        ["Ahmad Rizky", "Indah Permatasari", "Ani Suliasih"],
      );
      const hash = await hashPassword("team-test-password");
      await database.query(
        'INSERT INTO "AppUser" (id,name,email,"passwordHash",role) VALUES ($1,$2,$3,$4,\'ADMIN\')',
        ["team-admin", "Admin Tim", "team@example.test", hash],
      );
      await postgres.start();
      storage.listen(0, "127.0.0.1");
      await once(storage, "listening");
      const storageAddress = storage.address();
      assert.ok(storageAddress && typeof storageAddress === "object");
      const listener = createSocket().listen(0, "127.0.0.1");
      await once(listener, "listening");
      const address = listener.address();
      assert.ok(address && typeof address === "object");
      const port = address.port;
      await new Promise<void>((r) => listener.close(() => r()));
      const origin = `http://127.0.0.1:${port}`;
      child = spawn(
        process.execPath,
        [
          "node_modules/next/dist/bin/next",
          "start",
          "--hostname",
          "127.0.0.1",
          "--port",
          String(port),
        ],
        {
          env: {
            ...process.env,
            DATABASE_URL: `postgresql://postgres:postgres@${postgres.getServerConn()}/postgres`,
            AUTH_SECRET: "isolated-team-test-secret-".repeat(3),
            NEXT_PUBLIC_SITE_URL: origin,
            AWS_ENDPOINT_URL_S3: `http://127.0.0.1:${storageAddress.port}`,
            AWS_ACCESS_KEY_ID: "fixture-only",
            AWS_SECRET_ACCESS_KEY: "fixture-only",
            AWS_REGION: "us-east-1",
            AWS_S3_BUCKET: "team-test",
            NEXT_TELEMETRY_DISABLED: "1",
          },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      child.stdout!.on("data", (chunk) => (logs += chunk));
      child.stderr!.on("data", (chunk) => (logs += chunk));
      let ready = false;
      for (let i = 0; i < 100; i++) {
        try {
          if ((await fetch(`${origin}/api/health`)).ok) {
            ready = true;
            break;
          }
        } catch {}
        if (child.exitCode !== null) throw Error(logs);
        await delay(250);
      }
      assert.ok(ready, "production server started");
      browser = await chromium.launch({
        executablePath:
          process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || "/usr/bin/chromium",
        args: ["--no-sandbox"],
      });
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
      });
      const client = context.request;
      const { csrfToken } = await (
        await client.get(`${origin}/api/auth/csrf`)
      ).json();
      await client.post(`${origin}/api/auth/callback/credentials`, {
        form: {
          email: "team@example.test",
          password: "team-test-password",
          csrfToken,
          callbackUrl: `${origin}/admin`,
        },
        headers: { "X-Auth-Return-Redirect": "1", origin },
      });
      assert.equal(
        (await (await client.get(`${origin}/api/auth/session`)).json()).user
          .email,
        "team@example.test",
      );
      const page = await context.newPage();
      await page.goto(`${origin}/admin?tab=testimoni&edit=testimonial-kpr`);
      await page
        .getByLabel("Isi testimoni")
        .fill(
          "Pendampingan KPR ramah dan komunikatif dari awal hingga serah terima.",
        );
      await page.getByRole("button", { name: "Simpan Testimoni" }).click();
      await expect(page.getByRole("status")).toHaveText(
        "Testimoni berhasil disimpan.",
      );
      await page.goto(`${origin}/admin?tab=testimoni&edit=baru`);
      await expect(
        page.getByRole("heading", { name: "Tambah testimoni", exact: true }),
      ).toBeVisible();
      await page.getByLabel("Nama", { exact: true }).fill("Budi Santoso");
      await page.getByLabel("Kategori").fill("Pembeli Rumah");
      await page.getByLabel("Status konsumen").fill("Pembeli rumah di Bekasi");
      await page.getByLabel("Urutan tampil").fill("0");
      await page
        .getByLabel("Isi testimoni")
        .fill(
          "Berpengalaman 10 tahun menangani instalasi rumah.\nPemasangan dan perawatan AC.",
        );
      const photo = await sharp({
        create: { width: 80, height: 100, channels: 3, background: "#526c46" },
      })
        .png()
        .toBuffer();
      await page.getByLabel("Foto konsumen").setInputFiles({
        name: "budi.png",
        mimeType: "image/png",
        buffer: photo,
      });
      await expect(page.getByAltText("Pratinjau foto konsumen")).toBeVisible();
      await page.getByRole("button", { name: "Simpan Testimoni" }).click();
      await expect(page.getByRole("status")).toHaveText(
        "Testimoni berhasil disimpan.",
      );
      const rows = await database.query<{ id: string; photoId: string }>(
        `SELECT id,"photoId" FROM "Testimonial" WHERE name='Budi Santoso'`,
      );
      assert.equal(rows.rows.length, 1);
      const member = rows.rows[0];
      assert.equal(objects.size, 1);
      assert.equal(
        (await sharp([...objects.values()][0]).metadata()).format,
        "webp",
      );
      const mediaUrl = `${origin}/api/media/${member.photoId}`;
      const publicPhoto = await fetch(mediaUrl);
      assert.equal(publicPhoto.status, 200);
      assert.equal(publicPhoto.headers.get("content-type"), "image/webp");
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`${origin}/#testimoni`);
        await expect(
          page
            .locator(".testimonial-card figcaption strong")
            .filter({ hasText: "Budi Santoso" }),
        ).toBeVisible();
        const card = page
          .locator(".testimonial-card")
          .filter({ hasText: "Budi Santoso" });
        await expect(card).toContainText("Pembeli Rumah");
        await expect(
          card.getByRole("img", { name: "5 dari 5 bintang" }),
        ).toBeVisible();
        const photoBox = (await card
          .locator(".testimonial-avatar")
          .boundingBox())!;
        const copyBox = (await card.locator("blockquote").boundingBox())!;
        assert.ok(photoBox.x > copyBox.x + copyBox.width);
        assert.ok(
          (await page.locator("#testimoni").boundingBox())!.y >=
            (await page.locator("#blog").boundingBox())!.y +
              (await page.locator("#blog").boundingBox())!.height,
        );
        await page
          .locator("#testimoni")
          .screenshot({ path: `/tmp/mrpro-testimonials-${width}.png` });
        await expect(card).toContainText("Berpengalaman 10 tahun");
        await expect(page.getByAltText("Foto Budi Santoso")).toBeVisible();
        assert.equal(
          await page
            .getByAltText("Foto Budi Santoso")
            .evaluate(
              (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
            ),
          true,
        );
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        );
      }
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto(`${origin}/admin?tab=testimoni&edit=${member.id}`);
      await page.getByLabel("Nama", { exact: true }).fill("Budi Pratama");
      await page.locator('select[name="rating"]').selectOption("4");
      await page.getByLabel("Tampilkan di beranda").uncheck();
      await page.getByRole("button", { name: "Simpan Testimoni" }).click();
      await expect(page.getByRole("status")).toHaveText(
        "Testimoni berhasil disimpan.",
      );
      assert.equal(
        (
          await database.query<{ rating: number }>(
            'SELECT rating FROM "Testimonial" WHERE id=$1',
            [member.id],
          )
        ).rows[0].rating,
        4,
      );
      const hidden = await (await fetch(`${origin}/#testimoni`)).text();
      assert.ok(!hidden.includes("Budi Pratama"));
      assert.equal((await fetch(mediaUrl)).status, 404);
      assert.equal((await client.get(mediaUrl)).status(), 200);
      await database.exec(
        "UPDATE \"AppUser\" SET role='USER' WHERE id='team-admin'",
      );
      await page.goto(`${origin}/admin?tab=testimoni`);
      await expect(
        page.getByRole("heading", { name: "Akses khusus administrator." }),
      ).toBeVisible();
      await database.exec(
        "UPDATE \"AppUser\" SET role='ADMIN' WHERE id='team-admin'",
      );
      await page.goto(`${origin}/admin?tab=testimoni&edit=${member.id}`);
      page.once("dialog", (dialog) => dialog.accept());
      await page.getByRole("button", { name: "Hapus Testimoni" }).click();
      await expect(page.getByRole("status")).toHaveText(
        "Testimoni berhasil dihapus.",
      );
      assert.equal(
        (await database.query('SELECT * FROM "Testimonial"')).rows.length,
        3,
      );
      assert.equal((await fetch(mediaUrl)).status, 404);
      assert.equal(
        objects.size,
        1,
        "deleting a profile preserves shared media",
      );
      await database.exec('UPDATE "Testimonial" SET active=false');
      await page.goto(`${origin}/`);
      await expect(page.locator("#testimoni")).toHaveCount(0);
      await context.close();
    } catch (error) {
      console.error(logs.slice(-5000));
      throw error;
    } finally {
      await browser?.close();
      if (child && child.exitCode === null && child.signalCode === null) {
        const exited = once(child, "exit");
        child.kill("SIGTERM");
        await exited;
      }
      await new Promise<void>((r) => storage.close(() => r()));
      // Wait for child sockets to detach: pglite-socket defers close handlers.
      for (let i = 0; postgres.getStats().activeConnections > 0 && i < 100; i++)
        await delay(10);
      await postgres.stop();
      for (let i = 0; postgres.getStats().queuedQueries > 0 && i < 100; i++)
        await delay(10);
      await database.runExclusive(async () => {});
      await nextTurn();
      await nextTurn();
      await database.close();
    }
  },
);
