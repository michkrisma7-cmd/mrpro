// Runs the live n8n Code-node source (testdata/n8n/*.js, copied from workflow
// UI0HBaX7pESdq629) on edge cases and writes testdata/fixtures.json.
// main_test.go asserts the Go port gives identical results.
// Usage: node testdata/gen-fixtures.js
const fs = require("fs");
const path = require("path");
const dir = path.join(__dirname, "n8n");
const code = (n) => fs.readFileSync(path.join(dir, n + ".js"), "utf8");
const run = (src, $, $input, $json) =>
  new Function("$", "$input", "$json", src)($, $input, $json)[0].json;
// Go strings cannot hold lone surrogates; they become U+FFFD there.
const wf = (v) => JSON.parse(JSON.stringify(v, (k, x) => (typeof x === "string" ? x.toWellFormed() : x)));

const emoji = "🏠";
const long = (n, c = "a") => c.repeat(n);
const src = (id, extra = {}) => ({ id, title: "Judul " + id, path: "/p/" + id, text: "Teks " + id, ...extra });

const bodies = [
  { message: "  Halo, ada rumah di Cikarang?  ", history: [], sources: [src("site:overview"), src("property:1")] },
  null,
  {},
  { message: 5 },
  { message: "  ﻿  " },
  { message: long(1200) },
  { message: long(1201) },
  { message: long(1199) + emoji },
  { message: long(1198) + emoji },
  { message: "x", history: "bukan array", sources: { id: "a" } },
  {
    message: "riwayat",
    history: [
      { role: "user", content: "1" }, { role: "assistant", content: "2" }, null, "teks",
      { role: "system", content: "4" }, { role: "user", content: 5 }, { role: "user", content: long(1199) + emoji },
      { role: "assistant", content: "8" },
    ],
  },
  {
    message: "sumber",
    sources: [
      src("a"), null, src("b", { text: 9 }), src(5), src(long(79) + emoji),
      src("t1", { title: 12.5 }), src("t2", { title: null }), src("t3", { title: [1, null, "x", [2, 3]] }),
      src("t4", { title: {} }), src("t5", { title: true }), src("t6", { title: 0 }), src("t7", { title: false }),
      src("t8", { title: long(200) }), src("t9", { text: long(1599) + emoji }), src("t10"),
    ],
  },
  { message: "  sapaan  ", sources: [] },
];
const validasi = bodies.map((body) => ({
  body,
  out: wf(run(code("Validasi_Pesan"), () => ({ first: () => ({ json: { body } }) }))),
}));

// Susun Prompt: website sources, and the knowledge-endpoint branch.
const kbs = [
  null,
  { message: "Akses tidak diizinkan." },
  { sources: "x" },
  { brand: "MR", sources: [src("site:overview"), src("k1", { title: 7 }), null, src("k2", { text: long(1700) }), ...Array.from({ length: 12 }, (_, i) => src("n" + i))] },
];
const prompts = [];
for (const v of validasi.map((x) => x.out).filter((v) => v.valid))
  for (const kb of v.hasSources ? [undefined] : kbs)
    prompts.push({
      v,
      kb,
      out: wf(run(code("Susun_Prompt"), () => ({ first: () => ({ json: v }) }), undefined, kb)),
    });

const ans = (o) => ({ choices: [{ message: { content: typeof o === "string" ? o : JSON.stringify(o) } }] });
const A = ["site:overview", "property:1", "property:2", "a", "b", "c", "d", "e", "f", "g", "h"];
const B = ["property:1"];
const items = [
  [{ error: { message: "Rate limit", type: "tokens", code: "rate_limit_exceeded" } }, A],
  [{ error: { message: "m" + long(100) } }, A],
  [{ error: "teks" }, A],
  [{ error: {} }, A],
  [{ error: { code: 429 } }, A],
  [null, A],
  [{}, A],
  [{ choices: [] }, A],
  [{ choices: [{ message: { content: 5 } }] }, A],
  [{ choices: { 0: { message: { content: '{"reply":"objek","source_ids":["a"]}' } } } }, A],
  [ans("bukan json"), A],
  [ans('```json\n{"reply":"pagar","handoff":false,"source_ids":["a"]}\n```'), A],
  [ans("5"), A],
  [ans('"teks"'), A],
  [ans("[]"), A],
  [ans({ reply: "Lihat [rumah ini](https://mrproperti.com/x) dan https://a.b/c?d=1, www.contoh.com, WA.ME/628123 atau wa.me lalu <b>tebal</b> **ini**.", source_ids: ["a"] }), A],
  [ans({ reply: "URL https://x.com lanjut dan http://y.id baris", source_ids: ["a"] }), A],
  [ans({ reply: "    spasi  ﻿", source_ids: ["a"] }), A],
  [ans({ reply: long(2399) + emoji + "zz", source_ids: ["a"] }), A],
  [ans({ reply: "[a](b)[c](d) [kosong]() [x](y", source_ids: ["a"] }), A],
  [ans({ reply: "<", source_ids: ["a"] }), A],
  [ans({ reply: "Oper ke tim", handoff: true, source_ids: ["a", "b"] }), A],
  [ans({ reply: "", handoff: true }), A],
  [ans({ reply: "string true", handoff: "true", source_ids: ["a"] }), A],
  [ans({ reply: "dup", source_ids: ["a", "a", 5, null, "zzz", "b", "c", "d", "e", "f", "g", "h", "property:1"] }), A],
  [ans({ reply: "tanpa id" }), A],
  [ans({ reply: "tanpa id" }), B],
  [ans({ reply: "id bukan array", source_ids: "a" }), A],
  [ans({ reply: "", source_ids: ["a"] }), A],
  [ans({ reply: 7, source_ids: ["a"] }), A],
  [ans({ reply: "https://hanya-url.com", source_ids: ["a"] }), A],
  [ans("null"), A],
];
const periksa = items.map(([item, allowed]) => {
  let out, thrown = false;
  try {
    out = wf(run(code("Periksa_Jawaban"), () => ({ first: () => ({ json: { sourceIds: allowed } }) }), { first: () => ({ json: item }) }));
  } catch (e) {
    thrown = true;
  }
  return { item, allowed, thrown, out };
});

const tidakValid = run(code("Pesan_Tidak_Valid"));
fs.writeFileSync(
  path.join(__dirname, "fixtures.json"),
  JSON.stringify({ validasi, prompts, periksa, tidakValid }, null, 1),
);
console.log(`fixtures: validasi=${validasi.length} prompts=${prompts.length} periksa=${periksa.length}`);
