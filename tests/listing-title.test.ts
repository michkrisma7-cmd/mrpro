import { test } from "node:test";
import assert from "node:assert/strict";
import { displayTitle } from "../lib/listing-title";

test("judul huruf besar/kecil semua dirapikan ke Title Case, singkatan dipertahankan", () => {
  assert.equal(
    displayTitle("RUMAH SUBSIDI TANPA DP CIKARANG All IN 1 JUTA"),
    "Rumah Subsidi Tanpa DP Cikarang All In 1 Juta",
  );
  assert.equal(
    displayTitle("dijual rumah  over kredit di bekasi utara"),
    "Dijual Rumah Over Kredit di Bekasi Utara",
  );
  assert.equal(
    displayTitle("RUMAH SHM 2LT DEKAT TOL"),
    "Rumah SHM 2LT Dekat Tol",
  );
  assert.equal(displayTitle("CLUSTER GRAND-WISATA"), "Cluster Grand-Wisata");
});

test("judul yang sudah campuran tidak diubah", () => {
  assert.equal(
    displayTitle("Dijual over kredit rumah subsidi Parung panjang"),
    "Dijual over kredit rumah subsidi Parung panjang",
  );
  assert.equal(displayTitle("Rumah 2 lantai"), "Rumah 2 lantai");
  assert.equal(displayTitle("BSD"), "BSD");
});
