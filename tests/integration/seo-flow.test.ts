import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
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
      INSERT INTO "SiteSettings" (id,whatsapp,email) VALUES ('main','081234567890','kontak@example.test');
      INSERT INTO "AppUser" (id,name,email,"passwordHash") VALUES ('owner','Owner','owner@example.test','unusable');
      INSERT INTO "Property" (id,slug,title,description,gallery,whatsapp,"ownerId",status,"updatedAt") VALUES
      ('published','rumah-cikarang','Rumah Cikarang','Rumah untuk keluarga di Cikarang.',ARRAY['/api/media/test-image'],'','owner','PUBLISHED',NOW()),
      ('pending','rumah-private','Rumah Privat','Belum diterbitkan.',ARRAY[]::text[],'','owner','PENDING',NOW());
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
          const expectedHomeTitle = "Jual - Beli - Over Kredit Properti";
          const expectedHomeDescription =
            "Jual, beli, sewa, dan over kredit properti di seluruh Indonesia. Temukan rumah, tanah, apartemen, dan ruko atau pasang iklan di Mr Properti.";
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
            "Kenali Mr Properti, platform jual beli over kredit properti di seluruh Indonesia dengan layanan pekerjaan dan perbaikan rumah tempat usaha di Bekasi, Cikarang, Karawang, dan Cikampek.",
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
            property.includes("<title>Rumah Cikarang | MR Properti</title>"),
          );
          for (const [html, title] of [
            [article, "Tips Rumah Bekasi"],
            [property, "Rumah Cikarang"],
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
          assert.ok(/name="robots" content="[^"]*noindex/.test(form));
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
