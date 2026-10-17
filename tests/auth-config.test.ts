import { test } from "node:test";
import assert from "node:assert/strict";
import { inspectAuthEnvironment } from "../lib/auth-config";
import { authErrorMessage } from "../lib/auth-feedback";
import { mkdtemp, readFile, writeFile, rm, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
test("JWKS public keys never substitute for the auth endpoint or signing secret", () => {
  const c = inspectAuthEnvironment({ JWKS_NEON: '{"keys":[]}' });
  assert.equal(c.configured, false);
  assert.deepEqual(c.missing, ["NEON_AUTH_URL", "NEON_AUTH_COOKIE_SECRET"]);
});
test("auth configuration accepts Neon HTTPS and local development, rejects insecure remote URLs", () => {
  const secret = "test-only-cookie-secret-with-32-characters";
  assert.equal(
    inspectAuthEnvironment({
      NEON_AUTH_URL: "https://auth.example.test/neondb/auth/",
      NEON_AUTH_COOKIE_SECRET: secret,
    }).baseUrl,
    "https://auth.example.test/neondb/auth",
  );
  for (const url of [
    "http://evil.example",
    "not-a-url",
    "https://user:pass@auth.example",
    "https://auth.example/path?key=value",
  ])
    assert.equal(
      inspectAuthEnvironment({
        NEON_AUTH_URL: url,
        NEON_AUTH_COOKIE_SECRET: secret,
      }).configured,
      false,
    );
  assert.equal(
    inspectAuthEnvironment({
      NEON_AUTH_URL: "http://127.0.0.1:3201/auth",
      NEON_AUTH_COOKIE_SECRET: secret,
    }).configured,
    true,
  );
  assert.equal(
    inspectAuthEnvironment({
      NEON_AUTH_URL: "https://auth.example",
      NEON_AUTH_COOKIE_SECRET: "short",
    }).configured,
    false,
  );
});
test("login feedback distinguishes email verification, service errors and trusted-origin configuration", () => {
  assert.match(
    authErrorMessage({ code: "email_not_confirmed" }, false),
    /Email belum diverifikasi/,
  );
  assert.match(
    authErrorMessage({ code: "EMAIL_NOT_VERIFIED" }, false),
    /Email belum diverifikasi/,
  );
  assert.match(
    authErrorMessage({ code: "INVALID_ORIGIN" }, false),
    /belum diizinkan/,
  );
  assert.match(
    authErrorMessage({ status: 503 }, false),
    /belum dapat dijangkau/,
  );
  assert.match(authErrorMessage({ status: 429 }, false), /Terlalu banyak/);
});
test("auth setup generates a private local cookie secret once without overwriting files or logging values", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "mrpro-auth-"));
  try {
    await writeFile(join(cwd, ".env.local"), "CUSTOM_SETTING=keep\n");
    const env = { ...process.env };
    for (const k of [
      "DATABASE_URL",
      "NEON_AUTH_URL",
      "NEON_AUTH_COOKIE_SECRET",
      "NEXT_PUBLIC_SITE_URL",
      "JWKS_NEON",
    ])
      delete env[k];
    env.DATABASE_URL = "postgresql://test:test@127.0.0.1/test";
    env.NEON_AUTH_URL = "https://auth.example.test/auth";
    env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
    const run = () =>
      spawnSync(
        process.execPath,
        [
          resolve("node_modules/tsx/dist/cli.mjs"),
          resolve("scripts/auth-setup.ts"),
          "--offline",
        ],
        { cwd, env, encoding: "utf8", timeout: 15000 },
      );
    const first = run();
    assert.equal(first.status, 0, first.stderr);
    const text = await readFile(join(cwd, ".env.local"), "utf8");
    assert.match(text, /CUSTOM_SETTING=keep/);
    const secret = text.match(/NEON_AUTH_COOKIE_SECRET=(.+)/)?.[1];
    assert.ok(secret && secret.length >= 32);
    assert.equal(first.stdout.includes(secret), false);
    assert.equal((await stat(join(cwd, ".env.local"))).isFile(), true);
    const second = run();
    assert.equal(second.status, 0, second.stderr);
    assert.equal(
      (await readFile(join(cwd, ".env.local"), "utf8")) === text,
      true,
    );
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
