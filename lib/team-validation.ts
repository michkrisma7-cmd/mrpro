import { z } from "zod";
export const teamSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter.").max(100),
  expertise: z.string().trim().min(2, "Isi bidang keahlian.").max(200),
  experience: z.string().trim().max(5000),
  description: z.string().trim().max(2000).default(""),
  fullProfile: z.string().trim().max(15000).default(""),
  position: z.coerce.number().int().min(0).max(9999).default(0),
  photoId: z.string().cuid("Unggah foto anggota tim terlebih dahulu."),
  active: z.boolean(),
});
