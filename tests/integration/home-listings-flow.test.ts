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
import { chromium, expect, type BrowserContext } from "@playwright/test";

test(
  "home shows 18 listings and category navigation, footer and continuation work at every viewport",
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
      await database.exec(`INSERT INTO "AppUser" (id,name,email,"passwordHash") VALUES ('owner','Pemilik Uji','home@example.test','unusable');
      INSERT INTO "PropertyField" (id,key,name,type,options,"showOnCard","showOnDetail") VALUES
      ('jenis','jenis','Jenis','SELECT',ARRAY['Rumah','Tanah','Apartemen','Ruko'],true,true),
      ('harga','harga','Harga','PRICE',ARRAY[]::text[],true,true),
      ('lokasi','lokasi','Lokasi','TEXT',ARRAY[]::text[],true,true),
      ('transaksi','transaksi','Transaksi','SELECT',ARRAY['Dijual','Disewa','Over Kredit'],true,true);`);
      await database.exec(
        `INSERT INTO "SiteSettings" (id,whatsapp) VALUES ('main','+628811063079');`,
      );
      let sequence = 0;
      for (const [category, count] of [
        ["Rumah", 37],
        ["Tanah", 18],
        ["Apartemen", 1],
      ] as const) {
        for (let i = 0; i < count; i++, sequence++) {
          const slug = `${category.toLowerCase()}-${String(i).padStart(2, "0")}`;
          await database.query(
            `INSERT INTO "Property" (id,slug,title,description,gallery,whatsapp,"ownerId",status,"values","createdAt","updatedAt") VALUES ($1,$1,$2,'Deskripsi',ARRAY['/images/house-1.webp'],'081234567890','owner','PUBLISHED',$3,$4,NOW())`,
            [
              slug,
              `${category} ${String(i).padStart(2, "0")}`,
              JSON.stringify({
                jenis: category,
                harga: 1000000000,
                lokasi: "Bekasi",
                transaksi: ["Dijual", "Disewa", "Over Kredit"][i % 3],
              }),
              new Date(Date.UTC(2026, 9, 30, 0, -Math.floor(sequence / 3))),
            ],
          );
        }
      }
      await database.exec(
        `INSERT INTO "Property" (id,slug,title,description,gallery,whatsapp,"ownerId",status,"values","updatedAt") VALUES ('private','private','Rahasia belum terbit','Private',ARRAY[]::text[],'','owner','PENDING','{"jenis":"Rumah"}',NOW());`,
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
      for (const width of [1440, 768, 458, 390, 320]) {
        const context: BrowserContext = await browser.newContext({
          viewport: { width, height: 900 },
          hasTouch: width < 700,
          isMobile: width < 700,
        });
        const page = await context.newPage();
        const errors: string[] = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.goto(`${origin}/beranda`);
        const header = page.locator(".site-header");
        const home = page.locator("#properti");
        const cards = home.locator(".property-card");
        const next = home.getByRole("link", {
          name: "Listing Selanjutnya",
          exact: true,
        });
        const tabs = home.locator(".catalog-tabs");
        await expect(home.locator(".home-catalog-link")).toHaveCount(0);
        await expect(
          home.getByRole("link", {
            name: "Semua Properti",
            exact: true,
          }),
        ).toHaveCount(1);
        await expect(header).toHaveCSS("border-bottom-width", "1px");
        await expect(header).toHaveCSS(
          "border-bottom-color",
          "rgb(251, 48, 0)",
        );
        const bounds = (await header.boundingBox())!;
        assert.equal(bounds.x, 0);
        assert.equal(bounds.width, width);
        await expect(page.locator(".property-hero")).toHaveCount(0);
        await expect(cards).toHaveCount(18);
        await expect(cards.locator("h3")).toHaveText(
          Array.from(
            { length: 18 },
            (_, i) => `Rumah ${String(i).padStart(2, "0")}`,
          ),
        );
        await expect(page.getByText("Rahasia belum terbit")).toHaveCount(0);
        await expect(next).toHaveAttribute("href", "/properti?page=2");
        await expect(page.locator("footer")).not.toContainText("628811063079");
        await expect(
          page.locator('footer a[href*="628811063079"]'),
        ).toHaveCount(0);
        await page.evaluate(() => document.fonts.ready);
        const group = (await home
          .locator(".home-property-next")
          .boundingBox())!;
        const button = (await next.boundingBox())!;
        const reference = header.locator(".nav-actions > .button");
        const styleKeys = [
          "font-family",
          "font-size",
          "font-weight",
          "line-height",
          "padding",
          "border-radius",
          "border",
          "color",
          "background-color",
          "gap",
        ];
        const referenceStyles = await reference.evaluate((el, keys) => {
          const styles = getComputedStyle(el);
          return keys.map((key) => styles.getPropertyValue(key));
        }, styleKeys);
        assert.deepEqual(
          await next.evaluate((el, keys) => {
            const styles = getComputedStyle(el);
            return keys.map((key) => styles.getPropertyValue(key));
          }, styleKeys),
          referenceStyles,
        );
        assert.equal(button.height, (await reference.boundingBox())!.height);
        const lastCard = (await cards.last().boundingBox())!;
        assert.ok(button.y >= lastCard.y + lastCard.height);
        await expect(next.locator("svg")).toHaveCSS("width", "16px");
        await expect(next.locator("svg")).toHaveCSS("height", "16px");
        assert.ok(
          Math.abs(group.x + group.width / 2 - button.x - button.width / 2) < 1,
        );
        await next.scrollIntoViewIfNeeded();
        await page.screenshot({
          path: `work/home-limit-${width}.png`,
          scale: "css",
        });
        // Every published record remains reachable in the existing paginated catalog.
        const seen = new Set(await cards.locator("h3").allTextContents());
        await next.click();
        for (let n = 2; n <= 4; n++) {
          await expect(page.locator(".pagination")).toContainText(
            `Halaman ${n} dari 4`,
          );
          await expect(page.locator(".property-card")).toHaveCount(
            n < 4 ? 18 : 2,
          );
          for (const title of await page
            .locator(".property-card h3")
            .allTextContents()) {
            assert.ok(!seen.has(title), `duplicate listing ${title}`);
            seen.add(title);
          }
          if (n < 4)
            await page
              .locator(".pagination")
              .getByRole("link", { name: "Berikutnya", exact: true })
              .click();
        }
        assert.equal(seen.size, 56);
        await page.goto(origin);
        for (const [category, count, more] of [
          ["Rumah", 18, true],
          ["Tanah", 18, false],
          ["Apartemen", 1, false],
          ["Ruko", 0, false],
        ] as const) {
          await tabs.getByRole("link", { name: category, exact: true }).click();
          await expect(page).toHaveURL(
            new RegExp(`/\\?jenis=${category}#properti$`),
          );
          await expect(
            tabs.getByRole("link", { name: category, exact: true }),
          ).toHaveAttribute("aria-current", "page");
          await expect(cards).toHaveCount(count);
          for (const title of await cards.locator("h3").allTextContents())
            assert.ok(title.startsWith(category + " "));
          await expect(next).toHaveCount(more ? 1 : 0);
          if (more)
            await expect(next).toHaveAttribute(
              "href",
              `/properti?jenis=${category}&page=2`,
            );
          await page.reload();
          await expect(cards).toHaveCount(count);
          await expect(next).toHaveCount(more ? 1 : 0);
        }
        await tabs.getByRole("link", { name: "Rumah", exact: true }).click();
        await next.click();
        await expect(page).toHaveURL(`${origin}/properti?jenis=Rumah&page=2`);
        await page
          .locator(".pagination")
          .getByRole("link", { name: "Berikutnya", exact: true })
          .click();
        await expect(page.locator(".property-card h3")).toHaveText([
          "Rumah 36",
        ]);
        await page.goto(origin);
        await expect(cards).toHaveCount(18);
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        );
        for (const [label, transaction] of [
          ["Dijual", "Dijual"],
          ["Sewa", "Disewa"],
          ["Over Kredit", "Over Kredit"],
        ]) {
          await page.goto(`${origin}/beranda`);
          await page.getByRole("button", { name: label, exact: true }).click();
          await expect(page).toHaveURL(new RegExp("/properti\\?transaksi="));
          assert.equal(
            new URL(page.url()).searchParams.get("transaksi"),
            transaction,
          );
          await expect(page.locator(".property-card").first()).toBeVisible();
          const filtered = await database.query<{ title: string }>(
            `SELECT title FROM "Property" WHERE status='PUBLISHED' AND "values"->>'transaksi'=$1 ORDER BY "createdAt" DESC,id ASC LIMIT 18`,
            [transaction],
          );
          await expect(page.locator(".property-card h3")).toHaveText(
            filtered.rows.map((r) => r.title),
          );
        }
        await page.goto(`${origin}/beranda`);
        await page
          .locator('.home-search input[name="q"]:visible')
          .fill("Rumah");
        if (width > 560) {
          await page
            .locator('.home-search select[name="jenis"]')
            .selectOption("Rumah");
          await page
            .locator('.home-search select[name="harga"]')
            .selectOption("2000000000");
        }
        await page.getByRole("button", { name: "Sewa", exact: true }).click();
        await expect(page).toHaveURL(/transaksi=Disewa/);
        const query = new URL(page.url()).searchParams;
        assert.equal(query.get("q"), "Rumah");
        if (width > 560) {
          assert.equal(query.get("jenis"), "Rumah");
          assert.equal(query.get("harga"), "2000000000");
        }
        await expect(page.locator(".property-card")).toHaveCount(12);
        assert.deepEqual(errors, []);
        await context.close();
      }
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
