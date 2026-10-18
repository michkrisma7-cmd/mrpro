import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createConnection, createServer as createTcpServer } from "node:net";
import { createServer } from "node:http";
import { once } from "node:events";
import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes, generateKeyPairSync } from "node:crypto";
import {
  setTimeout as delay,
  setImmediate as nextTurn,
} from "node:timers/promises";
import { chromium } from "@playwright/test";
import { WebSocketServer, WebSocket } from "ws";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { toNodeHandler } from "better-auth/node";
import { defaultFields, defaultSettings } from "../../lib/demo";

async function availablePort() {
  const server = createTcpServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  await new Promise<void>((done) => server.close(() => done()));
  return address.port;
}

test(
  "real login proxy creates a session, persists the user, enforces roles and signs out",
  { timeout: 120000 },
  async () => {
    const database = await PGlite.create();
    const postgres = new PGLiteSocketServer({
      db: database,
      host: "127.0.0.1",
      port: 0,
      maxConnections: 20,
    });
    const wsProxy = new WebSocketServer({ host: "127.0.0.1", port: 0 });
    const cwd = process.cwd();
    const appPort = await availablePort();
    const appOrigin = `http://127.0.0.1:${appPort}`;
    let auth: Parameters<typeof toNodeHandler>[0];
    const service = createServer((request, response) => {
      void toNodeHandler(auth)(request, response);
    });
    let next: ChildProcess | undefined;
    let serverLogs = "";
    const browser = await chromium.launch({
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
        (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
      args: ["--no-sandbox"],
    });
    try {
      if (!wsProxy.address()) await once(wsProxy, "listening");
      await database.exec(
        await readFile(
          "prisma/migrations/202610170001_initial/migration.sql",
          "utf8",
        ),
      );
      await database.exec(
        await readFile(
          "prisma/migrations/202610180001_blog/migration.sql",
          "utf8",
        ),
      );
      for (const f of defaultFields)
        await database.query(
          'INSERT INTO "PropertyField" (id,key,name,type,options,required,"showInForm","showOnCard","showOnDetail","cardLabel",position) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
          [
            f.id,
            f.key,
            f.name,
            f.type,
            f.options,
            f.required,
            f.showInForm,
            f.showOnCard,
            f.showOnDetail,
            f.cardLabel,
            f.position,
          ],
        );
      await database.query(
        'INSERT INTO "SiteSettings" (id,"heroTitle","heroDescription",area) VALUES ($1,$2,$3,$4)',
        [
          "main",
          defaultSettings.heroTitle,
          defaultSettings.heroDescription,
          defaultSettings.area,
        ],
      );
      await postgres.start();
      const pgUrl = new URL(
        `postgresql://postgres:postgres@${postgres.getServerConn()}/postgres`,
      );
      wsProxy.on("connection", (websocket) => {
        const tcp = createConnection({
          host: pgUrl.hostname,
          port: Number(pgUrl.port),
        });
        websocket.on("message", (data) => {
          const bytes = Array.isArray(data)
            ? Buffer.concat(data)
            : Buffer.from(data as ArrayBuffer);
          if (bytes.length === 5 && bytes[0] === 0x58) {
            tcp.destroy();
            websocket.close();
            return;
          }
          tcp.write(bytes);
        });
        tcp.on("data", (bytes) => {
          if (websocket.readyState === WebSocket.OPEN) websocket.send(bytes);
        });
        tcp.on("error", () => websocket.close());
        tcp.on("close", () => websocket.close());
        websocket.on("close", () => tcp.destroy());
        websocket.on("error", () => tcp.destroy());
      });
      const wsAddress = wsProxy.address();
      assert.ok(wsAddress && typeof wsAddress === "object");
      service.listen(0, "127.0.0.1");
      await once(service, "listening");
      const serviceAddress = service.address();
      assert.ok(serviceAddress && typeof serviceAddress === "object");
      const authUrl = `http://127.0.0.1:${serviceAddress.port}/auth`;
      auth = betterAuth({
        baseURL: authUrl,
        basePath: "/auth",
        secret: randomBytes(32).toString("base64url"),
        database: memoryAdapter({
          user: [],
          session: [],
          account: [],
          verification: [],
        }),
        emailAndPassword: { enabled: true },
        trustedOrigins: [appOrigin],
        advanced: { cookiePrefix: "neon-auth", useSecureCookies: true },
        logger: { disabled: true },
      });
      const env = {
        ...process.env,
        DATABASE_URL: pgUrl.href,
        NEON_AUTH_URL: authUrl,
        NEON_AUTH_COOKIE_SECRET: randomBytes(32).toString("base64url"),
        NEXT_PUBLIC_SITE_URL: appOrigin,
        MR_TEST_WEBSOCKET_PROXY: `127.0.0.1:${wsAddress.port}`,
        NODE_OPTIONS: [
          process.env.NODE_OPTIONS,
          `--import=${JSON.stringify(resolve("tests/fixtures/auth-websocket.mjs"))}`,
        ]
          .filter(Boolean)
          .join(" "),
      };
      next = spawn(
        process.execPath,
        [
          resolve("node_modules/next/dist/bin/next"),
          process.env.MR_TEST_NEXT_MODE === "production" ? "start" : "dev",
          "--hostname",
          "127.0.0.1",
          "--port",
          String(appPort),
        ],
        {
          cwd,
          env,
          stdio: ["ignore", "pipe", "pipe"],
          detached: process.platform !== "win32",
        },
      );
      next.stdout?.on("data", (chunk) => {
        serverLogs = (serverLogs + chunk).slice(-5000);
      });
      next.stderr?.on("data", (chunk) => {
        serverLogs = (serverLogs + chunk).slice(-5000);
      });
      const publicKey = generateKeyPairSync("ed25519").publicKey.export({
        format: "jwk",
      });
      const doctor = spawn(
        process.execPath,
        [
          resolve("node_modules/tsx/dist/cli.mjs"),
          resolve("scripts/auth-setup.ts"),
          "--check",
        ],
        {
          env: { ...env, JWKS_NEON: JSON.stringify({ keys: [publicKey] }) },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      let doctorOutput = "";
      doctor.stdout.on("data", (data) => {
        doctorOutput += data;
      });
      doctor.stderr.on("data", (data) => {
        doctorOutput += data;
      });
      const doctorTimer = setTimeout(() => doctor.kill(), 20000);
      const [doctorCode] = await once(doctor, "close");
      clearTimeout(doctorTimer);
      assert.equal(doctorCode, 0, doctorOutput);
      assert.match(doctorOutput, /Endpoint sesi Neon Auth dapat dijangkau/);
      assert.match(doctorOutput, /Database dan tabel AppUser dapat diakses/);
      assert.match(doctorOutput, /Format public JWKS_NEON dikenali/);
      let ready = false;
      for (let i = 0; i < 120; i++) {
        if (next.exitCode !== null)
          throw new Error("Next server stopped: " + serverLogs);
        try {
          const r = await fetch(`${appOrigin}/login`, {
            signal: AbortSignal.timeout(1000),
          });
          if (r.ok) {
            ready = true;
            break;
          }
        } catch {}
        await delay(250);
      }
      assert.ok(ready, "Next login server did not start: " + serverLogs);
      const context = await browser.newContext();
      const page = await context.newPage();
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(`${appOrigin}/login`);
      await page.getByRole("button", { name: "Daftar Akun" }).click();
      const email = `test-${randomBytes(8).toString("hex")}@example.test`;
      const password = randomBytes(18).toString("base64url");
      await page.getByLabel("Nama lengkap").fill("Penguji Login");
      await page.getByLabel("Alamat email").fill(email);
      await page.getByLabel("Kata sandi", { exact: true }).fill(password);
      await page.getByRole("checkbox").check();
      await page.getByRole("button", { name: "Buat Akun" }).click();
      await page
        .waitForURL(`${appOrigin}/akun`, { timeout: 15000 })
        .catch(async (error) => {
          console.error(
            "Login feedback:",
            await page.locator('.auth-card [role="alert"]').allTextContents(),
          );
          console.error(
            "Cookie metadata:",
            (await context.cookies()).map((c) => ({
              name: c.name,
              secure: c.secure,
              httpOnly: c.httpOnly,
            })),
          );
          console.error("Browser errors:", errors);
          console.error("Server diagnostics:", serverLogs);
          throw error;
        });
      await page
        .getByRole("heading", { name: "Halo, Penguji Login." })
        .waitFor();
      const users = await database.query<{ role: string; authId: string }>(
        'SELECT role,"authId" FROM "AppUser"',
      );
      assert.equal(users.rows.length, 1);
      assert.equal(users.rows[0].role, "USER");
      assert.ok(
        (await context.cookies()).some(
          (c) =>
            c.name === "__Secure-neon-auth.session_token" &&
            c.httpOnly &&
            c.secure,
        ),
      );
      await page.goto(`${appOrigin}/admin`);
      await page
        .getByRole("heading", { name: "Akses khusus administrator." })
        .waitFor();
      await page.goto(`${appOrigin}/akun`);
      await page.getByRole("button", { name: "Keluar akun" }).click();
      await page.waitForURL(appOrigin + "/");
      await page.goto(`${appOrigin}/akun`);
      await page.waitForURL(`${appOrigin}/login`);
      await page.getByLabel("Alamat email").fill(email);
      await page
        .getByLabel("Kata sandi", { exact: true })
        .fill("wrong-password-for-test");
      await page.getByRole("button", { name: "Masuk ke Akun" }).click();
      await page.locator('.auth-card [role="alert"]').waitFor();
      assert.match(
        await page.locator('.auth-card [role="alert"]').innerText(),
        /Email atau kata sandi/,
      );
      await page.getByLabel("Kata sandi", { exact: true }).fill(password);
      // Simulate a browser rejecting the secure cookies after a successful login.
      await page.route("**/api/auth/get-session**", async (route) => {
        const headers = route.request().headers();
        delete headers.cookie;
        await route.continue({ headers });
      });
      await page.getByRole("button", { name: "Masuk ke Akun" }).click();
      await page
        .getByRole("alert")
        .filter({ hasText: "Sesi login belum tersimpan" })
        .waitFor();
      assert.equal(page.url(), `${appOrigin}/login`);
      await page.unroute("**/api/auth/get-session**");
      await page.getByRole("button", { name: "Masuk ke Akun" }).click();
      await page.waitForURL(`${appOrigin}/akun`);
      await page.reload();
      await page
        .getByRole("heading", { name: "Halo, Penguji Login." })
        .waitFor();
      await context.clearCookies({
        name: "__Secure-neon-auth.local.session_data",
      });
      await page.reload();
      await page
        .getByRole("heading", { name: "Halo, Penguji Login." })
        .waitFor();
      assert.ok(
        (await context.cookies()).some(
          (c) => c.name === "__Secure-neon-auth.local.session_data",
        ),
      );
      const grant = spawn(
        process.execPath,
        [
          resolve("node_modules/tsx/dist/cli.mjs"),
          resolve("scripts/grant-admin.ts"),
          users.rows[0].authId,
        ],
        { env, stdio: ["ignore", "pipe", "pipe"] },
      );
      let grantOutput = "";
      grant.stdout.on("data", (data) => {
        grantOutput += data;
      });
      grant.stderr.on("data", (data) => {
        grantOutput += data;
      });
      const grantTimer = setTimeout(() => grant.kill(), 20000);
      const [grantCode] = await once(grant, "close");
      clearTimeout(grantTimer);
      assert.equal(grantCode, 0, grantOutput);
      assert.equal(
        (await database.query<{ role: string }>('SELECT role FROM "AppUser"'))
          .rows[0].role,
        "ADMIN",
      );
      await page.goto(`${appOrigin}/admin`);
      await page
        .getByRole("heading", { name: "Semua rencana, satu tempat." })
        .waitFor();
      assert.deepEqual(errors, []);
      await context.close();
    } finally {
      await browser.close();
      if (next?.pid) {
        try {
          if (process.platform !== "win32") process.kill(-next.pid, "SIGTERM");
          else next.kill();
        } catch {}
        await Promise.race([once(next, "close").catch(() => {}), delay(3000)]);
      }
      service.closeAllConnections();
      await new Promise<void>((done) => service.close(() => done()));
      for (const client of wsProxy.clients) client.terminate();
      await new Promise<void>((done) => wsProxy.close(() => done()));
      await postgres.stop();
      // Socket handlers schedule rollback/cleanup on the next event-loop turn.
      await nextTurn();
      await database.runExclusive(async () => {});
      await nextTurn();
      await database.close();
    }
  },
);
