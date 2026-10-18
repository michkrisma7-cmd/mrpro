import "server-only";
import { createNeonAuth } from "@neondatabase/auth/next/server";
import { inspectAuthEnvironment } from "./auth-config";
const config = inspectAuthEnvironment(process.env);
export const authConfigured = config.configured;
let instance: ReturnType<typeof createNeonAuth> | undefined;
export function getAuth() {
  if (!authConfigured)
    throw new Error(
      "Login belum dikonfigurasi. Jalankan bun auth:setup di mesin aplikasi.",
    );
  return (instance ??= createNeonAuth({
    baseUrl: config.baseUrl,
    cookies: { secret: config.cookieSecret, sessionDataTtl: 300 },
    logLevel: "error",
  }));
}
