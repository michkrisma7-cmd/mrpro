import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import ts from "typescript";

async function loadCachedModule(
  path: string,
  dependencies: Record<string, unknown>,
) {
  const code = ts.transpileModule(await readFile(path, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const exports = {} as {
    getBlogPosts: () => Promise<{ createdAt: Date }[]>;
    getBlogPost: (slug: string) => Promise<{ updatedAt: Date }>;
    getCatalog: (params: Record<string, string>) => Promise<{ page: number }>;
  };
  runInNewContext(code, {
    exports,
    require: (name: string) => {
      if (name === "server-only") return {};
      if (name === "react") return { cache: (fn: unknown) => fn };
      if (name === "next/cache")
        return {
          // Simulate persistent JSON cache hits, including Date serialization.
          unstable_cache: (fn: (...args: unknown[]) => Promise<unknown>) => {
            const entries = new Map<string, string>();
            return async (...args: unknown[]) => {
              const key = JSON.stringify(args);
              if (entries.has(key)) return JSON.parse(entries.get(key)!);
              const result = await fn(...args);
              entries.set(key, JSON.stringify(result));
              return result;
            };
          },
        };
      if (name in dependencies) return dependencies[name];
      throw new Error(`Unexpected dependency ${name}`);
    },
  });
  return exports;
}

test("cached blog hits preserve Date methods needed by metadata and pages", async () => {
  let reads = 0;
  const post = {
    slug: "rumah",
    createdAt: new Date("2026-10-25T00:00:00Z"),
    updatedAt: new Date("2026-10-25T01:00:00Z"),
  };
  const api = await loadCachedModule("lib/blog.ts", {
    "./db": {
      databaseConfigured: true,
      db: () => ({
        blogPost: {
          findMany: async () => {
            reads++;
            return [post];
          },
          findFirst: async () => {
            reads++;
            return post;
          },
        },
      }),
    },
  });
  for (let i = 0; i < 2; i++) {
    assert.equal(
      (await api.getBlogPosts())[0].createdAt.toISOString(),
      post.createdAt.toISOString(),
    );
    assert.equal(
      (await api.getBlogPost("rumah")).updatedAt.toISOString(),
      post.updatedAt.toISOString(),
    );
  }
  assert.equal(reads, 2, "list and detail each query only once");
});

test("equivalent catalog filters reuse cache; different pages get separate entries", async () => {
  let queries = 0;
  const api = await loadCachedModule("lib/data.ts", {
    "./db": {
      databaseConfigured: true,
      db: () => ({
        propertyField: { findMany: async () => [] },
        $queryRaw: async (query: string) => {
          queries++;
          return query === "count" ? [{ count: BigInt(20) }] : [];
        },
      }),
    },
    "./demo": {},
    "./catalog-query": {
      catalogQueries: () => ({ list: "list", count: "count" }),
    },
  });
  await api.getCatalog({ q: "rumah", page: "1" });
  await api.getCatalog({ page: "1", q: "rumah", ignored: "value" });
  assert.equal(queries, 2);
  const second = await api.getCatalog({ q: "rumah", page: "2" });
  assert.equal(second.page, 2);
  assert.equal(queries, 4);
});
