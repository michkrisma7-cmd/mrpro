import { z } from "zod";
import type { Field, Values } from "./types";
export const phoneSchema = z
  .string()
  .regex(/^\+?[0-9 ()-]{9,22}$/, "Nomor WhatsApp tidak valid.")
  .refine((v) => {
    const n = v.replace(/\D/g, "");
    return n.length >= 9 && n.length <= 15;
  }, "Nomor WhatsApp tidak valid.");
export const basePropertySchema = z.object({
  title: z.string().trim().min(8, "Judul minimal 8 karakter.").max(150),
  description: z
    .string()
    .trim()
    .min(30, "Deskripsi minimal 30 karakter.")
    .max(10000),
  whatsapp: phoneSchema,
  gallery: z
    .array(z.string().regex(/^\/api\/media\/[a-z0-9]+$/))
    .min(1, "Unggah minimal satu foto.")
    .max(12),
});
export function parseValues(fields: Field[], form: FormData): Values {
  const values: Values = {};
  for (const f of fields.filter((f) => f.showInForm)) {
    const raw =
      f.type === "MULTISELECT"
        ? form.getAll(`field_${f.key}`).map(String)
        : String(form.get(`field_${f.key}`) ?? "").trim();
    const empty = Array.isArray(raw) ? raw.length === 0 : raw === "";
    if (empty) {
      if (f.required) throw new Error(`${f.name} wajib diisi.`);
      continue;
    }
    if (f.type === "NUMBER" || f.type === "PRICE") {
      const n = Number(raw);
      if (
        !Number.isFinite(n) ||
        n < 0 ||
        n > 1e15 ||
        (f.type === "PRICE" && !Number.isInteger(n))
      )
        throw new Error(`${f.name} harus berupa angka valid.`);
      values[f.key] = n;
    } else if (f.type === "SELECT") {
      if (!f.options.includes(raw as string))
        throw new Error(`Pilihan ${f.name} tidak valid.`);
      values[f.key] = raw as string;
    } else if (f.type === "MULTISELECT") {
      if (!(raw as string[]).every((v) => f.options.includes(v)))
        throw new Error(`Pilihan ${f.name} tidak valid.`);
      values[f.key] = [...new Set(raw as string[])];
    } else {
      if (String(raw).length > 2000)
        throw new Error(`${f.name} terlalu panjang.`);
      values[f.key] = raw as string;
    }
  }
  return values;
}
export const fieldSchema = z
  .object({
    key: z
      .string()
      .regex(
        /^[a-z][a-z0-9_]{0,49}$/,
        "Key harus huruf kecil, angka, atau underscore.",
      )
      .refine(
        (k) =>
          ![
            "__proto__",
            "constructor",
            "prototype",
            "gallery",
            "title",
            "description",
          ].includes(k),
      ),
    name: z.string().trim().min(1).max(80),
    type: z.enum(["TEXT", "NUMBER", "PRICE", "SELECT", "MULTISELECT"]),
    options: z.array(z.string().trim().min(1).max(100)).max(50),
    required: z.boolean(),
    showInForm: z.boolean(),
    showOnCard: z.boolean(),
    showOnDetail: z.boolean(),
    cardLabel: z.string().trim().max(80),
    position: z.number().int().min(0).max(999),
  })
  .refine(
    (f) => !["SELECT", "MULTISELECT"].includes(f.type) || f.options.length >= 1,
    "Isi pilihan untuk field select.",
  )
  .refine(
    (f) => !f.required || f.showInForm,
    "Field wajib harus tampil di form.",
  );
export function actionError(error: unknown) {
  if (error instanceof z.ZodError)
    return error.issues[0]?.message || "Periksa data Anda.";
  if (
    error instanceof Error &&
    !/prisma|database|connection|credential|fetch|ECONN|timeout/i.test(
      error.message,
    )
  )
    return error.message;
  return "Permintaan belum berhasil. Coba lagi atau hubungi admin.";
}
