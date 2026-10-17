export function inspectAuthEnvironment(
  env: Record<string, string | undefined>,
) {
  const missing: string[] = [];
  const invalid: string[] = [];
  let baseUrl = "";
  if (!env.NEON_AUTH_URL?.trim()) missing.push("NEON_AUTH_URL");
  else {
    try {
      const url = new URL(env.NEON_AUTH_URL.trim());
      const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
      if (
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        (url.protocol !== "https:" && !(local && url.protocol === "http:"))
      )
        throw new Error();
      baseUrl = url.href.replace(/\/$/, "");
    } catch {
      invalid.push(
        "NEON_AUTH_URL harus URL HTTPS Neon Auth (HTTP hanya untuk localhost).",
      );
    }
  }
  const cookieSecret = env.NEON_AUTH_COOKIE_SECRET || "";
  if (!cookieSecret) missing.push("NEON_AUTH_COOKIE_SECRET");
  else if (cookieSecret.length < 32)
    invalid.push("NEON_AUTH_COOKIE_SECRET harus minimal 32 karakter.");
  return {
    configured: missing.length === 0 && invalid.length === 0,
    missing,
    invalid,
    baseUrl,
    cookieSecret,
  };
}
