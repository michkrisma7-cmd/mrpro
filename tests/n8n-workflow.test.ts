import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { blogFields } from "../lib/blog-validation";

const workflow = JSON.parse(
  readFileSync("workflows/n8n/mr-properti-blog-nextjs.json", "utf8"),
);
const node = (name: string) =>
  workflow.nodes.find((n: { name: string }) => n.name === name);
const run = (name: string, input: unknown, context: unknown = {}) =>
  runInNewContext(`(function(){${node(name).parameters.jsCode}})()`, {
    $input: { first: () => ({ json: input }), all: () => [{ json: input }] },
    $: () => ({ first: () => ({ json: context }) }),
  });

test("n8n migration has valid connections, manual preview and no WordPress writes", () => {
  assert.equal(workflow.active, false);
  assert.equal(workflow.settings.timezone, "Asia/Jakarta");
  for (const connection of Object.values(workflow.connections) as {
    [key: string]: { node: string }[][];
  }[]) {
    for (const outputs of Object.values(connection))
      for (const edges of outputs)
        for (const edge of edges) assert.ok(node(edge.node));
  }
  const branch = node("Uji Manual Saja?").parameters.conditions.conditions[0];
  assert.equal(branch.operator.operation, "true");
  assert.equal(
    workflow.connections["Uji Manual Saja?"].main[0][0].node,
    "Pratinjau Tanpa Terbit",
  );
  assert.equal(JSON.stringify(workflow).includes("wp-json"), false);
  for (const name of ["Baca Artikel Terakhir", "Terbitkan Blog Next.js"])
    assert.equal(node(name).parameters.genericAuthType, "httpHeaderAuth");
  const duplicate = run(
    "Riwayat dan Cegah Duplikat",
    { data: [], slotExists: true },
    { dryRun: false },
  );
  assert.equal(duplicate.length, 0);
  assert.equal(run("Hasil Publikasi", { statusCode: 409 }).length, 1);
  assert.throws(() => run("Hasil Publikasi", { statusCode: 401 }));
});

test("n8n validates AI output into the actual Next.js schema and plain text", () => {
  const paragraph =
    "Periksa kebutuhan keluarga sebelum memilih hunian yang sesuai dengan kegiatan setiap anggota keluarga. "
      .repeat(6)
      .trim();
  const article = {
    title: "Panduan menilai ruang keluarga sebelum membeli hunian",
    intro: paragraph,
    sections: Array.from({ length: 4 }, (_, i) => ({
      heading: `Pertimbangan kebutuhan ${i + 1}`,
      paragraphs: [paragraph],
    })),
    closing: paragraph,
    source_ids: [1],
  };
  const ctx = {
    dryRun: true,
    slug: "mr-blog-2026-10-20-07-00",
    topic: "hunian",
    recentTitles: [],
    sources: [
      {
        id: 1,
        title: "Referensi hunian",
        url: "https://antaranews.com/contoh",
        date: "2026-10-20",
      },
    ],
  };
  const output = run(
    "Validasi Artikel",
    { text: JSON.stringify(article) },
    ctx,
  )[0].json;
  assert.equal(blogFields.strict().safeParse(output.payload).success, true);
  assert.equal(output.payload.content.includes("<p>"), false);
  assert.ok(output.payload.content.includes("\n\n"));
  assert.ok(output.payload.content.includes(ctx.sources[0].url));
  assert.ok(output.payload.excerpt.length <= 350);
  assert.throws(() => run("Validasi Artikel", { text: "invalid JSON" }, ctx));
  assert.throws(() =>
    run(
      "Validasi Artikel",
      { text: JSON.stringify({ ...article, source_ids: [99] }) },
      ctx,
    ),
  );
  assert.throws(() =>
    run(
      "Validasi Artikel",
      { text: JSON.stringify(article) },
      { ...ctx, recentTitles: [article.title] },
    ),
  );
});
