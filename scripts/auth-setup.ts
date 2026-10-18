import { loadEnvConfig } from "@next/env";
import { randomBytes } from "node:crypto";
import { open, constants } from "node:fs/promises";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { inspectAuthEnvironment } from "../lib/auth-config";

async function main() {
  loadEnvConfig(process.cwd());
  const checkOnly = process.argv.includes("--check");
  const offline = process.argv.includes("--offline");
  if (!checkOnly && !process.env.NEON_AUTH_COOKIE_SECRET) {
    const secret = randomBytes(32).toString("base64url");
    const file = await open(
      resolve(".env.local"),
      constants.O_CREAT |
        constants.O_APPEND |
        constants.O_WRONLY |
        constants.O_NOFOLLOW,
      0o600,
    );
    try {
      await file.write(
        `\n# Local application session signing secret. Do not commit.\nNEON_AUTH_COOKIE_SECRET=${secret}\n`,
      );
    } finally {
      await file.close();
    }
    process.env.NEON_AUTH_COOKIE_SECRET = secret;
    console.log(
      "OK: NEON_AUTH_COOKIE_SECRET dibuat di .env.local; nilainya tidak ditampilkan.",
    );
  }
  const config = inspectAuthEnvironment(process.env);
  for (const name of config.missing) console.error(`BELUM TERSEDIA: ${name}`);
  for (const error of config.invalid)
    console.error(`PERLU DIPERBAIKI: ${error}`);
  if (!process.env.DATABASE_URL) console.error("BELUM TERSEDIA: DATABASE_URL");
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  let originValid = false;
  try {
    const url = new URL(origin);
    originValid =
      ["http:", "https:"].includes(url.protocol) &&
      url.origin === origin.replace(/\/$/, "") &&
      !url.username &&
      !url.password;
  } catch {}
  if (!originValid)
    console.error(
      "PERLU DIPERBAIKI: NEXT_PUBLIC_SITE_URL harus origin aplikasi, tanpa path.",
    );
  else
    console.log(
      "OK: Origin aplikasi valid. Daftarkan origin yang sama pada Trusted Origins Neon Auth.",
    );
  let failed = !config.configured || !process.env.DATABASE_URL || !originValid;
  if (offline) {
    console.log("Pemeriksaan offline: koneksi Neon belum diuji.");
    process.exitCode = failed ? 1 : 0;
    return;
  }
  if (config.configured && originValid) {
    try {
      const response = await fetch(`${config.baseUrl}/get-session`, {
        headers: { Origin: origin },
        signal: AbortSignal.timeout(10000),
      });
      const data: unknown = await response.json();
      if (
        !response.ok ||
        (data !== null && (typeof data !== "object" || !("session" in data)))
      ) {
        failed = true;
        console.error(
          `GAGAL: Endpoint sesi Neon Auth merespons HTTP ${response.status}. Pastikan NEON_AUTH_URL adalah endpoint Auth, bukan URL database atau JWKS.`,
        );
      } else console.log("OK: Endpoint sesi Neon Auth dapat dijangkau.");
    } catch {
      failed = true;
      console.error(
        "GAGAL: Endpoint Neon Auth tidak dapat dijangkau. Periksa URL, jaringan, dan trust sertifikat.",
      );
    }
  }
  if (process.env.JWKS_NEON) {
    try {
      const value = process.env.JWKS_NEON.trim();
      let jwks: unknown;
      if (value.startsWith("{")) jwks = JSON.parse(value);
      else {
        const url = new URL(value);
        if (
          url.protocol !== "https:" &&
          !(
            url.protocol === "http:" &&
            ["127.0.0.1", "localhost"].includes(url.hostname)
          )
        )
          throw new Error();
        const response = await fetch(url, {
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) throw new Error();
        jwks = await response.json();
      }
      if (
        !jwks ||
        typeof jwks !== "object" ||
        !("keys" in jwks) ||
        !Array.isArray(jwks.keys) ||
        !jwks.keys.length ||
        !jwks.keys.every(
          (k) =>
            k &&
            typeof k === "object" &&
            ["RSA", "EC", "OKP"].includes(k.kty) &&
            !["d", "p", "q", "dp", "dq", "qi", "k"].some((name) => name in k),
        )
      )
        throw new Error();
      console.log(
        "OK: Format public JWKS_NEON dikenali. SDK mengelola sesi login; JWKS tidak menggantikan cookie secret.",
      );
    } catch {
      failed = true;
      console.error(
        "GAGAL: JWKS_NEON harus URL JWKS yang dapat dijangkau atau JSON public JWKS yang valid. Nilainya tidak ditampilkan.",
      );
    }
  } else console.log("INFO: JWKS_NEON opsional untuk login cookie Neon Auth.");
  if (process.env.DATABASE_URL) {
    const prisma = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL,
        max: 1,
        connectionTimeoutMillis: 10000,
      }),
    });
    try {
      await prisma.appUser.count();
      console.log(
        "OK: Database dan tabel AppUser dapat diakses; tidak ada data yang diubah.",
      );
    } catch {
      failed = true;
      console.error(
        "GAGAL: Database/tabel AppUser tidak dapat diakses. Periksa DATABASE_URL dan pastikan migrasi aplikasi sudah diterapkan.",
      );
    } finally {
      await prisma.$disconnect();
    }
  }
  if (failed) {
    console.error(
      "Setup belum lengkap. Perbaiki pemeriksaan di atas, lalu jalankan bun auth:check.",
    );
    process.exitCode = 1;
  } else {
    console.log(
      "Pemeriksaan konfigurasi lulus. Restart bun dev, buka /login, lalu daftar/masuk untuk menguji akun nyata.",
    );
  }
}
main().catch(() => {
  console.error(
    "Setup login gagal. Pastikan .env.local dapat ditulis dan dependensi sudah terpasang. Nilai rahasia tidak ditampilkan.",
  );
  process.exitCode = 1;
});
