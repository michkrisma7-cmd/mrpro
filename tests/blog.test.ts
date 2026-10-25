import { randomUUID } from "node:crypto";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { PGlite } from "@electric-sql/pglite";
import { blogSchema } from "../lib/blog-validation";
const article = {
  title: "Panduan rumah",
  slug: "panduan-rumah",
  excerpt: "Tips memilih rumah nyaman.",
  content: "Kenali kebutuhan keluarga sebelum memilih rumah.",
  published: false,
};
test("blog validation rejects unsafe slugs, empty content and oversized articles", () => {
  assert.equal(blogSchema.safeParse(article).success, true);
  for (const change of [
    { slug: "../admin" },
    { slug: "<script>" },
    { content: " " },
    { content: "x".repeat(50001) },
  ]) {
    assert.equal(
      blogSchema.safeParse({ ...article, ...change }).success,
      false,
    );
  }
});
test("blog migration defaults to draft, filters public articles and preserves unique slugs", async () => {
  const database = new PGlite();
  try {
    await database.exec(
      await readFile(
        "prisma/migrations/202610180001_blog/migration.sql",
        "utf8",
      ),
    );
    await database.query(
      'INSERT INTO "BlogPost" (id,slug,title,excerpt,content,"updatedAt") VALUES ($1,$2,$3,$4,$5,NOW())',
      ["post", article.slug, article.title, article.excerpt, article.content],
    );
    assert.deepEqual(
      (await database.query('SELECT id FROM "BlogPost" WHERE published=true'))
        .rows,
      [],
    );
    await assert.rejects(
      database.query(
        'INSERT INTO "BlogPost" (id,slug,title,excerpt,content,"updatedAt") SELECT $1,slug,title,excerpt,content,NOW() FROM "BlogPost"',
        ["duplicate"],
      ),
      /unique/,
    );
    await database.exec('UPDATE "BlogPost" SET published=true');
    assert.equal(
      (await database.query('SELECT id FROM "BlogPost" WHERE published=true'))
        .rows.length,
      1,
    );
    await database.exec('UPDATE "BlogPost" SET published=false');
    assert.equal(
      (await database.query('SELECT id FROM "BlogPost" WHERE published=true'))
        .rows.length,
      0,
    );
  } finally {
    await database.close();
  }
});
test("blog mutations reject non-admin callers before database access and allow admin edits", async () => {
  let admin = false;
  let writes = 0;
  let updated: unknown;
  let collisions = 0;
  const paths: string[] = [];
  const actionModule = {
    exports: {} as {
      saveBlogPost: (state: object, form: FormData) => Promise<unknown>;
    },
  };
  const source = ts.transpileModule(
    await readFile("lib/blog-actions.ts", "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText;
  runInNewContext(source, {
    exports: actionModule.exports,
    require: (name: string) => {
      if (name === "node:crypto") return { randomUUID };
      if (name === "./auth")
        return {
          requireAdmin: async () => {
            if (!admin) throw new Error("denied");
          },
        };
      if (name === "./db")
        return {
          db: () => ({
            blogPost: {
              create: async () => {
                writes++;
              },
              update: async (input: unknown) => {
                if (collisions > 0) {
                  collisions--;
                  throw { code: "P2002" };
                }
                writes++;
                updated = input;
              },
            },
          }),
        };
      if (name === "./blog-validation") return { blogSchema };
      if (name === "next/cache")
        return {
          revalidatePath: (path: string) => paths.push(path),
          updateTag: (tag: string) => assert.equal(tag, "blog"),
        };
      if (name === "next/navigation")
        return {
          redirect: () => {
            throw new Error("redirect");
          },
        };
      throw new Error(name);
    },
  });
  const form = new FormData();
  for (const [key, value] of Object.entries(article))
    if (typeof value === "string") form.set(key, value);
  await assert.rejects(actionModule.exports.saveBlogPost({}, form), /denied/);
  assert.equal(writes, 0);
  form.set("id", "existing");
  await assert.rejects(actionModule.exports.saveBlogPost({}, form), /denied/);
  assert.equal(writes, 0);
  admin = true;
  form.set("published", "on");
  await assert.rejects(actionModule.exports.saveBlogPost({}, form), /redirect/);
  assert.equal(writes, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(updated)), {
    where: { id: "existing" },
    data: { ...article, published: true },
  });
  form.set("slug", "");
  collisions = 1;
  await assert.rejects(actionModule.exports.saveBlogPost({}, form), /redirect/);
  const saved = JSON.parse(JSON.stringify(updated));
  assert.match(saved.data.slug, /^panduan-rumah-[a-f0-9]{8}$/);
  form.set("slug", "alamat-khusus");
  collisions = 1;
  const duplicate = (await actionModule.exports.saveBlogPost({}, form)) as {
    error: string;
  };
  assert.equal(duplicate.error, "Slug sudah digunakan artikel lain.");
  assert.ok(paths.includes("/"));
  assert.ok(paths.includes("/blog/[slug]"));
});

test("empty or omitted blog slugs are generated from the title, preserving custom slugs", () => {
  for (const slug of [undefined, null, "", "   "]) {
    assert.equal(
      blogSchema.parse({ ...article, slug, title: "  Tips Rumah Nyaman!  " })
        .slug,
      "tips-rumah-nyaman",
    );
  }
  assert.equal(
    blogSchema.parse({ ...article, slug: "", title: "Café & Décor" }).slug,
    "cafe-decor",
  );
  assert.equal(
    blogSchema.parse({ ...article, slug: "", title: "🏡🏡🏡" }).slug,
    "artikel",
  );
  assert.equal(
    blogSchema.parse({ ...article, slug: "alamat-pilihan" }).slug,
    "alamat-pilihan",
  );
});
