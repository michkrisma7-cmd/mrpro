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
  "admin manages team profiles and real uploads; only active profiles and photos are public",
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
      await page.goto(`${origin}/admin?tab=tim&edit=baru`);
      await expect(
        page.getByRole("heading", { name: "Tambah anggota tim", exact: true }),
      ).toBeVisible();
      await page
        .getByLabel("Nama lengkap", { exact: true })
        .fill("Budi Santoso");
      await page.getByLabel("Bidang keahlian").fill("Kelistrikan dan AC");
      await page
        .getByLabel("Pengalaman kerja")
        .fill(
          "Berpengalaman 10 tahun menangani instalasi rumah.\nPemasangan dan perawatan AC.",
        );
      const summary =
        "Teknisi berpengalaman yang mengutamakan ketelitian dan komunikasi. "
          .repeat(12)
          .trim();
      const fullProfile =
        "Pengalaman menangani instalasi rumah, perawatan AC, dan pemeriksaan kelistrikan.\n"
          .repeat(65)
          .trim();
      await page.locator('textarea[name="description"]').fill(summary);
      await page.getByLabel("Deskripsi profil lengkap").fill(fullProfile);
      await page.getByLabel("Urutan tampilan").fill("2");
      const photo = await sharp({
        create: { width: 80, height: 100, channels: 3, background: "#526c46" },
      })
        .png()
        .toBuffer();
      await page.getByLabel("Foto anggota tim").setInputFiles({
        name: "budi.png",
        mimeType: "image/png",
        buffer: photo,
      });
      await expect(
        page.getByAltText("Pratinjau foto anggota tim"),
      ).toBeVisible();
      await page.getByRole("button", { name: "Simpan Anggota Tim" }).click();
      await expect(page.getByRole("status")).toHaveText(
        "Profil anggota tim berhasil disimpan.",
      );
      const rows = await database.query<{ id: string; photoId: string }>(
        'SELECT id,"photoId" FROM "TeamMember"',
      );
      assert.equal(rows.rows.length, 1);
      const member = rows.rows[0];
      assert.equal(objects.size, 1);
      assert.equal(
        (await sharp([...objects.values()][0]).metadata()).format,
        "webp",
      );
      let mediaUrl = `${origin}/api/media/${member.photoId}`;
      const stored = (
        await database.query<{
          description: string;
          fullProfile: string;
          position: number;
        }>(
          'SELECT description,"fullProfile",position FROM "TeamMember" WHERE id=$1',
          [member.id],
        )
      ).rows[0];
      assert.equal(stored.description, summary);
      assert.equal(stored.fullProfile.replace(/\r\n/g, "\n"), fullProfile);
      assert.equal(stored.position, 2);
      const publicPhoto = await fetch(mediaUrl);
      assert.equal(publicPhoto.status, 200);
      assert.equal(publicPhoto.headers.get("content-type"), "image/webp");
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`${origin}/tim-kami`);
        await expect(
          page.getByRole("heading", { name: "Budi Santoso" }),
        ).toBeVisible();
        await expect(page.locator(".team-profile-card")).toContainText(
          "Kelistrikan dan AC",
        );
        await expect(page.locator(".team-profile-card")).toContainText(
          "Berpengalaman 10 tahun",
        );
        await expect(page.getByAltText("Foto Budi Santoso")).toBeVisible();
        await expect
          .poll(async () =>
            page
              .getByAltText("Foto Budi Santoso")
              .evaluate(
                (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
              ),
          )
          .toBe(true);
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
        const photoBox = (await page
          .locator(".team-profile-photo")
          .boundingBox())!;
        const infoBox = (await page
          .locator(".team-profile-info")
          .boundingBox())!;
        assert.equal(photoBox.width, width === 390 ? 100 : 120);
        assert.equal(photoBox.height, width === 390 ? 120 : 140);
        assert.ok(photoBox.x + photoBox.width < infoBox.x);
        const summaryBox = page.locator(".team-profile-summary");
        assert.equal(await summaryBox.textContent(), summary);
        assert.equal(
          await summaryBox.evaluate(
            (el) => getComputedStyle(el).webkitLineClamp,
          ),
          "2",
        );
        assert.equal(
          await summaryBox.evaluate((el) => el.scrollHeight > el.clientHeight),
          true,
        );
        await page
          .locator(".team-profile-card")
          .screenshot({ path: `/tmp/mrpro-team-card-${width}.png` });
        const trigger = page.getByRole("button", {
          name: "Lihat profil Budi Santoso",
          exact: true,
        });
        await trigger.click();
        const modal = page.getByRole("dialog");
        await expect(modal).toBeVisible();
        await expect(modal).toContainText(summary);
        await expect(modal).toContainText(fullProfile.split("\n")[0]);
        assert.equal(
          (await modal.locator("section p").last().textContent())!.replace(
            /\r\n/g,
            "\n",
          ),
          fullProfile,
        );
        assert.equal(
          await modal.evaluate((el) => el.scrollHeight > el.clientHeight),
          true,
        );
        await page.screenshot({ path: `/tmp/mrpro-team-modal-${width}.png` });
        await page.keyboard.press("Tab");
        assert.equal(
          await modal.evaluate((el) => el.contains(document.activeElement)),
          true,
        );
        await page
          .getByRole("button", { name: "Tutup profil", exact: true })
          .click();
        await expect(modal).toHaveCount(0);
        await expect(trigger).toBeFocused();
        await trigger.click();
        await expect(modal).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(modal).toHaveCount(0);
        await trigger.click();
        await expect(modal).toBeVisible();
        await page.mouse.click(2, 2);
        await expect(modal).toHaveCount(0);
      }
      await page.setViewportSize({ width: 1440, height: 1000 });
      // A second member sorts before the original until admin changes its position.
      await database.query(
        `INSERT INTO "TeamMember" (id,name,expertise,experience,"photoId",position,"updatedAt") VALUES ('other','Andi','Renovasi','5 tahun',$1,0,NOW())`,
        [member.photoId],
      );
      await page.goto(`${origin}/tim-kami`);
      await expect(page.locator(".team-profile-info h2")).toHaveText([
        "Andi",
        "Budi Santoso",
      ]);
      await page.goto(`${origin}/admin?tab=tim&edit=${member.id}`);
      await page.getByLabel("Urutan tampilan").fill("0");
      const replacement = await sharp({
        create: { width: 100, height: 120, channels: 3, background: "#203f32" },
      })
        .png()
        .toBuffer();
      await page.getByLabel("Foto anggota tim").setInputFiles({
        name: "replacement.png",
        mimeType: "image/png",
        buffer: replacement,
      });
      await expect(page.locator('input[name="photoId"]')).not.toHaveValue(
        member.photoId,
      );
      await page.getByRole("button", { name: "Simpan Anggota Tim" }).click();
      await expect(page.getByRole("status")).toHaveText(
        "Profil anggota tim berhasil disimpan.",
      );
      const replaced = (
        await database.query<{ photoId: string }>(
          'SELECT "photoId" FROM "TeamMember" WHERE id=$1',
          [member.id],
        )
      ).rows[0].photoId;
      assert.notEqual(replaced, member.photoId);
      mediaUrl = `${origin}/api/media/${replaced}`;
      assert.equal((await fetch(mediaUrl)).status, 200);
      await page.goto(`${origin}/tim-kami`);
      await expect(page.locator(".team-profile-info h2")).toHaveText([
        "Budi Santoso",
        "Andi",
      ]);
      await database.exec(`DELETE FROM "TeamMember" WHERE id='other'`);
      assert.equal(
        (await fetch(`${origin}/api/media/${member.photoId}`)).status,
        404,
      );

      await page.goto(`${origin}/admin?tab=tim&edit=${member.id}`);
      await page
        .getByLabel("Nama lengkap", { exact: true })
        .fill("Budi Pratama");
      await page.getByLabel("Tampilkan di laman Tim Kami").uncheck();
      await page.getByRole("button", { name: "Simpan Anggota Tim" }).click();
      await expect(page.getByRole("status")).toHaveText(
        "Profil anggota tim berhasil disimpan.",
      );
      const hidden = await (await fetch(`${origin}/tim-kami`)).text();
      assert.ok(!hidden.includes("Budi Pratama"));
      assert.equal((await fetch(mediaUrl)).status, 404);
      assert.equal((await client.get(mediaUrl)).status(), 200);
      await database.exec(
        "UPDATE \"AppUser\" SET role='USER' WHERE id='team-admin'",
      );
      await page.goto(`${origin}/admin?tab=tim`);
      await expect(
        page.getByRole("heading", { name: "Akses khusus administrator." }),
      ).toBeVisible();
      await database.exec(
        "UPDATE \"AppUser\" SET role='ADMIN' WHERE id='team-admin'",
      );
      await page.goto(`${origin}/admin?tab=tim&edit=${member.id}`);
      page.once("dialog", (dialog) => dialog.dismiss());
      await page.getByRole("button", { name: "Hapus Anggota Tim" }).click();
      assert.equal(
        (await database.query('SELECT id FROM "TeamMember"')).rows.length,
        1,
      );
      page.once("dialog", (dialog) => dialog.accept());
      await page.getByRole("button", { name: "Hapus Anggota Tim" }).click();
      await expect(page.getByRole("status")).toHaveText(
        "Profil anggota tim berhasil dihapus.",
      );
      assert.equal(
        (await database.query('SELECT * FROM "TeamMember"')).rows.length,
        0,
      );
      assert.equal((await fetch(mediaUrl)).status, 404);
      assert.equal(
        objects.size,
        2,
        "deleting a profile preserves shared media",
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
