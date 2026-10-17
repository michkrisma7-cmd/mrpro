import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { defaultFields, defaultSettings } from "../lib/demo";

async function main() {
  loadEnvConfig(process.cwd());
  if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL belum tersedia.");
  const prisma = new PrismaClient({
    adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    for (const { id, ...field } of defaultFields) {
      void id;
      await prisma.propertyField.upsert({
        where: { key: field.key },
        create: field,
        update: {},
      });
    }
    await prisma.siteSettings.upsert({
      where: { id: "main" },
      create: { id: "main", ...defaultSettings },
      update: {},
    });
    console.log(
      "Field awal dan pengaturan tersimpan. Data pengguna dan properti tidak diubah.",
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Seed gagal.");
  process.exitCode = 1;
});
