import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

async function main() {
  loadEnvConfig(process.cwd());
  const authId = process.argv[2];
  if (!authId || !process.env.DATABASE_URL)
    throw new Error(
      "Gunakan: bun run admin:grant <Neon-Auth-user-id>. DATABASE_URL wajib tersedia.",
    );
  const prisma = new PrismaClient({
    adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const user = await prisma.appUser.findUnique({ where: { authId } });
    if (!user)
      throw new Error(
        "User belum terhubung. Minta user login ke aplikasi dahulu, lalu gunakan ID Neon Auth yang telah diverifikasi oleh pemilik proyek.",
      );
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
