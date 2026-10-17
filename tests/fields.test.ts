import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseValues,
  fieldSchema,
  basePropertySchema,
} from "../lib/validation";
import { defaultFields } from "../lib/demo";
import { filled, whatsappLink } from "../lib/format";
import type { Field } from "../lib/types";
const field: Field = {
  id: "test",
  key: "fasilitas",
  name: "Fasilitas",
  type: "MULTISELECT",
  options: ["Taman", "Carport"],
  required: true,
  showInForm: true,
  showOnCard: false,
  showOnDetail: true,
  cardLabel: "",
  position: 0,
};
test("required fields are enforced on the server, including multiselect", () => {
  assert.throws(() => parseValues([field], new FormData()), /wajib/);
});
test("multiselect rejects unknown values and deduplicates valid choices", () => {
  const f = new FormData();
  f.append("field_fasilitas", "Taman");
  f.append("field_fasilitas", "Taman");
  assert.deepEqual(parseValues([field], f), { fasilitas: ["Taman"] });
  f.append("field_fasilitas", "Injected");
  assert.throws(() => parseValues([field], f), /tidak valid/);
});
test("non-form fields cannot be injected by public submission", () => {
  const f = new FormData();
  f.set("field_fasilitas", "Taman");
  assert.deepEqual(parseValues([{ ...field, showInForm: false }], f), {});
});
test("numeric fields retain zero and reject negative or non-finite values", () => {
  const n = { ...field, key: "luas", name: "Luas", type: "NUMBER" as const };
  const f = new FormData();
  f.set("field_luas", "0");
  assert.deepEqual(parseValues([n], f), { luas: 0 });
  assert.equal(filled(0), true);
  for (const value of ["-1", "NaN", "Infinity", "1e99"]) {
    f.set("field_luas", value);
    assert.throws(() => parseValues([n], f), /angka/);
  }
});
test("price fields reject decimal and unsafe values", () => {
  const f = new FormData();
  f.set("field_harga", "1.5");
  assert.throws(
    () => parseValues([{ ...field, key: "harga", type: "PRICE" }], f),
    /angka/,
  );
});
test("field definitions reject reserved keys and required fields hidden from the form", () => {
  for (const key of ["constructor", "prototype", "title"])
    assert.equal(fieldSchema.safeParse({ ...field, key }).success, false);
  assert.equal(
    fieldSchema.safeParse({ ...field, showInForm: false }).success,
    false,
  );
  assert.equal(fieldSchema.safeParse({ ...field, options: [] }).success, false);
});
test("all initial field definitions are valid", () => {
  for (const f of defaultFields)
    assert.equal(fieldSchema.safeParse(f).success, true, f.key);
});
test("property submission requires owned media references, not arbitrary remote URLs", () => {
  const p = {
    title: "Rumah baru nyaman",
    description:
      "Rumah dengan taman dan ruang keluarga yang nyaman untuk keluarga.",
    whatsapp: "081234567890",
    gallery: ["https://example.com/foto.jpg"],
  };
  assert.equal(basePropertySchema.safeParse(p).success, false);
  assert.equal(
    basePropertySchema.safeParse({ ...p, gallery: ["/api/media/clx123"] })
      .success,
    true,
  );
});
test("WhatsApp destinations normalize Indonesian phone numbers and reject missing contacts", () => {
  assert.equal(whatsappLink("", "test"), null);
  assert.equal(
    whatsappLink("081234567890", "Halo rumah"),
    "https://wa.me/6281234567890?text=Halo%20rumah",
  );
  assert.equal(whatsappLink("12", "test"), null);
});
