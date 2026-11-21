import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "@playwright/test";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

// Run after next build. Uses an isolated PostgreSQL database and never the local .env database.
test(
  "production HTML metadata, public sitemap, structured data and beta indexing",
  { timeout: 120000 },
  async () => {
    const database = await PGlite.create();
    const postgres = new PGLiteSocketServer({
      db: database,
      host: "127.0.0.1",
      port: 0,
      maxConnections: 20,
    });
    try {
      for (const name of (await readdir("prisma/migrations"))
        .filter((name) => /^20/.test(name))
        .sort())
        await database.exec(
          await readFile(`prisma/migrations/${name}/migration.sql`, "utf8"),
        );
      await database.exec(`
      INSERT INTO "PropertyField" (id,key,name,type,options,"showOnCard","showOnDetail") VALUES ('harga','harga','Harga','PRICE',ARRAY[]::text[],true,true);
      INSERT INTO "SiteSettings" (id,whatsapp,email) VALUES ('main','081234567890','kontak@example.test');
      INSERT INTO "AppUser" (id,name,email,"passwordHash") VALUES ('owner','Owner','owner@example.test','unusable');
      INSERT INTO "Property" (id,slug,title,description,gallery,whatsapp,"ownerId",status,"updatedAt") VALUES
      ('published','rumah-cikarang','Rumah Cikarang','Rumah untuk keluarga di Cikarang.',ARRAY['/api/media/test-image'],'','owner','PUBLISHED',NOW()),
      ('pending','rumah-private','Rumah Privat','Belum diterbitkan.',ARRAY[]::text[],'','owner','PENDING',NOW());
      UPDATE "Property" SET values = '{"harga":185000000,"jenis":"Rumah","transaksi":"Dijual","kota_kabupaten":"Kabupaten Bekasi","kecamatan":"Cikarang Utara"}'::jsonb WHERE id='published';
      INSERT INTO "Service" (id,slug,type,"workerName",skills,description,"minPrice",whatsapp,active) VALUES
      ('service','renovasi-bekasi','Renovasi Rumah','Budi',ARRAY['Keramik'],'Renovasi rumah di Bekasi.',70000,'',true),
      ('inactive','layanan-private','Layanan Privat','Test',ARRAY[]::text[],'Tidak aktif.',10000,'',false);
      INSERT INTO "BlogPost" (id,slug,title,excerpt,content,published,"updatedAt") VALUES
      ('article','tips-rumah','Tips Rumah Bekasi','Panduan memilih rumah di Bekasi.','Kenali lingkungan dan akses rumah.',true,NOW()),
      ('draft','artikel-private','Draf Privat','Belum diterbitkan.','Konten draf.',false,NOW());
    `);
      await postgres.start();
      for (const enabled of [true, false]) {
        const listener = createServer().listen(0, "127.0.0.1");
        await once(listener, "listening");
        const address = listener.address();
        assert.ok(address && typeof address === "object");
        const port = address.port;
        await new Promise<void>((resolve) => listener.close(() => resolve()));
        const local = `http://127.0.0.1:${port}`;
        const canonical = "https://seo-runtime.example";
        const child = spawn(
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
              NODE_ENV: "production",
              DATABASE_URL: `postgresql://postgres:postgres@${postgres.getServerConn()}/postgres`,
              NEXT_PUBLIC_SITE_URL: canonical,
              SEO_INDEXING: String(enabled),
              VERCEL_ENV: "production",
            },
            stdio: ["ignore", "pipe", "pipe"],
          },
        );
        let logs = "";
        child.stdout.on("data", (chunk) => (logs += chunk));
        child.stderr.on("data", (chunk) => (logs += chunk));
        async function get(path: string) {
          return fetch(`${local}${path}`, {
            headers: { "user-agent": "Twitterbot" },
          });
        }
        try {
          let ready = false;
          for (let i = 0; i < 80; i++) {
            try {
              if ((await get("/robots.txt")).ok) {
                ready = true;
                break;
              }
            } catch {}
            if (child.exitCode !== null) throw new Error(logs);
            await delay(250);
          }
          assert.ok(ready, "production server started");
          const robots = await (await get("/robots.txt")).text();
          const home = await (await get("/")).text();
          const expectedHomeTitle =
            "MR Properti — Jual, Sewa &amp; Over Kredit Rumah Bekasi–Cikampek";
          const expectedHomeDescription =
            "Cari properti di Kota dan Kabupaten Bekasi, Cikarang, Karawang, dan Cikampek. Pasang iklan jual, sewa, atau over kredit dari seluruh Indonesia.";
          function assertDescriptions(html: string, expected: string) {
            const head = html.match(/<head>([\s\S]*?)<\/head>/)?.[1] || "";
            for (const attribute of [
              'name="description"',
              'property="og:description"',
              'name="twitter:description"',
            ]) {
              const tags = head.match(
                new RegExp(`<meta ${attribute} content="[^"]*"`, "g"),
              );
              assert.deepEqual(tags, [
                `<meta ${attribute} content="${expected}"`,
              ]);
            }
          }
          for (const [path, userAgent] of ["/", "/beranda"].flatMap((path) =>
            ["Twitterbot", "facebookexternalhit/1.1", "WhatsApp/2.0"].map(
              (agent) => [path, agent],
            ),
          )) {
            const html = await (
              await fetch(`${local}${path}`, {
                headers: { "user-agent": userAgent },
              })
            ).text();
            const head = html.match(/<head>([\s\S]*?)<\/head>/)?.[1] || "";
            assert.deepEqual(
              [...head.matchAll(/<title>(.*?)<\/title>/g)].map(
                (match) => match[1],
              ),
              [expectedHomeTitle],
              `${userAgent}: exact server-rendered title`,
            );
            for (const attribute of [
              'property="og:title"',
              'name="twitter:title"',
            ])
              assert.ok(
                head.includes(`${attribute} content="${expectedHomeTitle}"`),
                `${userAgent}: ${attribute}`,
              );
            assert.ok(head.includes("/images/hero.webp"));
            assertDescriptions(html, expectedHomeDescription);
          }
          assert.ok(home.includes("properti di seluruh Indonesia"));
          assert.ok(
            home.includes(`rel="canonical" href="${canonical}/"`) ||
              home.includes(`rel="canonical" href="${canonical}"`),
            `canonical uses runtime domain, not build-time localhost: ${home.match(/<link rel="canonical"[^>]+>/)?.[0]}`,
          );
          assert.equal(
            /name="robots" content="[^"]*noindex/.test(home),
            !enabled,
          );
          const sitemap = await (await get("/sitemap.xml")).text();
          if (!enabled) {
            assert.ok(robots.includes("Disallow: /"));
            assert.ok(!sitemap.includes("<loc>"));
            continue;
          }
          assert.ok(robots.includes("Allow: /api/media/"));
          assert.ok(robots.includes(`Sitemap: ${canonical}/sitemap.xml`));
          for (const path of [
            "properti/rumah-cikarang",
            "layanan/renovasi-bekasi",
            "blog/tips-rumah",
          ])
            assert.ok(sitemap.includes(`${canonical}/${path}`));
          for (const slug of [
            "rumah-private",
            "layanan-private",
            "artikel-private",
          ])
            assert.ok(!sitemap.includes(slug));
          assert.ok(sitemap.includes(`${canonical}/api/media/test-image`));
          const index = await (await get("/wilayah")).text();
          assert.ok(
            index.includes(
              `<title>Jelajahi Properti Berdasarkan Wilayah | MR Properti</title>`,
            ),
          );
          assert.ok(
            index.includes(`rel="canonical" href="${canonical}/wilayah"`),
          );
          assert.ok(index.includes('name="robots" content="index, follow"'));
          assertDescriptions(
            index,
            "Temukan rumah, tanah, ruko, dan pilihan properti lainnya di Bekasi, Cikarang, Karawang, dan Cikampek.",
          );
          assert.ok(sitemap.includes(`${canonical}/wilayah</loc>`));
          const schemas = (html: string) =>
            [
              ...html.matchAll(
                /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
              ),
            ].flatMap((match) => JSON.parse(match[1]));
          assert.equal(
            schemas(index).find((s) => s["@type"] === "ItemList")
              .itemListElement.length,
            4,
          );
          assert.ok(
            schemas(index).find((s) => s["@type"] === "BreadcrumbList"),
          );
          const subTitles = new Set<string>();
          const subDescriptions = new Set<string>();
          for (const slug of ["bekasi", "cikarang", "karawang", "cikampek"]) {
            const html = await (await get(`/wilayah/${slug}`)).text();
            subTitles.add(html.match(/<title>(.*?)<\/title>/)![1]);
            subDescriptions.add(
              html.match(/<meta name="description" content="([^"]*)"/)![1],
            );
            assert.ok(
              html.includes(
                `rel="canonical" href="${canonical}/wilayah/${slug}"`,
              ),
            );
            const trail = schemas(html).find(
              (s) => s["@type"] === "BreadcrumbList",
            );
            assert.equal(trail.itemListElement[1].item, `${canonical}/wilayah`);
            const list = schemas(html).find((s) => s["@type"] === "ItemList");
            if (list)
              assert.equal(
                new Set(
                  list.itemListElement.map((item: { url: string }) => item.url),
                ).size,
                list.itemListElement.length,
              );
            if (["karawang", "cikampek"].includes(slug)) {
              assert.ok(
                html.includes('name="robots" content="noindex, follow"'),
              );
              assert.ok(!sitemap.includes(`${canonical}/wilayah/${slug}`));
              assert.ok(!list);
            }
          }
          assert.equal(subTitles.size, 4);
          assert.equal(subDescriptions.size, 4);
          const bekasi = await (await get("/wilayah/bekasi")).text();
          const cikarang = await (await get("/wilayah/cikarang")).text();
          const karawang = await (await get("/wilayah/karawang")).text();
          for (const [slug, html] of [
            ["bekasi", bekasi],
            ["cikarang", cikarang],
          ]) {
            assert.ok(
              html.includes(
                `rel="canonical" href="${canonical}/wilayah/${slug}"`,
              ),
            );
            assert.ok(html.includes(`/properti/rumah-cikarang`));
            assert.ok(html.includes('name="robots" content="index, follow"'));
            assert.ok(sitemap.includes(`${canonical}/wilayah/${slug}`));
            assert.ok(html.includes('"@type":"CollectionPage"'));
            assert.ok(html.includes('"@type":"ItemList"'));
            assert.ok(!html.includes("rumah-private"));
          }
          assert.ok(
            karawang.includes('name="robots" content="noindex, follow"'),
          );
          assert.ok(!sitemap.includes(`${canonical}/wilayah/karawang`));
          assert.ok(karawang.includes("Belum ada iklan yang sesuai saat ini"));
          assert.ok(
            (await (await get("/wilayah/bekasi?page=999")).text()).includes(
              'name="robots" content="noindex, follow"',
            ),
          );
          assert.match(
            await (await get("/wilayah/bogor")).text(),
            /name="robots" content="noindex"/,
          );
          const listingForm = await (await get("/titip-properti")).text();
          assert.ok(
            listingForm.includes("harga jual adalah harga total properti"),
          );
          assert.ok(listingForm.includes('name="field_harga"'));
          assert.ok(listingForm.includes("sisa tenor"));
          const browser = await chromium.launch({
            headless: true,
            ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
              ? {
                  executablePath:
                    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
                }
              : {}),
          });
          try {
            const page = await browser.newPage();
            for (const width of [390, 1280]) {
              await page.setViewportSize({ width, height: 900 });
              await page.goto(`${local}/properti`);
              await page
                .getByRole("link", { name: "Semua wilayah", exact: true })
                .click();
              await page.waitForURL("**/wilayah");
              assert.equal(await page.locator(".service-card").count(), 4);
              const expectedCounts: Record<string, number> = {
                bekasi: 1,
                cikarang: 1,
                karawang: 0,
                cikampek: 0,
              };
              for (const [slug, name] of [
                ["bekasi", "Bekasi"],
                ["cikarang", "Cikarang"],
                ["karawang", "Karawang"],
                ["cikampek", "Cikampek"],
              ]) {
                assert.equal(await page.locator(`#area-${slug}`).count(), 1);
                const card = page
                  .locator(".service-card")
                  .filter({ has: page.locator(`#area-${slug}`) });
                assert.ok(
                  (await card.textContent())!.includes(
                    `${expectedCounts[slug]} listing aktif`,
                  ),
                );
                await card
                  .getByRole("link", {
                    name: `Lihat Properti di ${name}`,
                    exact: true,
                  })
                  .click();
                await page.waitForURL(`**/wilayah/${slug}`);
                const hrefs = await page
                  .locator(".property-card a.card-more")
                  .evaluateAll((links) =>
                    links.map((link) => link.getAttribute("href")),
                  );
                assert.equal(new Set(hrefs).size, hrefs.length);
                assert.equal(hrefs.length, expectedCounts[slug]);
                assert.ok(
                  await page.evaluate(
                    () => document.documentElement.scrollWidth <= innerWidth,
                  ),
                );
                await page
                  .getByRole("navigation", { name: "Breadcrumb", exact: true })
                  .getByRole("link", { name: "Wilayah", exact: true })
                  .click();
                await page.waitForURL("**/wilayah");
              }
              assert.ok(
                await page.evaluate(
                  () => document.documentElement.scrollWidth <= innerWidth,
                ),
              );
              await page.screenshot({
                path: `work/wilayah-index-${width}.png`,
                fullPage: true,
              });
              await page.goto(`${local}/properti`);
              await page
                .getByRole("link", { name: "Properti Cikarang", exact: true })
                .click();
              await page.waitForURL("**/wilayah/cikarang");
              await page
                .getByRole("heading", {
                  level: 1,
                  name: "Rumah Dijual, Subsidi & Over Kredit di Cikarang",
                })
                .waitFor();
              assert.equal(
                await page.locator(".property-card a.card-more").count(),
                1,
              );
              assert.equal(
                await page
                  .locator('link[rel="canonical"]')
                  .getAttribute("href"),
                `${canonical}/wilayah/cikarang`,
              );
              await page.goto(`${local}/titip-properti`);
              await page.locator('input[name="field_harga"]').fill("200000000");
              assert.equal(
                await page.locator('input[name="field_harga"]').inputValue(),
                "200000000",
              );
              assert.equal(
                await page
                  .locator('input[name="field_harga"]')
                  .getAttribute("min"),
                "0",
              );
              assert.ok(
                await page
                  .getByText(
                    "Untuk transaksi dijual, harga jual adalah harga total properti.",
                    { exact: false },
                  )
                  .isVisible(),
              );
            }
          } finally {
            await browser.close();
          }
          const about = await (await get("/tentang-kami")).text();
          const services = await (await get("/layanan")).text();
          const localAreaDescription =
            "Untuk sementara, wilayah layanan pekerjaan kami masih terbatas di Bekasi, Cikarang, Karawang, dan Cikampek. Ketersediaan layanan di setiap lokasi disesuaikan dengan jenis pekerjaan, akses lokasi, dan kesiapan tim.";
          for (const html of [about, services]) {
            const content = html
              .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "")
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ");
            assert.equal(
              content.split(localAreaDescription).length,
              2,
              "one local work-area notice",
            );
            assert.ok(
              !content.includes("Wilayah kerja kami saat ini mencakup"),
            );
          }
          assertDescriptions(
            about,
            "Kenali fokus pemasaran Mr Properti di Kota dan Kabupaten Bekasi, Cikarang, Karawang, dan Cikampek. Platform iklan tetap terbuka untuk seluruh Indonesia.",
          );
          const partnership = await (await get("/kemitraan")).text();
          assertDescriptions(
            partnership,
            "Bergabung sebagai mitra MR Properti untuk perbaikan dan renovasi rumah di Cikarang, Bekasi, Karawang, dan Cikampek.",
          );
          const parseSchemas = (html: string): Record<string, unknown>[] =>
            [
              ...html.matchAll(
                /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
              ),
            ].flatMap((match) => {
              const data = JSON.parse(match[1]);
              return data["@graph"] || data;
            });
          const entities = parseSchemas(home);
          const organizations = entities.filter((item) =>
            ["Organization", "RealEstateAgent"].includes(String(item["@type"])),
          );
          assert.equal(organizations.length, 1);
          const organization = organizations[0];
          assert.equal(organization["@type"], "Organization");
          assert.equal(organization["@id"], `${canonical}/#organization`);
          assert.equal(organization.telephone, "+6281234567890");
          assert.equal(organization.areaServed, undefined);
          const listingPlatform = entities.find(
            (item) => item["@id"] === `${canonical}/#listing-platform`,
          );
          const workService = entities.find(
            (item) => item["@id"] === `${canonical}/#work-services`,
          );
          assert.equal(listingPlatform?.["@type"], "Service");
          assert.equal(workService?.["@type"], "Service");
          assert.deepEqual(listingPlatform?.areaServed, {
            "@type": "Country",
            name: "Indonesia",
          });
          assert.deepEqual(workService?.areaServed, [
            "Bekasi",
            "Cikarang",
            "Karawang",
            "Cikampek",
          ]);
          for (const service of [listingPlatform, workService]) {
            assert.deepEqual(service?.provider, {
              "@id": `${canonical}/#organization`,
            });
          }
          const website = entities.find((item) => item["@type"] === "WebSite");
          assert.deepEqual(website?.publisher, {
            "@id": `${canonical}/#organization`,
          });
          assert.deepEqual(website?.about, [
            { "@id": `${canonical}/#listing-platform` },
            { "@id": `${canonical}/#work-services` },
          ]);
          assert.equal(
            organization.address,
            undefined,
            "no invented office address",
          );
          assert.equal(
            organization.sameAs,
            undefined,
            "no unverified social profiles",
          );
          for (const html of [home, about])
            assert.ok(html.includes('href="tel:+6281234567890"'));
          assert.ok(
            parseSchemas(about).some(
              (item) => item["@type"] === "BreadcrumbList",
            ),
          );
          for (const path of [
            "/brand/mrproperti-logo.png",
            "/images/hero.webp",
          ]) {
            const response = await get(path);
            assert.equal(response.status, 200);
            assert.ok(
              response.headers.get("content-type")?.startsWith("image/"),
            );
          }
          for (const match of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
            const url = new URL(match[1]);
            assert.equal(url.origin, canonical);
            const response = await get(url.pathname);
            assert.equal(response.status, 200, url.pathname);
            const html = await response.text();
            assert.ok(
              !/name="robots" content="[^"]*noindex/.test(html),
              url.pathname,
            );
            parseSchemas(html);
          }
          const page2 = await (await get("/properti?page=2")).text();
          assert.ok(
            page2.includes(
              `rel="canonical" href="${canonical}/properti?page=2"`,
            ),
          );
          const filtered = await (await get("/properti?q=Cikarang")).text();
          assert.ok(/name="robots" content="[^"]*noindex/.test(filtered));
          const article = await (await get("/blog/tips-rumah")).text();
          assert.ok(
            article.includes("<title>Tips Rumah Bekasi | MR Properti</title>"),
          );
          const publisher = parseSchemas(article).find(
            (item) => item["@type"] === "BlogPosting",
          )?.publisher;
          assert.deepEqual(publisher, { "@id": `${canonical}/#organization` });
          const property = await (await get("/properti/rumah-cikarang")).text();
          assert.ok(
            property.includes(
              "<title>Rumah Cikarang di Cikarang Utara, Kabupaten Bekasi | MR Properti</title>",
            ),
          );
          for (const [html, title] of [
            [article, "Tips Rumah Bekasi"],
            [property, "Rumah Cikarang di Cikarang Utara, Kabupaten Bekasi"],
          ])
            for (const attribute of [
              'property="og:title"',
              'name="twitter:title"',
            ])
              assert.ok(
                html.includes(`${attribute} content="${title} | MR Properti"`),
              );
          const scripts = [
            ...article.matchAll(
              /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
            ),
          ].flatMap((match) => JSON.parse(match[1]));
          assert.ok(
            scripts.some(
              (item) => item["@type"] === "BlogPosting" && item.dateModified,
            ),
          );
          assert.ok(scripts.some((item) => item["@type"] === "BreadcrumbList"));
          const service = await (await get("/layanan/renovasi-bekasi")).text();
          assert.ok(
            service.includes('property="og:title" content="Renovasi Rumah'),
          );
          assert.ok(service.includes("Budi di Cikarang dan Bekasi"));
          const serviceCategory = await (await get("/layanan/ac")).text();
          for (const html of [service, serviceCategory]) {
            const schema = parseSchemas(html).find(
              (item) => item["@type"] === "Service",
            );
            assert.deepEqual(schema?.areaServed, [
              "Bekasi",
              "Cikarang",
              "Karawang",
              "Cikampek",
            ]);
            assert.deepEqual(schema?.provider, {
              "@id": `${canonical}/#organization`,
            });
          }
          const form = await (await get("/titip-properti")).text();
          assert.ok(!/name="robots" content="[^"]*noindex/.test(form));
          assert.ok(sitemap.includes(`${canonical}/titip-properti`));
          assert.ok(form.includes("<h1>Pasang Iklan Properti</h1>"));
        } catch (error) {
          console.error(logs.slice(-1500));
          throw error;
        } finally {
          if (child.exitCode === null && child.signalCode === null) {
            const exited = once(child, "exit");
            child.kill("SIGTERM");
            await exited;
          }
        }
      }
    } finally {
      await postgres.stop();
      // pglite-socket schedules socket-close handlers after the server closes.
      await delay(100);
      await database.close();
    }
  },
);
