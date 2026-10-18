import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  loadEnvConfig(process.cwd());
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email || !process.env.DATABASE_URL)
    throw new Error(
      "Gunakan: bun run admin:grant <email>. DATABASE_URL wajib tersedia.",
    );
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
      max: 1,
      connectionTimeoutMillis: 15000,
    }),
  });
  try {
    const user = await prisma.appUser.findUnique({ where: { email } });
    if (!user)
      throw new Error("User belum terdaftar. Minta user daftar akun dahulu.");
    await prisma.appUser.update({
      where: { id: user.id },
      data: { role: "ADMIN" },
    });
    console.log(
      "Role ADMIN diberikan ke user terpilih. Tidak ada role yang diberikan otomatis saat pendaftaran.",
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Pemberian role admin gagal.",
  );
  process.exitCode = 1;
});
