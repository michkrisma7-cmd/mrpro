import { test } from "node:test";
import assert from "node:assert/strict";
import {
  indexingEnabled,
  pageMetadata,
  catalogSeo,
  breadcrumbs,
  jsonLd,
} from "../lib/seo";
import robots from "../app/robots";
const live = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://test/db",
  NEXT_PUBLIC_SITE_URL: "https://mrproperti.example",
};
test("only configured production can be indexed; beta has an explicit off switch", () => {
  assert.equal(indexingEnabled(live), true);
  for (const override of [
    { NODE_ENV: "development" },
    { SEO_INDEXING: "false" },
    { VERCEL_ENV: "preview" },
    { DATABASE_URL: "" },
    { NEXT_PUBLIC_SITE_URL: "http://localhost:3000" },
    { NEXT_PUBLIC_SITE_URL: "https://localhost:3000" },
    { NEXT_PUBLIC_SITE_URL: "not a URL" },
  ])
    assert.equal(indexingEnabled({ ...live, ...override }), false);
});
test("pagination gets its own canonical; filters and saved properties are noindex", () => {
  assert.deepEqual(catalogSeo({ page: "2", utm_source: "google" }), {
    path: "/properti?page=2",
    page: 2,
    noindex: false,
  });
  assert.equal(catalogSeo({ page: "1" }).path, "/properti");
  assert.equal(catalogSeo({ page: "-2" }).page, 1);
  assert.equal(catalogSeo({ page: "999999999" }).page, 100000);
  for (const key of ["q", "jenis", "transaksi", "harga", "urut", "favorit"])
    assert.equal(catalogSeo({ [key]: "value" }).noindex, true);
  assert.equal(catalogSeo({ jenis: "", q: "" }).noindex, false);
});
test("page social metadata describes the page and falls back to a valid image", () => {
  const metadata = pageMetadata({
    title: "Jasa Kelistrikan",
    description: "Deskripsi\npekerjaan",
    path: "/layanan/listrik",
    images: [],
  });
  assert.equal(metadata.description, "Deskripsi pekerjaan");
  assert.equal(metadata.openGraph?.title, "Jasa Kelistrikan | MR Properti");
  assert.equal(metadata.openGraph?.url, "/layanan/listrik");
  assert.equal(metadata.twitter?.title, metadata.openGraph?.title);
  assert.ok(
    JSON.stringify(metadata.openGraph?.images).includes("/images/hero.webp"),
  );
});
test("structured data uses absolute breadcrumb URLs and cannot close the script tag", () => {
  const data = breadcrumbs([
    { name: "Beranda", path: "/" },
    { name: "Properti", path: "/properti" },
  ]);
  assert.deepEqual(
    data.itemListElement.map((item) => item.position),
    [1, 2],
  );
  assert.ok(
    data.itemListElement.every((item) => /^https?:\/\//.test(item.item)),
  );
  const input = { headline: "</script><script>alert(1)</script>" };
  assert.equal(jsonLd(input).includes("<"), false);
  assert.deepEqual(JSON.parse(jsonLd(input)), input);
});
test("robots lets crawlers fetch public media and read private-page noindex tags", () => {
  const before = { ...process.env };
  try {
    Object.assign(process.env, live, { SEO_INDEXING: "true" });
    const output = robots();
    assert.deepEqual(output.rules, {
      userAgent: "*",
      allow: ["/", "/api/media/"],
      disallow: ["/api/"],
    });
    assert.equal(output.sitemap, "https://mrproperti.example/sitemap.xml");
    process.env.SEO_INDEXING = "false";
    assert.equal(robots().sitemap, undefined);
  } finally {
    for (const key of [
      "NODE_ENV",
      "DATABASE_URL",
      "NEXT_PUBLIC_SITE_URL",
      "SEO_INDEXING",
    ]) {
      if (before[key] === undefined) delete process.env[key];
      else process.env[key] = before[key];
    }
  }
});
