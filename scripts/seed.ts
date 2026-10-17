import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import WebSocket from "ws";
import { defaultFields, defaultSettings } from "../lib/demo";

async function main() {
  loadEnvConfig(process.cwd());
  if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL belum tersedia.");
  // Node 20 does not provide the WebSocket constructor required by Neon Pool.
  // Configure the driver before Prisma opens a connection; retain secure WSS.
  neonConfig.webSocketConstructor = WebSocket;
  const prisma = new PrismaClient({
    adapter: new PrismaNeon({
      connectionString: process.env.DATABASE_URL,
      max: 1,
      connectionTimeoutMillis: 15000,
    }),
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
  const message =
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
      ? error.message
      : "Seed gagal.";
  console.error(message);
  process.exitCode = 1;
});
