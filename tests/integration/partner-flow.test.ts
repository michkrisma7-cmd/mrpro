import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import {
  setTimeout as delay,
  setImmediate as nextTurn,
} from "node:timers/promises";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { chromium, expect } from "@playwright/test";
import { hashPassword } from "../../lib/password";

test(
  "partnership: responsive signup, durable admin edits, filters and server authorization",
  { timeout: 180000 },
  async () => {
    const database = await PGlite.create();
    const postgres = new PGLiteSocketServer({
      db: database,
      host: "127.0.0.1",
      port: 0,
      maxConnections: 20,
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
      await database.query(
        `INSERT INTO "AppUser" (id,name,email,"passwordHash",role) VALUES ('partner-admin','Admin','partner@example.test',$1,'ADMIN')`,
        [await hashPassword("partner-test-password")],
      );
      await postgres.start();
      const listener = createServer().listen(0, "127.0.0.1");
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
            AUTH_SECRET: "partner-integration-test-secret-".repeat(3),
            NEXT_PUBLIC_SITE_URL: origin,
            NEXT_TELEMETRY_DISABLED: "1",
          },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      child.stdout!.on("data", (c) => (logs += c));
      child.stderr!.on("data", (c) => (logs += c));
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
      assert.ok(ready);
      browser = await chromium.launch({
        executablePath: "/usr/bin/chromium",
        args: ["--no-sandbox"],
      });
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
      });
      const page = await context.newPage();
      const browserErrors: string[] = [];
      page.on("pageerror", (e) => browserErrors.push(e.message));
      for (const width of [1440, 1200, 1110, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`${origin}/kemitraan`);
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(
          "Keahlian Anda.Peluang kerjadi wilayah Anda.",
        );
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
          `no overflow at ${width}`,
        );
        const layout = await page.locator("#mr-mitra").evaluate((root) => {
          return {
            ...Object.fromEntries(
              ["hero", "services", "benefits", "steps", "registration"].map(
                (selector) => [
                  selector,
                  getComputedStyle(
                    root.querySelector(`.${selector}`)!,
                  ).gridTemplateColumns.split(" ").length,
                ],
              ),
            ),
            heading: getComputedStyle(root.querySelector("h1")!).fontSize,
          };
        });
        assert.deepEqual(
          layout,
          width > 700
            ? {
                hero: 2,
                services: 5,
                benefits: 3,
                steps: 4,
                registration: 2,
                heading: "38px",
              }
            : {
                hero: 1,
                services: 2,
                benefits: 1,
                steps: 1,
                registration: 1,
                heading: "32px",
              },
        );
        assert.equal(await page.locator("#mr-services .service").count(), 10);
        assert.equal(await page.locator(".site-header").count(), 1);
        assert.equal(await page.locator(".site-footer").count(), 1);
        if (width <= 1200)
          await page.getByRole("button", { name: "Buka menu" }).click();
        const nav = page.getByRole("navigation", { name: "Navigasi utama" });
        await expect(
          nav.getByRole("link", { name: "Kemitraan", exact: true }),
        ).toBeVisible();
        const labels = await nav.getByRole("link").allTextContents();
        assert.equal(labels[labels.indexOf("Tim Kami") + 1], "Kemitraan");
        await expect(
          page.locator("footer").getByRole("link", { name: "Kemitraan" }),
        ).toBeVisible();
        if (width === 390)
          await page.getByRole("button", { name: "Tutup menu" }).click();
        await page.screenshot({
          path: `work/partnership-${width}.png`,
          fullPage: true,
        });
      }
      const commission = page.locator("#mr-faq details").filter({
        has: page.getByText("Bagaimana pembagian upah atau komisi?", {
          exact: true,
        }),
      });
      await expect(commission.locator("p")).toBeHidden();
      await commission.locator("summary").click();
      await expect(commission.locator("p")).toBeVisible();
      await commission.locator("summary").click();
      await expect(commission.locator("p")).toBeHidden();
      await commission.locator("summary").click();
      await expect(commission.locator("p")).toHaveText(
        "Nilai upah atau komisi dibahas secara transparan sesuai kesepakatan yang adil. Kami akan berpihak dan mengutamakan yang terbaik agar usaha Anda lancar terlebih dahulu.",
      );
      await page.getByRole("button", { name: "AC", exact: true }).click();
      await page
        .getByRole("button", { name: "Kelistrikan", exact: true })
        .click();
      await expect(page.locator("#mr-fields")).toHaveText("AC, Kelistrikan");
      await page.getByRole("button", { name: "Plafon", exact: true }).click();
      await expect(
        page.getByRole("button", { name: "Plafon", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      await page
        .getByLabel("Nama lengkap / nama usaha", { exact: true })
        .fill("Budi Mitra");
      await page
        .getByLabel("Nomor WhatsApp", { exact: true })
        .fill("0812-3456-7890");
      await page.getByLabel("Domisili / area").selectOption("Bekasi");
      await page.getByLabel("Pengalaman kerja").selectOption("1–3 tahun");
      await page.getByRole("checkbox", { name: "Bekasi", exact: true }).check();
      await page
        .getByRole("checkbox", { name: "Cikarang", exact: true })
        .check();
      await page.getByRole("checkbox", { name: /Saya bersedia/ }).check();
      // A real database error must preserve all inputs and never show success.
      await database.exec(
        'ALTER TABLE "Partner" RENAME TO "Partner_unavailable"',
      );
      await page.getByRole("button", { name: "Kirim Pendaftaran" }).click();
      await expect(
        page.locator(".partner-form").getByRole("alert"),
      ).toContainText("belum berhasil disimpan");
      await expect(
        page.getByLabel("Nama lengkap / nama usaha", { exact: true }),
      ).toHaveValue("Budi Mitra");
      await expect(
        page.getByRole("checkbox", { name: "Bekasi", exact: true }),
      ).toBeChecked();
      await database.exec(
        'ALTER TABLE "Partner_unavailable" RENAME TO "Partner"',
      );
      let payload: Record<string, unknown> | undefined;
      await page.route("**/api/mitra", async (route) => {
        payload = route.request().postDataJSON();
        await delay(300);
        await route.continue();
      });
      await page.getByRole("button", { name: "Kirim Pendaftaran" }).click();
      await expect(
        page.getByRole("button", { name: "Menyimpan…" }),
      ).toBeDisabled();
      await expect(page.locator(".partner-success")).toContainText(
        "Pendaftaran berhasil disimpan.",
      );
      const rows = await database.query<{ id: string; whatsapp: string }>(
        'SELECT * FROM "Partner"',
      );
      assert.equal(rows.rows.length, 1);
      const id = rows.rows[0].id;
      assert.equal(rows.rows[0].whatsapp, "+6281234567890");
      const client = context.request;
      assert.equal(
        (
          await client.post(`${origin}/api/mitra`, {
            data: payload,
            headers: { origin },
          })
        ).status(),
        201,
      );
      assert.equal(
        (await database.query('SELECT id FROM "Partner"')).rows.length,
        1,
        "retry does not duplicate registration",
      );
      assert.equal(
        (
          await client.post(`${origin}/api/mitra`, {
            data: { ...payload, areas: [] },
            headers: { origin },
          })
        ).status(),
        400,
      );
      assert.equal(
        (
          await client.post(`${origin}/api/mitra`, {
            data: payload,
            headers: { origin: "https://foreign.test" },
          })
        ).status(),
        403,
      );
      assert.equal((await client.get(`${origin}/api/mitra`)).status(), 405);
      assert.equal(
        (
          await client.patch(`${origin}/api/mitra/${id}`, {
            data: payload,
            headers: { origin },
          })
        ).status(),
        401,
      );
      await page.goto(`${origin}/admin?tab=mitra&detail=${id}`);
      await expect(page).toHaveURL(/\/login/);
      const { csrfToken } = await (
        await client.get(`${origin}/api/auth/csrf`)
      ).json();
      await client.post(`${origin}/api/auth/callback/credentials`, {
        form: {
          email: "partner@example.test",
          password: "partner-test-password",
          csrfToken,
          callbackUrl: `${origin}/admin`,
        },
        headers: { "X-Auth-Return-Redirect": "1", origin },
      });
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto(`${origin}/admin?tab=mitra`);
      await expect(
        page.getByRole("cell", { name: "Budi Mitra", exact: true }),
      ).toBeVisible();
      await page
        .getByLabel("Cari nama, nama usaha, atau WhatsApp")
        .fill("not-found");
      await page.getByRole("button", { name: "Cari / Filter" }).click();
      await expect(
        page.getByText("Belum ada mitra yang sesuai pencarian."),
      ).toBeVisible();
      await page
        .getByLabel("Cari nama, nama usaha, atau WhatsApp")
        .fill("Budi");
      await page.getByLabel("Filter wilayah layanan").selectOption("Bekasi");
      await page.getByLabel("Filter bidang pekerjaan").selectOption("AC");
      await page.getByRole("button", { name: "Cari / Filter" }).click();
      await page.getByRole("link", { name: "Detail / Edit" }).click();
      await page.getByRole("button", { name: "Edit", exact: true }).click();
      await expect(
        page.getByLabel("Nama lengkap / nama usaha", { exact: true }),
      ).toHaveValue("Budi Mitra");
      await page
        .getByLabel("Nama lengkap / nama usaha", { exact: true })
        .fill("Batal Test");
      await page.getByRole("button", { name: "Batal", exact: true }).click();
      await expect(page.locator(".partner-detail")).toContainText("Budi Mitra");
      await page.getByRole("button", { name: "Edit", exact: true }).click();
      await page
        .getByLabel("Nama lengkap / nama usaha", { exact: true })
        .fill("Budi Renovasi");
      await page
        .getByLabel("Nomor WhatsApp", { exact: true })
        .fill("+6281398765432");
      await page.getByLabel("Domisili / area").selectOption("Karawang");
      await page.getByLabel("Pengalaman kerja").selectOption("4–7 tahun");
      await page
        .getByRole("checkbox", { name: "Karawang", exact: true })
        .check();
      await page
        .getByRole("checkbox", { name: "Pengecatan", exact: true })
        .check();
      assert.equal(
        (
          await client.patch(`${origin}/api/mitra/${id}`, {
            data: { ...payload, domicile: "Jakarta" },
            headers: { origin },
          })
        ).status(),
        400,
      );
      await database.exec(
        'ALTER TABLE "Partner" RENAME TO "Partner_unavailable"',
      );
      await page.getByRole("button", { name: "Simpan Perubahan" }).click();
      await expect(
        page.locator(".partner-form").getByRole("alert"),
      ).toContainText("belum berhasil disimpan");
      await expect(
        page.getByLabel("Nama lengkap / nama usaha", { exact: true }),
      ).toHaveValue("Budi Renovasi");
      await database.exec(
        'ALTER TABLE "Partner_unavailable" RENAME TO "Partner"',
      );
      await page.getByRole("button", { name: "Simpan Perubahan" }).click();
      await expect(page.locator(".partner-success")).toContainText(
        "Perubahan berhasil disimpan.",
      );
      await expect(
        page.getByRole("cell", { name: "Budi Renovasi", exact: true }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Kembali ke detail" }).click();
      await expect(page.locator(".partner-detail")).toContainText(
        "Budi Renovasi",
      );
      await page.reload();
      await expect(page.locator(".partner-detail")).toContainText(
        "Budi Renovasi",
      );
      await expect(page.locator(".partner-detail")).toContainText("Pengecatan");
      const stored = (
        await database.query<{
          name: string;
          domicile: string;
          areas: string[];
          skills: string[];
        }>('SELECT * FROM "Partner" WHERE id=$1', [id])
      ).rows[0];
      assert.equal(stored.name, "Budi Renovasi");
      assert.equal(stored.domicile, "Karawang");
      assert.ok(stored.areas.includes("Karawang"));
      assert.ok(stored.skills.includes("Pengecatan"));
      await page.setViewportSize({ width: 390, height: 900 });
      await page.goto(`${origin}/admin?tab=mitra&detail=${id}`);
      await expect(page.locator(".partner-detail")).toContainText(
        "Budi Renovasi",
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
        "admin mobile has no page overflow",
      );
      await page.screenshot({
        path: "work/partner-admin-mobile.png",
        fullPage: true,
      });
      await database.exec(
        `UPDATE "AppUser" SET role='USER' WHERE id='partner-admin'`,
      );
      await page.goto(`${origin}/admin?tab=mitra&detail=${id}`);
      await expect(
        page.getByRole("heading", { name: "Akses khusus administrator." }),
      ).toBeVisible();
      assert.ok(!(await page.content()).includes("Budi Renovasi"));
      assert.equal(
        (
          await client.patch(`${origin}/api/mitra/${id}`, {
            data: payload,
            headers: { origin },
          })
        ).status(),
        403,
      );
      assert.deepEqual(browserErrors, []);
      await context.close();
    } catch (error) {
      console.error(logs.slice(-4500));
      throw error;
    } finally {
      await browser?.close();
      if (child && child.exitCode === null && child.signalCode === null) {
        const exited = once(child, "exit");
        child.kill("SIGTERM");
        await exited;
      }
      for (let i = 0; postgres.getStats().activeConnections > 0 && i < 100; i++)
        await delay(10);
      await postgres.stop();
      await database.runExclusive(async () => {});
      await nextTurn();
      await nextTurn();
      await database.close();
    }
  },
);
