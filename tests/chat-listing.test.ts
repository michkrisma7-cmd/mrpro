import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatPriceShort,
  matchListings,
  parseListingFilters,
  type ListingRow,
} from "../lib/chat";

const row = (
  id: string,
  values: Record<string, unknown>,
  title = `Rumah ${id}`,
): ListingRow => ({ id, slug: id, title, description: "Deskripsi.", values });

const rows = [
  row("a", {
    harga: 185_000_000,
    jenis: "Rumah",
    transaksi: "Dijual",
    kamar_tidur: 2,
    kecamatan: "Cikarang Utara",
    kota_kabupaten: "Kabupaten Bekasi",
  }),
  row("b", {
    harga: 750_000_000,
    jenis: "Rumah",
    transaksi: "Dijual",
    kamar_tidur: 3,
    kecamatan: "Cikarang Selatan",
    kota_kabupaten: "Kabupaten Bekasi",
  }),
  row("c", {
    harga: 70_000_000,
    jenis: "Rumah",
    transaksi: "Over Kredit",
    kamar_tidur: 2,
    kecamatan: "Babelan",
    kota_kabupaten: "Bekasi",
  }),
  row("d", {
    harga: 90_000_000,
    jenis: "Rumah",
    transaksi: "Over Kredit",
    kamar_tidur: 3,
    kecamatan: "Klari",
    kota_kabupaten: "Karawang",
  }),
];

test("Listing filters are read from everyday Indonesian questions", () => {
  assert.deepEqual(
    parseListingFilters("Ada rumah dijual di Cikarang di bawah 500 juta?"),
    { transaksi: "Dijual", jenis: "Rumah", maxPrice: 500_000_000 },
  );
  assert.deepEqual(
    parseListingFilters("Rumah over kredit di Bekasi yang 2 kamar ada?"),
    { transaksi: "Over Kredit", jenis: "Rumah", bedrooms: 2 },
  );
  assert.equal(parseListingFilters("budget 1,2 miliar").maxPrice, 1.2e9);
  assert.equal(parseListingFilters("di atas 300jt").minPrice, 3e8);
  assert.equal(parseListingFilters("ruko disewa 3 KT").transaksi, "Disewa");
  assert.deepEqual(parseListingFilters("berapa biaya pasang kanopi?"), {});
});

test("Listing search filters by area, price and bedrooms, cheapest first", () => {
  const cikarang = matchListings(
    rows,
    "Ada rumah dijual di Cikarang di bawah 500 juta?",
  );
  assert.ok(cikarang?.exact);
  assert.deepEqual(
    cikarang.matches.map((r) => r.id),
    ["a"],
  );
  const bekasi = matchListings(
    rows,
    "Rumah over kredit di Bekasi yang 2 kamar ada?",
  );
  assert.deepEqual(
    bekasi?.matches.map((r) => r.id),
    ["c"],
  );
});

test("Listing search offers nearest alternatives instead of nothing", () => {
  const result = matchListings(
    rows,
    "rumah dijual di Cikarang di bawah 100 juta",
  );
  assert.equal(result?.exact, false);
  assert.deepEqual(
    result?.matches.map((r) => r.id),
    ["a", "b"],
  );
  assert.match(result?.note ?? "", /alternatif terdekat/);
});

test("Non-listing questions skip the listing search", () => {
  assert.equal(matchListings(rows, "Berapa biaya pasang kanopi?"), null);
  assert.equal(matchListings(rows, "Gimana cara pasang iklan?"), null);
});

test("Short price format reads naturally", () => {
  assert.equal(formatPriceShort(185_000_000), "Rp185 juta");
  assert.equal(formatPriceShort(1_250_000_000), "Rp1,25 miliar");
});

test("Owner questions about advertising are not listing searches", () => {
  assert.equal(
    matchListings(rows, "Gimana cara pasang iklan properti saya?"),
    null,
  );
  assert.equal(matchListings(rows, "mau titip jual rumah"), null);
});

test("Listings matching more area words come first", () => {
  const extra = [
    ...rows,
    row("e", { harga: 50_000_000, jenis: "Rumah", lokasi: "Bumi Kosambi" }),
    row("f", {
      harga: 400_000_000,
      jenis: "Rumah",
      lokasi: "Bumi Cikarang Makmur",
    }),
  ];
  assert.equal(
    matchListings(extra, "rumah di Bumi Cikarang Makmur")?.matches[0].id,
    "f",
  );
});
