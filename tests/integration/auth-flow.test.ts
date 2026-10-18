import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { request } from "@playwright/test";

test(
  "HTTP signup, Prisma credentials, fresh roles, logout and protected pages",
  { timeout: 180000 },
  async () => {
    const database = await PGlite.create();
    const postgres = new PGLiteSocketServer({
      db: database,
      host: "127.0.0.1",
      port: 0,
    });
    await postgres.start();
    const socket = createServer().listen(0, "127.0.0.1");
    await once(socket, "listening");
    const address = socket.address();
    assert.ok(address && typeof address === "object");
    const port = address.port;
    await new Promise<void>((resolve) => socket.close(() => resolve()));
    const origin = `http://127.0.0.1:${port}`;
    for (const migration of (await readdir("prisma/migrations"))
      .filter((name) => name.startsWith("20"))
      .sort())
      await database.exec(
        await readFile(`prisma/migrations/${migration}/migration.sql`, "utf8"),
      );
    const pgAddress = postgres.getServerConn();
    const child = spawn(
      process.execPath,
      [
        "node_modules/next/dist/bin/next",
        "dev",
        "--hostname",
        "127.0.0.1",
        "--port",
        String(port),
      ],
      {
        env: {
          ...process.env,
          DATABASE_URL: `postgresql://postgres:postgres@${pgAddress}/postgres`,
          AUTH_SECRET: "isolated-test-secret-".repeat(3),
          NEXT_PUBLIC_SITE_URL: "https://canonical.example.test",
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let logs = "";
    child.stdout.on("data", (data) => (logs += data));
    child.stderr.on("data", (data) => (logs += data));
    let client;
    try {
      for (let i = 0; i < 120; i++) {
        try {
          if ((await fetch(`${origin}/api/auth/session`)).ok) break;
        } catch {}
        if (child.exitCode !== null) throw new Error(logs);
        await delay(500);
      }
      client = await request.newContext({ baseURL: origin });
      const anonymous = await client.get("/akun");
      assert.ok(
        anonymous.url().includes("/login") ||
          (await anonymous.text()).includes("NEXT_REDIRECT;replace;/login"),
      );
      const credentials = {
        email: "user@example.test",
        password: "password123",
      };
      assert.equal(
        (
          await client.post("/api/auth/register", {
            data: { ...credentials, name: "Auth Test", role: "ADMIN" },
            headers: { origin: "https://evil.test" },
          })
        ).status(),
        403,
      );
      assert.equal(
        (
          await client.post("/api/auth/register", {
            data: { ...credentials, name: "Auth Test", role: "ADMIN" },
            headers: { origin },
          })
        ).status(),
        201,
      );
      assert.equal(
        (
          await client.post("/api/auth/register", {
            data: { ...credentials, name: "Duplicate" },
            headers: { origin },
          })
        ).status(),
        409,
      );
      const login = async (password: string) => {
        const { csrfToken } = await (
          await client!.get("/api/auth/csrf")
        ).json();
        return client!.post("/api/auth/callback/credentials", {
          form: {
            ...credentials,
            password,
            csrfToken,
            callbackUrl: `${origin}/akun`,
          },
          headers: { "X-Auth-Return-Redirect": "1", origin },
        });
      };
      await login("wrongpassword");
      assert.deepEqual(
        await (await client.get("/api/auth/session")).json(),
        null,
      );
      await login(credentials.password);
      const session = await (await client.get("/api/auth/session")).json();
      assert.equal(session.user.email, credentials.email);
      const users = await database.query<{
        id: string;
        role: string;
        passwordHash: string;
      }>('SELECT * FROM "AppUser"');
      assert.equal(users.rows.length, 1);
      assert.equal(users.rows[0].role, "USER");
      assert.ok(users.rows[0].passwordHash.startsWith("scrypt:"));
      const cookies = (await client.storageState()).cookies;
      assert.ok(
        cookies.some(
          (cookie) =>
            cookie.name === "authjs.session-token" &&
            cookie.httpOnly &&
            !cookie.secure,
        ),
      );
      const account = await client.get("/akun");
      assert.equal(new URL(account.url()).pathname, "/akun");
      assert.ok((await account.text()).includes("Auth Test"));
      assert.ok(
        (await (await client.get("/admin")).text()).includes(
          "Akses khusus administrator.",
        ),
      );
      await database.query(
        "UPDATE \"AppUser\" SET role = 'ADMIN' WHERE id = $1",
        [users.rows[0].id],
      );
      assert.ok(
        !(await (await client.get("/admin")).text()).includes(
          "Akses khusus administrator.",
        ),
      );
      const { csrfToken } = await (await client.get("/api/auth/csrf")).json();
      await client.post("/api/auth/signout", {
        form: { csrfToken },
        headers: { "X-Auth-Return-Redirect": "1", origin },
      });
      assert.deepEqual(
        await (await client.get("/api/auth/session")).json(),
        null,
      );
      const signedOut = await client.get("/akun");
      assert.ok(
        signedOut.url().includes("/login") ||
          (await signedOut.text()).includes("NEXT_REDIRECT;replace;/login"),
      );
      // Account-level rate limits persist in PostgreSQL and apply to valid credentials too.
      for (let i = 0; i < 9; i++) await login("wrongpassword");
      const blocked = await login(credentials.password);
      assert.ok((await blocked.text()).includes("rate_limited"));
    } catch (error) {
      console.error(logs.slice(-4000));
      throw error;
    } finally {
      await client?.dispose();
      if (child.exitCode === null && child.signalCode === null) {
        const exited = once(child, "exit");
        child.kill("SIGTERM");
        await exited;
      }
      await postgres.stop();
      await database.close();
    }
  },
);
