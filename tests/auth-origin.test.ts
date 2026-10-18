import { test } from "node:test";
import assert from "node:assert/strict";
import { registrationOriginAllowed } from "../lib/auth-origin";
const canonical = "https://mrproperti.example";
function request(url: string, origin?: string) {
  return new Request(url, { headers: origin ? { origin } : {} });
}
test("local signup follows request origin despite a different canonical site URL", () => {
  for (const origin of [
    "http://localhost:3000",
    "http://127.0.0.1:3100",
    "https://localhost:3000",
  ]) {
    const env = { NODE_ENV: "development", NEXT_PUBLIC_SITE_URL: canonical };
    assert.equal(
      registrationOriginAllowed(
        request(`${origin}/api/auth/register`, origin),
        env,
      ),
      true,
    );
    assert.equal(
      registrationOriginAllowed(
        request(`${origin}/api/auth/register`, "https://evil.example"),
        env,
      ),
      false,
    );
    assert.equal(
      registrationOriginAllowed(request(`${origin}/api/auth/register`), env),
      false,
    );
  }
});
test("production signup enforces canonical origin behind a reverse proxy", () => {
  const env = { NODE_ENV: "production", NEXT_PUBLIC_SITE_URL: canonical };
  assert.equal(
    registrationOriginAllowed(
      request("http://web:3000/api/auth/register", canonical),
      env,
    ),
    true,
  );
  assert.equal(
    registrationOriginAllowed(
      request("http://web:3000/api/auth/register", "http://localhost:3000"),
      env,
    ),
    false,
  );
  assert.equal(
    registrationOriginAllowed(
      request("http://web:3000/api/auth/register", "null"),
      env,
    ),
    false,
  );
});
