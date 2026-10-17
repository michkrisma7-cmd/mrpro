import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

for (const [script, expected] of [
  ["seed.ts", /DATABASE_URL belum tersedia\./],
  ["grant-admin.ts", /Gunakan: bun run admin:grant/],
] as const) {
  test(`${script} runs through tsx in CommonJS and exits cleanly for missing configuration`, async () => {
    const cwd = await mkdtemp(join(tmpdir(), "mrpro-cli-"));
    const env = { ...process.env };
    delete env.DATABASE_URL;
    try {
      const result = spawnSync(
        process.execPath,
        [resolve("node_modules/tsx/dist/cli.mjs"), resolve("scripts", script)],
        { cwd, env, encoding: "utf8", timeout: 15000 },
      );
      assert.ifError(result.error);
      assert.equal(result.status, 1);
      assert.match(result.stderr, expected);
      assert.doesNotMatch(
        result.stderr,
        /Transform failed|Top-level await|ERR_REQUIRE_ASYNC_MODULE/,
      );
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
}
