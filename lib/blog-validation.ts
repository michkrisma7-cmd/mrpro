import { z } from "zod";
export const blogSchema = z.object({
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
