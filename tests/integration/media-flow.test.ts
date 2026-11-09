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
import { displayImageKey } from "../../lib/image-variants";

test(
  "published gallery, legacy conversion, upload and private display delivery work against real routes",
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
    const reads: string[] = [];
    const writes: string[] = [];
    const storage = createServer(async (request, response) => {
      const key = new URL(request.url!, "http://fixture").pathname;
      if (request.method === "PUT") {
        const chunks: Buffer[] = [];
        for await (const chunk of request) chunks.push(Buffer.from(chunk));
        objects.set(key, Buffer.concat(chunks));
        writes.push(key);
        response.writeHead(200, { ETag: '"fixture"' }).end();
      } else if (request.method === "GET") {
        reads.push(key);
        if (objects.has(key))
          response
            .writeHead(200, { "Content-Type": "image/webp" })
            .end(objects.get(key));
        else response.writeHead(404).end();
      } else if (request.method === "DELETE") {
        objects.delete(key);
        response.writeHead(204).end();
      } else response.writeHead(405).end();
    });
    let child: ReturnType<typeof spawn> | undefined;
    let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
    let logs = "";
    try {
      for (const name of (await readdir("prisma/migrations"))
        .filter((name) => /^20/.test(name))
        .sort())
        await database.exec(
          await readFile(`prisma/migrations/${name}/migration.sql`, "utf8"),
        );
      await database.query(
        'INSERT INTO "AppUser" (id,name,email,"passwordHash") VALUES ($1,$2,$3,$4)',
        [
          "media-owner",
          "Owner",
          "owner@media.test",
          await hashPassword("media-test-password"),
        ],
      );
      const master = await sharp({
        create: {
          width: 1800,
          height: 1350,
          channels: 3,
          background: "orange",
        },
      })
        .webp({ lossless: true })
        .toBuffer();
      for (const id of ["media-first", "media-next", "media-private"]) {
        const key = `properties/media-owner/${id}.webp`;
        objects.set(`/media-test/${key}`, master);
        await database.query(
          'INSERT INTO "Media" (id,key,"ownerId") VALUES ($1,$2,$3)',
          [id, key, "media-owner"],
        );
      }
      const slug = `media-gallery-${crypto.randomUUID()}`;
      await database.query(
        'INSERT INTO "Property" (id,slug,title,description,gallery,whatsapp,"ownerId",status,"updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,\'PUBLISHED\',NOW())',
        [
          "media-listing",
          slug,
          "Media Gallery Fixture",
          "A property fixture for photo delivery.",
          ["/api/media/media-first", "/api/media/media-next"],
          "081234567890",
          "media-owner",
        ],
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
      await new Promise<void>((resolve) => listener.close(() => resolve()));
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
            AUTH_SECRET: "isolated-media-test-secret-".repeat(3),
            NEXT_PUBLIC_SITE_URL: origin,
            AWS_ENDPOINT_URL_S3: `http://127.0.0.1:${storageAddress.port}`,
            AWS_ACCESS_KEY_ID: "fixture-only",
            AWS_SECRET_ACCESS_KEY: "fixture-only",
            AWS_REGION: "us-east-1",
            AWS_S3_BUCKET: "media-test",
            NEXT_TELEMETRY_DISABLED: "1",
          },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      child.stdout!.on("data", (chunk) => (logs += chunk));
      child.stderr!.on("data", (chunk) => (logs += chunk));
      let ready = false;
      for (let attempt = 0; attempt < 100; attempt++) {
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
        viewport: { width: 390, height: 844 },
      });
      const page = await context.newPage();
      const galleryRequests: string[] = [];
      page.on("request", (request) => {
        if (request.url().includes("/api/media/"))
          galleryRequests.push(request.url());
      });
      await page.goto(`${origin}/properti/${slug}`);
      const visibleImage = page.locator(
        '.gallery-main img[aria-hidden="false"]',
      );
      await expect(visibleImage).toHaveJSProperty("naturalWidth", 1200);
      await expect
        .poll(() =>
          galleryRequests.some((url) =>
            url.endsWith("/api/media/media-next/display.webp"),
          ),
        )
        .toBe(true);
      const nextImage = page.locator('.gallery-main img[aria-hidden="true"]');
      await expect(nextImage).toHaveJSProperty("naturalWidth", 1200);
      const nextRequestCount = galleryRequests.filter((url) =>
        url.endsWith("/api/media/media-next/display.webp"),
      ).length;
      await page.getByRole("button", { name: "Foto berikutnya" }).click();
      await expect(page.locator(".gallery-count")).toHaveText("2 / 2");
      assert.equal(
        galleryRequests.filter((url) =>
          url.endsWith("/api/media/media-next/display.webp"),
        ).length,
        nextRequestCount,
        "promoting the prefetched photo makes no second request",
      );
      assert.ok(
        galleryRequests.every(
          (url) =>
            !url.includes("/_next/image") && url.includes("/display.webp"),
        ),
        "gallery requests prepared display photos only",
      );

      const displayUrl = `${origin}/api/media/media-first/display.webp`;
      const displayResponse = await fetch(displayUrl);
      assert.equal(displayResponse.status, 200);
      assert.equal(
        displayResponse.headers.get("cache-control"),
        "private, no-cache",
      );
      assert.equal(
        displayResponse.headers.get("cloudflare-cdn-cache-control"),
        "public, max-age=300, must-revalidate",
      );
      const display = Buffer.from(await displayResponse.arrayBuffer());
      assert.equal((await sharp(display).metadata()).width, 1200);
      assert.ok(display.length <= 250 * 1024);
      assert.equal((await fetch(displayUrl)).status, 200);
      const firstKey = "properties/media-owner/media-first.webp";
      assert.equal(
        reads.filter((key) => key === `/media-test/${firstKey}`).length,
        1,
        "old master is converted only once",
      );
      assert.equal(
        writes.filter(
          (key) => key === `/media-test/${displayImageKey(firstKey)}`,
        ).length,
        1,
      );
      assert.deepEqual(
        Buffer.from(
          await (await fetch(`${origin}/api/media/media-first`)).arrayBuffer(),
        ),
        master,
      );

      const privateUrl = `${origin}/api/media/media-private/display.webp`;
      const beforePrivate = reads.length;
      assert.equal((await fetch(privateUrl)).status, 404);
      assert.equal(
        reads.length,
        beforePrivate,
        "unauthorized private display never reaches S3",
      );
      const client = context.request;
      const { csrfToken } = await (
        await client.get(`${origin}/api/auth/csrf`)
      ).json();
      await client.post(`${origin}/api/auth/callback/credentials`, {
        form: {
          email: "owner@media.test",
          password: "media-test-password",
          csrfToken,
          callbackUrl: `${origin}/akun`,
        },
        headers: { "X-Auth-Return-Redirect": "1", origin },
      });
      assert.equal(
        (await (await client.get(`${origin}/api/auth/session`)).json()).user
          .email,
        "owner@media.test",
      );
      const ownerPhoto = await client.get(privateUrl);
      assert.equal(ownerPhoto.status(), 200);
      assert.equal(ownerPhoto.headers()["cache-control"], "private, no-store");
      assert.equal(
        ownerPhoto.headers()["cloudflare-cdn-cache-control"],
        "private, no-store",
      );
      const objectsBeforeUpload = objects.size;
      const upload = await client.post(`${origin}/api/upload`, {
        multipart: {
          file: { name: "new.webp", mimeType: "image/webp", buffer: master },
        },
        headers: { origin },
      });
      assert.equal(upload.status(), 200);
      const { url: canonicalUploadUrl } = await upload.json();
      assert.match(canonicalUploadUrl, /^\/api\/media\/[^/]+$/);
      assert.equal(objects.size, objectsBeforeUpload + 2);
      const uploaded = (
        await database.query<{ key: string }>(
          'SELECT key FROM "Media" WHERE id=$1',
          [canonicalUploadUrl.split("/").at(-1)],
        )
      ).rows[0];
      assert.equal(
        (await sharp(objects.get(`/media-test/${uploaded.key}`)!).metadata())
          .width,
        1800,
      );
      assert.equal(
        (
          await sharp(
            objects.get(`/media-test/${displayImageKey(uploaded.key)}`)!,
          ).metadata()
        ).width,
        1200,
      );
      assert.equal(
        (await fetch(`${origin}${canonicalUploadUrl}/display.webp`)).status,
        404,
      );
      assert.equal(
        (
          await client.get(`${origin}${canonicalUploadUrl}/display.webp`)
        ).status(),
        200,
      );

      await database.query(
        "UPDATE \"Property\" SET status='ARCHIVED' WHERE id=$1",
        ["media-listing"],
      );
      const beforeUnpublish = reads.length;
      const hidden = await fetch(displayUrl);
      assert.equal(hidden.status, 404);
      assert.equal(hidden.headers.get("cache-control"), "private, no-store");
      assert.equal(
        hidden.headers.get("cloudflare-cdn-cache-control"),
        "private, no-store",
      );
      assert.equal(
        reads.length,
        beforeUnpublish,
        "cached derivatives still require current origin authorization",
      );
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
      await new Promise<void>((resolve) => storage.close(() => resolve()));
      for (
        let attempt = 0;
        postgres.getStats().activeConnections > 0 && attempt < 100;
        attempt++
      )
        await delay(10);
      await postgres.stop();
      for (
        let attempt = 0;
        postgres.getStats().queuedQueries > 0 && attempt < 100;
        attempt++
      )
        await delay(10);
      await database.runExclusive(async () => {});
      await nextTurn();
      await nextTurn();
      await database.close();
    }
  },
);
