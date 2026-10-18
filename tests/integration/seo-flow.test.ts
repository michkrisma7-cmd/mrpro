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
          assert.ok(home.includes("Cikarang dan Bekasi"));
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
          const page2 = await (await get("/properti?page=2")).text();
          assert.ok(
            page2.includes(
              `rel="canonical" href="${canonical}/properti?page=2"`,
            ),
          );
          const filtered = await (await get("/properti?q=Cikarang")).text();
          assert.ok(/name="robots" content="[^"]*noindex/.test(filtered));
          const article = await (await get("/blog/tips-rumah")).text();
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
