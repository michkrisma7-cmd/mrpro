import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import * as crypto from "node:crypto";
import ts from "typescript";
import { blogSchema } from "../lib/blog-validation";

const article = {
  title: "Panduan rumah pertama",
  slug: "panduan-rumah-pertama",
  excerpt: "Tips memilih rumah pertama Anda.",
  content: "Kenali kebutuhan keluarga sebelum memilih rumah pertama.",
};

test("blog API requires a key, validates input, creates drafts or published posts and handles conflicts", async () => {
  const env: Record<string, string> = {};
  const writes: { data: typeof article & { published: boolean } }[] = [];
  const paths: string[] = [];
  let failure: unknown;
  const exports = {} as { POST: (request: Request) => Promise<Response> };
  const source = ts.transpileModule(
    await readFile("app/api/blog/route.ts", "utf8"),
    {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    },
  ).outputText;
  runInNewContext(source, {
    exports,
    Response,
    process: { env },
    require: (name: string) => {
      if (name === "node:crypto") return crypto;
      if (name === "@/lib/blog-validation") return { blogSchema };
      if (name === "next/cache")
        return { revalidatePath: (path: string) => paths.push(path) };
      if (name === "@/lib/db")
        return {
          databaseConfigured: true,
          db: () => ({
            blogPost: {
              create: async (input: (typeof writes)[number]) => {
                if (failure) throw failure;
                writes.push(input);
                return { id: "post-id", ...input.data };
              },
            },
          }),
        };
      throw new Error(name);
    },
  });
  const request = (
    body: unknown = article,
    key?: string,
    type = "application/json",
  ) =>
    new Request("https://example.test/api/blog", {
      method: "POST",
      headers: { "content-type": type, ...(key ? { "x-api-key": key } : {}) },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
  assert.equal((await exports.POST(request())).status, 503);
  env.BLOG_API_KEY = "test-secret";
  for (const key of [undefined, "wrong-key"])
    assert.equal((await exports.POST(request(article, key))).status, 401);
  assert.equal(writes.length, 0);
  assert.equal((await exports.POST(request("{", "test-secret"))).status, 400);
  assert.equal(
    (await exports.POST(request(article, "test-secret", "text/plain"))).status,
    415,
  );
  for (const body of [
    { ...article, slug: "../admin" },
    { ...article, published: "true" },
    { ...article, id: "unexpected" },
  ])
    assert.equal(
      (await exports.POST(request(body, "test-secret"))).status,
      400,
    );
  assert.equal(writes.length, 0);
  const draft = await exports.POST(request(article, "test-secret"));
  assert.equal(draft.status, 201);
  assert.equal((await draft.json()).data.published, false);
  const published = await exports.POST(
    request({ ...article, published: true }, "test-secret"),
  );
  assert.equal(published.status, 201);
  assert.equal((await published.json()).data.published, true);
  assert.equal(writes.length, 2);
  for (const path of [
    "/",
    "/blog",
    `/blog/${article.slug}`,
    "/admin",
    "/sitemap.xml",
  ])
    assert.ok(paths.includes(path));
  failure = { code: "P2002" };
  assert.equal(
    (await exports.POST(request(article, "test-secret"))).status,
    409,
  );
  failure = new Error("private database details");
  const failed = await exports.POST(request(article, "test-secret"));
  assert.equal(failed.status, 500);
  assert.equal(
    (await failed.text()).includes("private database details"),
    false,
  );
});
