export function inspectAuthEnvironment(
  env: Record<string, string | undefined>,
) {
  const missing: string[] = [];
  const invalid: string[] = [];
  if (!env.AUTH_SECRET) missing.push("AUTH_SECRET");
  else if (env.AUTH_SECRET.length < 32)
    invalid.push("AUTH_SECRET harus minimal 32 karakter.");
  if (!env.DATABASE_URL) missing.push("DATABASE_URL");
  return { configured: !missing.length && !invalid.length, missing, invalid };
}
