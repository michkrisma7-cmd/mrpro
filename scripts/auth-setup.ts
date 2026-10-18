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
  if (!checkOnly && !process.env.AUTH_SECRET) {
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
        `\n# Local application session signing secret. Do not commit.\nAUTH_SECRET=${secret}\n`,
      );
    } finally {
      await file.close();
    }
    process.env.AUTH_SECRET = secret;
    console.log(
      "OK: AUTH_SECRET dibuat di .env.local; nilainya tidak ditampilkan.",
    );
  }
  const config = inspectAuthEnvironment(process.env);
  for (const name of config.missing) console.error(`BELUM TERSEDIA: ${name}`);
  for (const error of config.invalid)
    console.error(`PERLU DIPERBAIKI: ${error}`);
  if (!process.env.DATABASE_URL) console.error("BELUM TERSEDIA: DATABASE_URL");
  let failed = !config.configured;
  if (offline) {
    process.exitCode = failed ? 1 : 0;
    return;
  }
  if (process.env.DATABASE_URL) {
    const prisma = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL,
        max: 1,
        connectionTimeoutMillis: 10000,
      }),
    });
    try {
      await prisma.appUser.findFirst({
        select: { id: true, passwordHash: true, email: true },
      });
      await prisma.authAttempt.count();
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
