import { test } from "node:test";
import assert from "node:assert/strict";
import { inspectAuthEnvironment } from "../lib/auth-config";
import { hashPassword, verifyPassword } from "../lib/password";
test("auth requires a signing secret and Prisma database", () => {
  assert.equal(inspectAuthEnvironment({}).configured, false);
  assert.equal(
    inspectAuthEnvironment({
      AUTH_SECRET: "short",
      DATABASE_URL: "postgresql://localhost/test",
    }).configured,
    false,
  );
  assert.equal(
    inspectAuthEnvironment({
      AUTH_SECRET: "a".repeat(32),
      DATABASE_URL: "postgresql://localhost/test",
    }).configured,
    true,
  );
});
test("password hashes use random salt and reject incorrect passwords", async () => {
  const hash = await hashPassword("password123");
  assert.notEqual(hash, await hashPassword("password123"));
  assert.equal(await verifyPassword("password123", hash), true);
  assert.equal(await verifyPassword("incorrect", hash), false);
  assert.equal(await verifyPassword("password123", "invalid"), false);
});
