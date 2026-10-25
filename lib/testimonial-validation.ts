import { z } from "zod";
export const testimonialSchema = z.object({
  category: z.string().trim().min(2, "Isi kategori testimoni.").max(120),
  name: z.string().trim().min(2, "Nama minimal 2 karakter.").max(100),
  status: z.string().trim().min(2, "Isi status konsumen.").max(200),
  quote: z.string().trim().min(10, "Testimoni minimal 10 karakter.").max(3000),
  rating: z.coerce.number().int().min(1).max(5),
  position: z.coerce.number().int().min(0).max(9999),
  photoId: z.string().cuid("Foto tidak valid.").nullable(),
  active: z.boolean(),
});
