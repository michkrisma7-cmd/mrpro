import { z } from "zod";
export const blogFields = z.object({
  title: z.string().trim().min(3, "Judul minimal 3 karakter.").max(160),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(180)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung.",
    ),
  excerpt: z.string().trim().min(10, "Ringkasan minimal 10 karakter.").max(350),
  content: z
    .string()
    .trim()
    .min(20, "Isi artikel minimal 20 karakter.")
    .max(50000),
  published: z.boolean(),
});

export function prepareBlogInput(value: unknown) {
  if (!value || typeof value !== "object") return value;
  const input = value as Record<string, unknown>;
  if (typeof input.slug === "string" && input.slug.trim()) return value;
  if (input.slug != null && typeof input.slug !== "string") return value;
  const slug =
    typeof input.title === "string"
      ? input.title
          .normalize("NFKD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 160)
          .replace(/-$/, "")
      : "";
  return { ...input, slug: slug || "artikel" };
}
export const blogSchema = z.preprocess(prepareBlogInput, blogFields);
