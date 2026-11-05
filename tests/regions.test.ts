import { test } from "node:test";
import assert from "node:assert/strict";
import dataset from "../data/regions/indonesia.json";
import provenance from "../data/regions/provenance.json";
import { getRegions, parseListingValues } from "../lib/regions";
import {
  defaultRegionFields,
  regionKeys,
  regionLevels,
} from "../lib/region-config";
import { propertyLocation } from "../lib/property-location";
import { GET } from "../app/api/wilayah/route";
import { defaultFields } from "../lib/demo";

test("national snapshot has unique Kemendagri codes, all parents, recorded counts and the four expected levels", () => {
  const data = dataset as Record<
    string,
    Record<string, { id: string; name: string }[]>
  >;
  let parents = new Set([""]);
  for (const [index, level] of regionLevels.entries()) {
    const groups = data[level];
    const current = new Set<string>();
    for (const [parent, rows] of Object.entries(groups)) {
      assert.ok(parents.has(parent), `missing parent ${parent}`);
      for (const row of rows) {
        assert.ok(row.name.trim());
        assert.equal(row.id.split(".").length, index + 1);
        assert.equal(
          row.id.includes(".") ? row.id.slice(0, row.id.lastIndexOf(".")) : "",
          parent,
        );
        assert.ok(!current.has(row.id));
        current.add(row.id);
      }
    }
    assert.equal(current.size, provenance.counts[level]);
    parents = current;
  }
  assert.equal(getRegions("provinces").length, 38);
});

test("priority ordering keeps every region available and other provinces use alphabetical order", () => {
  const provinces = getRegions("provinces").map((r) => r.name);
  assert.deepEqual(
    provinces,
    [...provinces].sort((a, b) => a.localeCompare(b, "id")),
  );
  assert.equal(provinces[provinces.indexOf("Bali") + 1], "Banten");
  assert.equal(provinces[provinces.indexOf("Jambi") + 1], "Jawa Barat");
  assert.ok(getRegions("provinces").some((r) => r.name === "Jawa Tengah"));
  assert.deepEqual(
    getRegions("regencies", "32")
      .slice(0, 2)
      .map((r) => r.name),
    ["Kabupaten Bekasi", "Kota Bekasi"],
  );
  assert.deepEqual(
    getRegions("regencies", "36")
      .slice(0, 2)
      .map((r) => r.name),
    ["Kabupaten Tangerang", "Kota Tangerang Selatan"],
  );
  const central = getRegions("regencies", "33");
  assert.deepEqual(
    central.map((r) => r.name),
    central.map((r) => r.name).sort((a, b) => a.localeCompare(b, "id")),
  );
});
function chosen() {
  const form = new FormData();
  let parent = "";
  for (const [index, level] of regionLevels.entries()) {
    const region =
      index === 0
        ? getRegions(level, parent).find((r) => r.id === "32")!
        : getRegions(level, parent)[0];
    form.set(`field_${regionKeys[index]}_kode`, region.id);
    form.set(`field_${regionKeys[index]}`, "Forged name ignored");
    parent = region.id;
  }
  form.set("region_mode", "select");
  return form;
}
test("validation canonicalizes labels, rejects cross-parent and incomplete selections, and respects hidden fields", () => {
  const form = chosen();
  const values = parseListingValues(defaultRegionFields, form);
  assert.equal(values.provinsi, "Jawa Barat");
  assert.equal(values.kota_kabupaten, "Kabupaten Bekasi");
  assert.equal(values.provinsi_kode, "32");
  form.set("field_kota_kabupaten_kode", "36.03");
  assert.throws(() => parseListingValues(defaultRegionFields, form), /induk/);
  const partial = chosen();
  partial.delete("field_kelurahan_desa_kode");
  assert.throws(
    () => parseListingValues(defaultRegionFields, partial),
    /melengkapi/,
  );
  assert.deepEqual(parseListingValues(defaultRegionFields, new FormData()), {});
  assert.throws(
    () =>
      parseListingValues(
        defaultRegionFields.map((f) => ({ ...f, required: true })),
        new FormData(),
      ),
    /Pilih/,
  );
  const hidden = defaultRegionFields.map((f) => ({ ...f, showInForm: false }));
  assert.deepEqual(parseListingValues(hidden, chosen(), values), values);
});
test("legacy region labels and unknown/hidden values survive edits without guessing codes", () => {
  const previous = {
    provinsi: "Jabar lama",
    kecamatan: "Daerah lama",
    lokasi: "Blok A",
    hidden: "tetap",
  };
  const form = new FormData();
  form.set("region_mode", "legacy");
  assert.deepEqual(
    parseListingValues(defaultRegionFields, form, previous),
    previous,
  );
  assert.throws(() => parseListingValues(defaultRegionFields, form), /valid/);
  const selected = chosen();
  const updated = parseListingValues(defaultRegionFields, selected, previous);
  assert.equal(updated.lokasi, "Blok A");
  assert.equal(updated.hidden, "tetap");
  assert.equal(updated.provinsi, "Jawa Barat");
  const clear = new FormData();
  clear.set("region_mode", "select");
  assert.deepEqual(parseListingValues(defaultRegionFields, clear, updated), {
    lokasi: "Blok A",
    hidden: "tetap",
  });
});
test("location display combines manual text and visible region names without duplicate comma segments", () => {
  const values = {
    lokasi: "Perumahan Melati, Jawa Barat",
    provinsi: "Jawa Barat",
    kota_kabupaten: "Kabupaten Bekasi",
  };
  const text = propertyLocation(values, defaultFields, "showOnCard");
  assert.equal(text, "Perumahan Melati, Jawa Barat, Kabupaten Bekasi");
  assert.equal(
    propertyLocation(
      values,
      defaultFields.map((f) => ({ ...f, showOnCard: f.key === "lokasi" })),
      "showOnCard",
    ),
    values.lokasi,
  );
});
test("local region endpoint returns only the requested subset and rejects malformed requests", async () => {
  for (const query of [
    "level=wrong",
    "level=provinces&parent=32",
    "level=districts&parent=32",
    "level=villages&parent=../../x",
  ]) {
    assert.equal(
      (await GET(new Request(`http://localhost/api/wilayah?${query}`))).status,
      400,
    );
  }
  const response = await GET(
    new Request("http://localhost/api/wilayah?level=regencies&parent=32"),
  );
  const rows = await response.json();
  assert.equal(rows[0].id, "32.16");
  assert.ok(rows.every((r: { id: string }) => r.id.startsWith("32.")));
  assert.ok(JSON.stringify(rows).length < 10000);
});

test("region field migration preserves admin definitions and every legacy listing value", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { readFile } = await import("node:fs/promises");
  const db = new PGlite();
  try {
    await db.exec(
      await readFile(
        "prisma/migrations/202610170001_initial/migration.sql",
        "utf8",
      ),
    );
    await db.exec(`INSERT INTO "PropertyField" (id,key,name,type,options,required,"showInForm","showOnCard") VALUES
      ('custom-province','provinsi','Provinsi pengelola','TEXT',ARRAY[]::text[],false,false,false);
      INSERT INTO "AppUser" (id,"authId",name,email) VALUES ('owner','auth-owner','Owner','owner@example.test');
      INSERT INTO "Property" (id,slug,title,description,gallery,whatsapp,"ownerId","values","updatedAt") VALUES
      ('legacy','legacy','Rumah lama','Deskripsi',ARRAY[]::text[],'','owner','{"provinsi":"Jabar","lokasi":"Alamat bebas","unknown":"tetap"}',NOW());`);
    const before = await db.query('SELECT * FROM "Property"');
    const fields = await db.query(
      "SELECT * FROM \"PropertyField\" WHERE key='provinsi'",
    );
    const migration = await readFile(
      "prisma/migrations/202611050002_listing_regions/migration.sql",
      "utf8",
    );
    await db.exec(migration);
    await db.exec(migration);
    assert.deepEqual(
      (await db.query('SELECT * FROM "Property"')).rows,
      before.rows,
    );
    assert.deepEqual(
      (await db.query("SELECT * FROM \"PropertyField\" WHERE key='provinsi'"))
        .rows,
      fields.rows,
    );
    assert.equal(
      (await db.query('SELECT * FROM "PropertyField"')).rows.length,
      4,
    );
  } finally {
    await db.close();
  }
});
