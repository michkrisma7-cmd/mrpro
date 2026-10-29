import { z } from "zod";
export const partnerAreas = [
  "Cikarang",
  "Bekasi",
  "Karawang",
  "Cikampek",
] as const;
export const partnerSkills = [
  "AC",
  "Plafon",
  "Kanopi",
  "Pagar",
  "Kelistrikan",
  "Baja ringan",
  "Dak & peningkatan rumah",
  "Kitchen set",
  "Pengecatan",
  "Perbaikan rumah",
] as const;
export const partnerExperience = [
  "Kurang dari 1 tahun",
  "1–3 tahun",
  "4–7 tahun",
  "Lebih dari 7 tahun",
] as const;
export const partnerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama minimal 2 karakter.")
    .max(150, "Nama maksimal 150 karakter."),
  whatsapp: z
    .string()
    .trim()
    .max(30)
    .transform((s) => s.replace(/[\s().-]/g, ""))
    .pipe(
      z
        .string()
        .regex(
          /^(?:08|\+628|628)\d{8,11}$/,
          "Isi nomor WhatsApp Indonesia yang valid, misalnya 081234567890 atau +6281234567890.",
        ),
    )
    .transform((s) =>
      s.startsWith("0") ? `+62${s.slice(1)}` : s.startsWith("+") ? s : `+${s}`,
    ),
  domicile: z.enum(partnerAreas, { error: "Pilih domisili yang tersedia." }),
  areas: z
    .array(z.enum(partnerAreas))
    .min(1, "Pilih minimal satu wilayah layanan.")
    .max(4)
    .transform((a) => [...new Set(a)]),
  skills: z
    .array(z.enum(partnerSkills))
    .min(1, "Pilih minimal satu bidang pekerjaan.")
    .max(10)
    .transform((a) => [...new Set(a)]),
  experience: z.enum(partnerExperience, { error: "Pilih pengalaman kerja." }),
  consent: z.literal(true, {
    error: "Persetujuan untuk dihubungi wajib diberikan.",
  }),
});
export type PartnerInput = z.input<typeof partnerSchema>;
