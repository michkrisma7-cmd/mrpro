import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { testimonialSchema } from "../lib/testimonial-validation";
const profile = {
  name: "Konsumen",
  category: "Pembeli Rumah",
  status: "Pembeli di Bekasi",
  quote: "Pelayanan ramah dan informatif.",
  rating: 5,
  position: 0,
  photoId: "clx12345678901234567890123",
  active: true,
};

test("testimonial validates required fields, lengths and uploaded media references", () => {
  assert.equal(testimonialSchema.safeParse(profile).success, true);
  assert.equal(
    testimonialSchema.safeParse({ ...profile, photoId: null }).success,
    true,
  );
  for (const change of [
    { name: " " },
    { category: "" },
    { quote: " " },
    { photoId: "https://example.com/photo.jpg" },
    { photoId: "../private" },
    { quote: "x".repeat(3001) },
    { rating: 0 },
    { rating: 6 },
    { rating: 2.5 },
    { position: -1 },
  ])
    assert.equal(
      testimonialSchema.safeParse({ ...profile, ...change }).success,
      false,
    );
});

test("testimonial mutations require admin and reject foreign photos before creating or editing profiles", async () => {
  let admin = false,
    photoAllowed = false,
    writes = 0;
  const paths: string[] = [];
  const actions = {} as {
    saveTestimonial: (
      state: object,
      form: FormData,
    ) => Promise<{ error?: string }>;
    deleteTestimonial: (state: object, form: FormData) => Promise<unknown>;
  };
  runInNewContext(
    ts.transpileModule(await readFile("lib/testimonial-actions.ts", "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    {
      exports: actions,
      require: (name: string) => {
        if (name === "./testimonial-validation") return { testimonialSchema };
        if (name === "./auth")
          return {
            requireAdmin: async () => {
              if (!admin) throw Error("denied");
              return { id: "admin" };
            },
          };
        if (name === "./db")
          return {
            db: () => ({
              media: {
                findFirst: async () =>
                  photoAllowed ? { id: profile.photoId } : null,
              },
              testimonial: {
                create: async () => writes++,
                update: async () => writes++,
                delete: async () => writes++,
              },
            }),
          };
        if (name === "next/cache")
          return { revalidatePath: (path: string) => paths.push(path) };
        if (name === "next/navigation")
          return {
            redirect: () => {
              throw Error("redirect");
            },
          };
        throw Error(name);
      },
    },
  );
  const form = new FormData();
  for (const [key, value] of Object.entries(profile))
    if (typeof value === "string") form.set(key, value);
  form.set("active", "on");
  form.set("rating", "5");
  form.set("position", "0");
  await assert.rejects(actions.saveTestimonial({}, form), /denied/);
  form.set("id", "existing");
  await assert.rejects(actions.saveTestimonial({}, form), /denied/);
  await assert.rejects(actions.deleteTestimonial({}, form), /denied/);
  assert.equal(writes, 0);
  admin = true;
  assert.match(
    (await actions.saveTestimonial({}, form)).error!,
    /Foto tidak valid/,
  );
  assert.equal(writes, 0);
  photoAllowed = true;
  await assert.rejects(actions.saveTestimonial({}, form), /redirect/);
  form.delete("id");
  await assert.rejects(actions.saveTestimonial({}, form), /redirect/);
  form.set("id", "existing");
  await assert.rejects(actions.deleteTestimonial({}, form), /redirect/);
  assert.equal(writes, 3);
  assert.ok(paths.includes("/"));
  assert.ok(paths.includes("/admin"));
});
