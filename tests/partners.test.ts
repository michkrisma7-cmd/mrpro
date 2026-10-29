import { test } from "node:test";
import assert from "node:assert/strict";
import { partnerSchema } from "../lib/partner-validation";
const valid = {
  name: "Mitra Rumah",
  whatsapp: "0812-3456-7890",
  domicile: "Bekasi",
  areas: ["Bekasi", "Cikarang"],
  skills: ["AC", "Kelistrikan"],
  experience: "1–3 tahun",
  consent: true,
};
test("partner validation accepts Indonesian numbers and multiple selections", () => {
  for (const whatsapp of [
    "081234567890",
    "+62 812 3456 7890",
    "6281234567890",
  ]) {
    const p = partnerSchema.parse({ ...valid, whatsapp });
    assert.equal(p.whatsapp, "+6281234567890");
    assert.equal(p.areas.length, 2);
    assert.equal(p.skills.length, 2);
  }
});
test("partner validation rejects missing fields, invalid areas, skills, consent and numbers", () => {
  for (const change of [
    { name: "" },
    { whatsapp: "abc" },
    { whatsapp: "+12025550123" },
    { domicile: "Jakarta" },
    { areas: [] },
    { areas: ["Jakarta"] },
    { skills: [] },
    { skills: ["Lainnya"] },
    { experience: "" },
    { consent: false },
  ])
    assert.equal(
      partnerSchema.safeParse({ ...valid, ...change }).success,
      false,
    );
  for (const key of Object.keys(valid)) {
    const input: Record<string, unknown> = { ...valid };
    delete input[key];
    assert.equal(partnerSchema.safeParse(input).success, false);
  }
});
