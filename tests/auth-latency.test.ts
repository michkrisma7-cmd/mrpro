import { test } from "node:test";
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import {
  handleAuthProxyRequest,
  NEON_AUTH_SESSION_COOKIE_NAME,
  NEON_AUTH_SESSION_DATA_COOKIE_NAME,
  validateSessionData,
} from "@neondatabase/auth/server";

test("a session lookup slower than three seconds still mints a verifiable cookie", async (t) => {
  const now = new Date().toISOString();
  const secret = "local-regression-test-secret-at-least-32-characters";
  const session = {
    session: {
      id: "session-1",
      userId: "user-1",
      token: "test-token",
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      createdAt: now,
      updatedAt: now,
    },
    user: {
      id: "user-1",
      name: "Test User",
      email: "test@example.test",
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    },
  };
  let calls = 0;
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: unknown, init?: RequestInit) => {
      calls++;
      if (calls === 1)
        await delay(3250, undefined, { signal: init?.signal ?? undefined });
      return Response.json(session);
    },
  );
  const response = await handleAuthProxyRequest({
    request: new Request("https://app.example.test/akun", {
      headers: { cookie: `${NEON_AUTH_SESSION_COOKIE_NAME}=test-token` },
    }),
    path: "get-session",
    baseUrl: "https://auth.example.test/auth",
    cookieSecret: secret,
  });
  assert.equal(response.status, 200);
  const cookie = response.headers
    .getSetCookie()
    .find((value) =>
      value.startsWith(`${NEON_AUTH_SESSION_DATA_COOKIE_NAME}=`),
    );
  assert.ok(
    cookie,
    "the slow upstream must not prevent minting the session cache",
  );
  const signed = cookie
    .split(";")[0]
    .slice(NEON_AUTH_SESSION_DATA_COOKIE_NAME.length + 1);
  const verified = await validateSessionData(signed, secret);
  assert.equal(verified.valid, true);
  assert.equal(verified.payload?.user?.id, "user-1");
  assert.equal(
    calls,
    1,
    "cache refresh must use a single upstream session lookup",
  );

  const cached = await handleAuthProxyRequest({
    request: new Request("https://app.example.test/akun", {
      headers: {
        cookie: `${NEON_AUTH_SESSION_COOKIE_NAME}=test-token; ${cookie.split(";")[0]}`,
      },
    }),
    path: "get-session",
    baseUrl: "https://auth.example.test/auth",
    cookieSecret: secret,
  });
  assert.equal((await cached.json()).user.id, "user-1");
  assert.equal(
    calls,
    1,
    "subsequent navigation must use the signed session cache",
  );
  assert.equal(
    (await validateSessionData(signed, "wrong-secret")).valid,
    false,
  );
});
