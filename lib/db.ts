import "server-only";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const globalDb = globalThis as unknown as { prisma?: PrismaClient };
export const databaseConfigured = Boolean(process.env.DATABASE_URL);
export function db() {
  if (!process.env.DATABASE_URL)
    throw new Error("Koneksi database belum dikonfigurasi.");
  return (globalDb.prisma ??= new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  }));
}
