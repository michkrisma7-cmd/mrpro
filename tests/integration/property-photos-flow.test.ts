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
  "property cover survives uploads, deletion, database save and reopening on mobile and desktop",
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
      const hash = await hashPassword("team-test-password");
      await database.query(
        'INSERT INTO "AppUser" (id,name,email,"passwordHash",role) VALUES ($1,$2,$3,$4,\'USER\')',
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
      const photo = await sharp({
        create: { width: 100, height: 70, channels: 3, background: "#526c46" },
      })
        .png()
        .toBuffer();
      const file = (name: string) => ({
        name,
        mimeType: "image/png",
        buffer: photo,
      });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`${origin}/titip-properti`);
        await page.locator('[name="title"]').fill(`Rumah foto utama ${width}`);
        await page
          .locator('textarea[name="description"]')
          .fill(
            "Rumah dengan informasi lengkap untuk pengujian foto utama properti.",
          );
        await page.locator('[name="whatsapp"]').fill("081234567890");
        // The fixture may have no custom fields; fill any cached default required fields.
        if (await page.locator('[name="field_harga"]').count()) {
          await page.locator('[name="field_harga"]').fill("1850000000");
          await page.locator('[name="field_lokasi"]').fill("Bintaro");
          await page.locator('[name="field_jenis"]').selectOption("Rumah");
          await page.locator('[name="field_transaksi"]').selectOption("Dijual");
        }
        // Delay upload responses to test choosing a stable local photo while uploads finish.
        let uploadNumber = 0;
        await page.unroute("**/api/upload");
        await page.route("**/api/upload", async (route) => {
          const number = uploadNumber++;
          const response = await route.fetch();
          await delay(number === 0 ? 800 : 200);
          await route.fulfill({ response });
        });
        await page
          .locator('input[type="file"]')
          .setInputFiles([
            file("first.png"),
            file("second.png"),
            file("third.png"),
          ]);
        const cards = page.locator(".property-photo");
        await expect(cards).toHaveCount(3);
        await expect(cards.nth(0)).toHaveClass(/is-primary/);
        await cards
          .nth(1)
          .getByRole("button", { name: "Jadikan Foto Utama" })
          .click();
        await expect(cards.nth(1)).toHaveClass(/is-primary/);
        await expect(page.locator('[name="photosReady"]')).toHaveValue("1");
        const chosen = JSON.parse(
          await page.locator('[name="gallery"]').inputValue(),
        )[0];
        const hit = await cards
          .nth(0)
          .getByRole("button", { name: "Jadikan Foto Utama" })
          .boundingBox();
        assert.ok(hit && hit.height >= 44 && hit.width >= 44);
        await page
          .locator('input[type="file"]')
          .setInputFiles(file("fourth.png"));
        await expect(cards).toHaveCount(4);
        await expect(page.locator('[name="photosReady"]')).toHaveValue("1");
        assert.equal(
          JSON.parse(await page.locator('[name="gallery"]').inputValue())[0],
          chosen,
        );
        await cards
          .nth(1)
          .getByRole("button", { name: "Hapus foto 2" })
          .click();
        await expect(cards.nth(0)).toHaveClass(/is-primary/);
        await cards
          .nth(1)
          .getByRole("button", { name: "Jadikan Foto Utama" })
          .click();
        const finalGallery = JSON.parse(
          await page.locator('[name="gallery"]').inputValue(),
        );
        assert.equal(
          await page.locator('[name="title"]').inputValue(),
          `Rumah foto utama ${width}`,
        );
        await page
          .locator(".property-photos")
          .screenshot({ path: `work/property-photos-${width}.png` });
        await page.locator('.submit-area input[type="checkbox"]').check();
        await page.getByRole("button", { name: "Tayangkan Properti" }).click();
        await expect(page).toHaveURL(/akun\?terkirim=1/);
        const result = await database.query<{
          id: string;
          slug: string;
          gallery: string[];
        }>('SELECT id,slug,gallery FROM "Property" WHERE title=$1', [
          `Rumah foto utama ${width}`,
        ]);
        const listing = result.rows[0];
        assert.deepEqual(listing.gallery, finalGallery);
        const verifyPublic = async (gallery: string[]) => {
          const cover = gallery[0];
          await page.goto(`${origin}/properti`);
          await expect(
            page
              .locator(`.property-card a[href="/properti/${listing.slug}"]`)
              .first(),
          ).toBeVisible();
          const card = page.locator(".property-card").filter({
            has: page.locator(`a[href="/properti/${listing.slug}"]`),
          });
          assert.ok(
            decodeURIComponent(
              (await card.locator("img").first().getAttribute("src"))!,
            ).includes(cover),
          );
          await page.goto(`${origin}/properti/${listing.slug}`);
          assert.ok(
            decodeURIComponent(
              (await page.locator(".gallery-main img").getAttribute("src"))!,
            ).includes(cover),
          );
          await expect(page.locator(".gallery-count")).toHaveText(
            `1 / ${gallery.length}`,
          );
          await expect(page.locator(".lightbox")).toHaveCount(0);
          await expect(page.locator(".detail-gallery")).toBeVisible();
          const frame = await page.locator(".detail-gallery").boundingBox();
          for (let index = 1; index < gallery.length; index++) {
            await page.getByRole("button", { name: "Foto berikutnya" }).click();
            await expect(page.locator(".gallery-count")).toHaveText(
              `${index + 1} / ${gallery.length}`,
            );
            assert.ok(
              decodeURIComponent(
                (await page.locator(".gallery-main img").getAttribute("src"))!,
              ).includes(gallery[index]),
            );
            await expect(page.locator(".detail-gallery")).toBeVisible();
            const nextFrame = await page
              .locator(".detail-gallery")
              .boundingBox();
            assert.equal(nextFrame!.width, frame!.width);
            assert.equal(nextFrame!.height, frame!.height);
          }
        };
        await verifyPublic(finalGallery);
        await page.goto(`${origin}/akun/properti/${listing.id}/foto`);
        await expect(cards.first()).toHaveClass(/is-primary/);
        await cards
          .nth(1)
          .getByRole("button", { name: "Jadikan Foto Utama" })
          .click();
        const edited = JSON.parse(
          await page.locator('[name="gallery"]').inputValue(),
        );
        await page
          .getByRole("button", { name: "Simpan foto properti" })
          .click();
        await expect(
          page.getByText("Foto properti disimpan.", { exact: true }),
        ).toBeVisible();
        await page.reload();
        assert.deepEqual(
          JSON.parse(await page.locator('[name="gallery"]').inputValue()),
          edited,
        );
        await verifyPublic(edited);
        await page.goto(`${origin}/akun/properti/${listing.id}/foto`);
        while (await cards.count())
          await cards
            .first()
            .getByRole("button", { name: /Hapus foto/ })
            .click();
        await expect(page.locator(".is-primary")).toHaveCount(0);
        await expect(page.locator('[name="gallery"]')).toHaveValue("[]");
        await expect(
          page.getByRole("button", { name: "Simpan foto properti" }),
        ).toBeDisabled();
        await page
          .locator('input[type="file"]')
          .setInputFiles(file("again.png"));
        await expect(cards.first()).toHaveClass(/is-primary/);
        await expect(page.locator('[name="photosReady"]')).toHaveValue("1");
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        );
      }
      assert.deepEqual(errors, []);
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
