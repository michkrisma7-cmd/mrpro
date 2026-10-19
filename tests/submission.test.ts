import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import * as validation from "../lib/validation";
import { defaultFields } from "../lib/demo";
import { catalogQueries } from "../lib/catalog-query";
import type { ActionState } from "../lib/types";

test(
  "trial submissions publish immediately while enforcing authentication, fields and photo ownership",
  { timeout: 60000 },
  async () => {
    const database = await PGlite.create();
    const postgres = new PGLiteSocketServer({
      db: database,
      host: "127.0.0.1",
      port: 0,
    });
    let prisma: PrismaClient | undefined;
    try {
      for (const migration of (await readdir("prisma/migrations"))
        .filter((name) => name.startsWith("20"))
        .sort())
        await database.exec(
          await readFile(
            `prisma/migrations/${migration}/migration.sql`,
            "utf8",
          ),
        );
      await postgres.start();
      prisma = new PrismaClient({
        adapter: new PrismaPg({
          connectionString: `postgresql://postgres:postgres@${postgres.getServerConn()}/postgres`,
          max: 1,
        }),
      });
      const user = await prisma.appUser.create({
        data: {
          name: "Trial User",
          email: "trial@example.test",
          passwordHash: "unused-test-fixture",
        },
      });
      await prisma.media.create({
        data: { id: "ownedphoto", key: "trial/photo.webp", ownerId: user.id },
      });
      let authenticated = false;
      const paths: string[] = [];
      const tags: string[] = [];
      const exports = {} as {
        submitProperty(
          state: ActionState,
          form: FormData,
        ): Promise<ActionState>;
        moderateProperty(
          state: ActionState,
          form: FormData,
        ): Promise<ActionState>;
      };
      const source = ts.transpileModule(
        await readFile("lib/actions.ts", "utf8"),
        { compilerOptions: { module: ts.ModuleKind.CommonJS } },
      ).outputText;
      runInNewContext(source, {
        exports,
        crypto: { randomUUID },
        require: (name: string) => {
          if (name === "zod") return { z };
          if (name === "./validation") return validation;
          if (name === "./db") return { db: () => prisma };
          if (name === "./data")
            return {
              getFields: async () =>
                defaultFields.filter((f) => f.key === "lokasi"),
            };
          if (name === "./auth")
            return {
              requireUser: async () => {
                if (!authenticated) throw new Error("login required");
                return user;
              },
              requireAdmin: async () => {
                throw new Error("admin required");
              },
            };
          if (name === "next/cache")
            return {
              revalidatePath: (path: string) => paths.push(path),
              revalidateTag: (tag: string) => tags.push(tag),
            };
          if (name === "next/navigation")
            return {
              redirect: (path: string) => {
                throw new Error(`redirect:${path}`);
              },
            };
          throw new Error(`Unexpected module ${name}`);
        },
      });
      const form = new FormData();
      form.set("title", "Rumah uji coba Cikarang");
      form.set(
        "description",
        "Rumah uji coba dengan informasi lengkap dan kondisi sebenarnya.",
      );
      form.set("whatsapp", "628123456789");
      form.set("gallery", JSON.stringify(["/api/media/ownedphoto"]));
      form.set("field_lokasi", "Cikarang");
      form.set("ownerId", "another-user");
      form.set("featured", "on");
      form.set("status", "ARCHIVED");
      await assert.rejects(exports.submitProperty({}, form), /login required/);
      authenticated = true;
      form.set("gallery", JSON.stringify(["/api/media/foreignphoto"]));
      assert.match(
        (await exports.submitProperty({}, form)).error!,
        /unggahan Anda sendiri/,
      );
      form.set("gallery", JSON.stringify(["/api/media/ownedphoto"]));
      form.delete("field_lokasi");
      assert.match(
        (await exports.submitProperty({}, form)).error!,
        /wajib diisi/,
      );
      assert.equal(await prisma.property.count(), 0);
      form.set("field_lokasi", "Cikarang");
      await assert.rejects(
        exports.submitProperty({}, form),
        /redirect:\/akun\?terkirim=1/,
      );
      const listing = await prisma.property.findFirstOrThrow();
      assert.equal(listing.status, "PUBLISHED");
      assert.equal(listing.ownerId, user.id);
      assert.equal(listing.featured, false);
      const query = catalogQueries({ q: "Cikarang" }, new Set(["lokasi"]));
      const publicRows = await prisma.$queryRaw<{ id: string }[]>(query.list);
      assert.equal(
        publicRows[0].id,
        listing.id,
        "new listing is immediately visible in the public catalog",
      );
      await assert.rejects(
        exports.moderateProperty({}, form),
        /admin required/,
      );
      assert.equal(
        (await prisma.appUser.findUniqueOrThrow({ where: { id: user.id } }))
          .role,
        "USER",
      );
      assert.ok(
        paths.includes("/") &&
          paths.includes("/properti") &&
          paths.includes("/akun"),
      );
      assert.ok(tags.includes("properties"));
    } finally {
      await prisma?.$disconnect();
      await postgres.stop();
      await database.close();
    }
  },
);
