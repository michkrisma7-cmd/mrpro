import { z } from "zod";
export const teamSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter.").max(100),
  expertise: z.string().trim().min(2, "Isi bidang keahlian.").max(200),
  experience: z
    .string()
    .trim()
    .min(5, "Ceritakan pengalaman kerja minimal 5 karakter.")
    .max(5000),
  photoId: z.string().cuid("Unggah foto anggota tim terlebih dahulu."),
  active: z.boolean(),
});
