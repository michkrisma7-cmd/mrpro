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
import { defaultFields } from "../../lib/demo";
import { getRegions } from "../../lib/regions";

test(
  "member listings publish, confirm, edit securely and preserve photos and regional location across desktop and mobile",
  { timeout: 240000 },
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
      for (const f of defaultFields) {
        await database.query(
          'INSERT INTO "PropertyField" (id,key,name,type,options,required,"showInForm","showOnCard","showOnDetail","cardLabel",position) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (key) DO NOTHING',
          [
            f.id,
            f.key,
            f.name,
            f.type,
            f.key === "transaksi" ? ["Disewa", "Dijual"] : f.options,
            f.required,
            f.showInForm,
            f.showOnCard,
            f.showOnDetail,
            f.cardLabel,
            f.position,
          ],
        );
      }
      // Upgrade the existing transaction configuration, just as a deployed database does.
      await database.exec(
        await readFile(
          "prisma/migrations/202611050001_over_kredit/migration.sql",
          "utf8",
        ),
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
      const regionValues = {
        province: "32",
        regency: "32.16",
        district: getRegions("districts", "32.16")[0],
      };
      const village = getRegions("villages", regionValues.district.id)[0];
      const chooseRegions = async () => {
        const province = page.getByRole("combobox", {
          name: "Provinsi",
          exact: true,
        });
        await expect(province).toBeEnabled();
        const search = page.getByRole("searchbox", {
          name: "Cari provinsi",
          exact: true,
        });
        await search.fill("Jawa Tengah");
        await expect(
          province.locator("option").filter({ hasText: /^Jawa Tengah$/ }),
        ).toHaveCount(1);
        await search.fill("");
        await province.selectOption("32");
        const regency = page.getByRole("combobox", {
          name: "Kabupaten/Kota",
          exact: true,
        });
        await expect(regency).toBeEnabled();
        await expect(regency.locator("option").nth(1)).toHaveText(
          "Kabupaten Bekasi",
        );
        await expect(regency.locator("option").nth(2)).toHaveText(
          "Kota Bekasi",
        );
        await regency.selectOption("32.16");
        const district = page.getByRole("combobox", {
          name: "Kecamatan",
          exact: true,
        });
        await expect(district).toBeEnabled();
        await district.selectOption(regionValues.district.id);
        const desa = page.getByRole("combobox", {
          name: "Desa/Kelurahan",
          exact: true,
        });
        await expect(desa).toBeEnabled();
        await desa.selectOption(village.id);
      };
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      for (const [width, transaction] of [
        [1440, "Dijual"],
        [390, "Disewa"],
        [390, "Over Kredit"],
      ] as const) {
        const title = `Rumah foto utama ${width} ${transaction}`;
        await page.setViewportSize({ width, height: 900 });
        // Warm the home cache before submission to catch stale redirects.
        await page.goto(origin);
        await expect(page.locator(".home-property-section")).toBeVisible();
        await page
          .getByRole("link", { name: "Pasang Iklan", exact: true })
          .click();
        await page.locator('[name="title"]').fill(title);
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
          await page
            .locator('[name="field_transaksi"]')
            .selectOption(transaction);
        }
        await chooseRegions();
        if (transaction === "Dijual") {
          await page
            .getByRole("combobox", { name: "Provinsi", exact: true })
            .selectOption("36");
          for (const key of ["kota_kabupaten", "kecamatan", "kelurahan_desa"])
            await expect(
              page.locator(`[name="field_${key}_kode"]`),
            ).toHaveValue("");
          const regency = page.getByRole("combobox", {
            name: "Kabupaten/Kota",
            exact: true,
          });
          await expect(regency).toBeEnabled();
          await expect(regency.locator("option").nth(1)).toHaveText(
            "Kabupaten Tangerang",
          );
          await expect(regency.locator("option").nth(2)).toHaveText(
            "Kota Tangerang Selatan",
          );
          await chooseRegions();
        }
        await page.locator('[name="field_fasilitas"][value="Taman"]').check();
        await expect(
          page.locator('[name="field_transaksi"] option'),
        ).toHaveText(["Pilih transaksi", "Disewa", "Dijual", "Over Kredit"]);
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
        assert.equal(await page.locator('[name="title"]').inputValue(), title);
        await page.locator(".property-photos").screenshot({
          path: `/workspace/work/member-listing/property-photos-${width}.png`,
        });
        await expect(
          page.locator('.submit-area input[type="checkbox"]'),
        ).toHaveCount(0);
        const publish = page.getByRole("button", {
          name: "Tayangkan Properti",
        });
        await expect(publish).toHaveCSS("background-color", "rgb(251, 48, 0)");
        await expect(publish).toHaveCSS("color", "rgb(255, 255, 255)");
        await publish.hover();
        await expect(publish).not.toHaveCSS(
          "background-color",
          "rgb(251, 48, 0)",
        );
        const hoverColor = await publish.evaluate(
          (button) => getComputedStyle(button).backgroundColor,
        );
        await page.mouse.down();
        await expect(publish).not.toHaveCSS("background-color", hoverColor);
        await page.mouse.move(0, 0);
        await page.mouse.up();
        if (transaction === "Dijual") {
          await page.locator('[name="whatsapp"]').fill("invalid-phone");
          await publish.click();
          await expect(
            page.locator(".property-form").getByRole("alert"),
          ).toContainText("Nomor WhatsApp tidak valid");
          await expect(page).toHaveURL(`${origin}/titip-properti`);
          await expect(page.locator('[name="title"]')).toHaveValue(title);
          await expect(page.locator('[name="whatsapp"]')).toHaveValue(
            "invalid-phone",
          );
          await expect(page.locator('[name="field_transaksi"]')).toHaveValue(
            transaction,
          );
          await expect(
            page.locator('[name="field_fasilitas"][value="Taman"]'),
          ).toBeChecked();
          await expect(
            page.getByRole("combobox", { name: "Provinsi", exact: true }),
          ).toHaveValue("32");
          await expect(
            page.getByRole("combobox", { name: "Desa/Kelurahan", exact: true }),
          ).toHaveValue(village.id);
          assert.deepEqual(
            JSON.parse(await page.locator('[name="gallery"]').inputValue()),
            finalGallery,
          );
          await page.locator('[name="whatsapp"]').fill("081234567890");
          // An actual database failure must also preserve the form and prevent redirect.
          await database.exec(
            `ALTER TABLE "Property" ADD CONSTRAINT fail_submission CHECK (false)`,
          );
          await publish.click();
          await expect(
            page.locator(".property-form").getByRole("alert"),
          ).toContainText("fail_submission");
          await expect(page.locator('[name="title"]')).toHaveValue(title);
          await expect(
            page.locator('textarea[name="description"]'),
          ).toHaveValue(
            "Rumah dengan informasi lengkap untuk pengujian foto utama properti.",
          );
          await expect(page.locator('[name="field_harga"]')).toHaveValue(
            "1850000000",
          );
          await expect(page.locator('[name="field_lokasi"]')).toHaveValue(
            "Bintaro",
          );
          await expect(page).toHaveURL(`${origin}/titip-properti`);
          assert.equal(
            (await database.query('SELECT id FROM "Property"')).rows.length,
            0,
          );
          await database.exec(
            'ALTER TABLE "Property" DROP CONSTRAINT fail_submission',
          );
        }
        await publish.click();
        await expect(page).toHaveURL(`${origin}/`);
        // No reload or page.goto here: the redirect must show the new card first.
        await expect(
          page.locator(".home-property-section .property-card h3").first(),
        ).toHaveText(title);
        await expect(
          page.locator(".home-property-section .property-badge").first(),
        ).toContainText(transaction);
        const confirmation = page.locator(".publication-notice");
        await expect(confirmation).toContainText("Properti berhasil tayang");
        await expect(
          confirmation.getByRole("link", { name: "Kelola Listing" }),
        ).toHaveAttribute("href", "/akun");
        const result = await database.query<{
          id: string;
          slug: string;
          gallery: string[];
          values: {
            transaksi: string;
            lokasi: string;
            provinsi: string;
            provinsi_kode: string;
            kelurahan_desa_kode: string;
          };
        }>('SELECT id,slug,gallery,"values" FROM "Property" WHERE title=$1', [
          title,
        ]);
        const listing = result.rows[0];
        assert.deepEqual(listing.gallery, finalGallery);
        assert.equal(listing.values.transaksi, transaction);
        assert.equal(listing.values.lokasi, "Bintaro");
        assert.equal(listing.values.provinsi, "Jawa Barat");
        assert.equal(listing.values.provinsi_kode, "32");
        assert.equal(listing.values.kelurahan_desa_kode, village.id);
        await expect(
          confirmation.getByRole("link", { name: "Lihat Iklan", exact: true }),
        ).toHaveAttribute("href", `/properti/${listing.slug}`);
        await confirmation
          .getByRole("button", { name: "Tutup pesan berhasil tayang" })
          .click();
        await expect(confirmation).toHaveCount(0);
        // Reopen the full member editor; region hierarchy and every existing value must survive.
        await page.goto(`${origin}/akun`);
        await page
          .locator(`a[href="/akun/properti/${listing.id}/edit"]`)
          .click();
        await expect(page.locator('[name="title"]')).toHaveValue(title);
        await expect(page.locator('[name="field_transaksi"]')).toHaveValue(
          transaction,
        );
        await expect(page.locator('[name="field_lokasi"]')).toHaveValue(
          "Bintaro",
        );
        await expect(
          page.getByRole("combobox", { name: "Provinsi", exact: true }),
        ).toHaveValue("32");
        await expect(
          page.getByRole("combobox", { name: "Desa/Kelurahan", exact: true }),
        ).toHaveValue(village.id);
        await page.locator('[name="field_harga"]').fill("1900000000");
        await page.locator('[name="whatsapp"]').fill("invalid-phone");
        await page.getByRole("button", { name: "Simpan Perubahan" }).click();
        await expect(
          page.locator(".property-form").getByRole("alert"),
        ).toContainText("Nomor WhatsApp tidak valid");
        await expect(page.locator('[name="field_harga"]')).toHaveValue(
          "1900000000",
        );
        await page.locator('[name="whatsapp"]').fill("081234567890");
        await page.getByRole("button", { name: "Simpan Perubahan" }).click();
        await expect(
          page.getByText("Perubahan properti berhasil disimpan", {
            exact: true,
          }),
        ).toBeVisible();
        await page.reload();
        await expect(page.locator('[name="field_harga"]')).toHaveValue(
          "1900000000",
        );
        const afterEdit = (
          await database.query<{
            slug: string;
            status: string;
            ownerId: string;
          }>('SELECT slug,status,"ownerId" FROM "Property" WHERE id=$1', [
            listing.id,
          ])
        ).rows[0];
        assert.deepEqual(afterEdit, {
          slug: listing.slug,
          status: "PUBLISHED",
          ownerId: "team-admin",
        });
        await expect(page.locator(".property-form label").first()).toHaveCSS(
          "color",
          "rgb(17, 24, 39)",
        );
        await page.locator(".property-form").screenshot({
          path: `/workspace/work/member-listing/member-editor-${width}.png`,
        });
        const verifyPublic = async (gallery: string[]) => {
          const cover = gallery[0];
          await page.goto(`${origin}/properti`);
          await page
            .locator(".catalog-tabs")
            .getByRole("link", { name: transaction, exact: true })
            .click();
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
          await expect(page.locator(".specification-grid")).toContainText(
            transaction,
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
      await database.exec(`INSERT INTO "AppUser" (id,name,email,"passwordHash") VALUES ('other-owner','Other','other@example.test','unused');
        INSERT INTO "Property" (id,slug,title,description,gallery,whatsapp,"ownerId",status,"values","updatedAt") VALUES
        ('foreign-listing','foreign-listing','Rahasia orang lain','Deskripsi',ARRAY['/images/house-1.webp'],'081234567890','other-owner','PUBLISHED','{}',NOW()),
        ('legacy-listing','legacy-listing','Rumah lama milik member','Deskripsi rumah lama yang cukup panjang untuk bisa disimpan.',ARRAY['/images/house-1.webp'],'081234567890','team-admin','PENDING','{"lokasi":"Alamat lama bebas","provinsi":"Jabar lama","kecamatan":"Daerah lama","harga":100,"jenis":"Rumah","transaksi":"Dijual","hidden_legacy":"tetap"}',NOW());`);
      const denied = await page.goto(
        `${origin}/akun/properti/foreign-listing/edit`,
      );
      // Next may stream a not-found page with HTTP 200 after headers have been sent.
      assert.ok([200, 404].includes(denied!.status()));
      await expect(
        page.getByRole("heading", {
          name: "Sepertinya Anda salah alamat.",
          exact: true,
        }),
      ).toBeVisible();
      await expect(page.locator(".property-form")).toHaveCount(0);
      await page.goto(`${origin}/akun/properti/legacy-listing/edit`);
      await expect(page.getByText("Jabar lama", { exact: true })).toBeVisible();
      await page.locator('[name="title"]').fill("Rumah lama diperbarui member");
      await page.getByRole("button", { name: "Simpan Perubahan" }).click();
      await expect(
        page.getByText("Perubahan properti berhasil disimpan", { exact: true }),
      ).toBeVisible();
      const legacy = (
        await database.query<{
          status: string;
          values: Record<string, unknown>;
        }>('SELECT status,"values" FROM "Property" WHERE id=$1', [
          "legacy-listing",
        ])
      ).rows[0];
      assert.equal(legacy.status, "PENDING");
      assert.equal(legacy.values.provinsi, "Jabar lama");
      assert.equal(legacy.values.hidden_legacy, "tetap");
      assert.equal(legacy.values.provinsi_kode, undefined);
      await database.exec(
        `UPDATE "AppUser" SET role='ADMIN' WHERE id='team-admin'`,
      );
      const over = (
        await database.query<{ id: string; slug: string }>(
          `SELECT id,slug FROM "Property" WHERE "values"->>'transaksi'='Over Kredit'`,
        )
      ).rows[0];
      await page.goto(`${origin}/admin?tab=properti&edit=${over.id}`);
      const editor = page.locator(".admin-edit-form");
      await expect(editor.locator('[name="field_transaksi"]')).toHaveValue(
        "Over Kredit",
      );
      for (const transaction of ["Dijual", "Over Kredit"]) {
        await editor
          .locator('[name="field_transaksi"]')
          .selectOption(transaction);
        await editor.getByRole("button", { name: "Simpan Informasi" }).click();
        await expect(
          editor.getByText("Informasi properti disimpan."),
        ).toBeVisible();
        await page.reload();
        await expect(editor.locator('[name="field_transaksi"]')).toHaveValue(
          transaction,
        );
      }
      await page.goto(`${origin}/properti/${over.slug}`);
      await expect(page.locator(".specification-grid")).toContainText(
        "Over Kredit",
      );
      await page.goto(origin);
      await page
        .getByRole("button", { name: "Over Kredit", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Cari Properti", exact: true })
        .click();
      assert.equal(
        new URL(page.url()).searchParams.get("transaksi"),
        "Over Kredit",
      );
      await expect(page.locator(".property-card")).toHaveCount(1);
      await expect(page.locator(".property-badge")).toContainText(
        "Over Kredit",
      );
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
