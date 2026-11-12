import { test } from "node:test";
import assert from "node:assert/strict";
import { listingSearchText } from "../lib/listing-seo";

test("structured location and transaction lead metadata ahead of landmark copy", () => {
  const result = listingSearchText({
    title: "Grand Amarta",
    description: "Dekat Bank BSI dan pusat belanja.",
    values: {
      jenis: "Ruko",
      transaksi: "Disewa",
      kecamatan: "Cikarang Utara",
      kota_kabupaten: "Kabupaten Bekasi",
      lokasi: "Samping Bank BSI",
    },
  });
  assert.equal(
    result.title,
    "Grand Amarta Ruko Disewa di Cikarang Utara, Kabupaten Bekasi",
  );
  assert.ok(
    result.description.startsWith(
      "Ruko Disewa di Cikarang Utara, Kabupaten Bekasi.",
    ),
  );
  assert.ok(result.description.includes("Dekat Bank BSI"));
});

test("missing fields do not invent a transaction, city, or property type", () => {
  assert.deepEqual(
    listingSearchText({
      title: "Tanah pilihan",
      description: "Informasi pemilik.",
      values: {},
    }),
    {
      title: "Tanah pilihan",
      description: "Informasi pemilik.",
    },
  );
});

test("existing titles retain their transaction and location without repetition", () => {
  const result = listingSearchText({
    title: "Rumah Over Kredit di Karawang",
    description: "Detail rumah.",
    values: { jenis: "Rumah", transaksi: "Over Kredit", lokasi: "Karawang" },
  });
  assert.equal(result.title, "Rumah Over Kredit di Karawang");
});
