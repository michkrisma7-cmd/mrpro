import { whatsappLink } from "@/lib/format";

/** Nomor resmi MR Properti; dipakai bila pengaturan admin kosong/tidak valid. */
export const officialWhatsapp = "08811063079";

/** Satu-satunya tombol WhatsApp melayang, di samping tombol Chat. Tanpa JS. */
export function WhatsappFloat({ whatsapp }: { whatsapp: string }) {
  const href =
    whatsappLink(whatsapp, "Halo MR Properti, saya ingin berkonsultasi.") ||
    whatsappLink(
      officialWhatsapp,
      "Halo MR Properti, saya ingin berkonsultasi.",
    );
  if (!href) return null;
  return (
    <a
      className="mr-wa-float"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp MR Properti"
      title="WhatsApp MR Properti"
    >
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <path d="M20.5 11.7a8.5 8.5 0 0 1-12.6 7.5L3 20.5l1.3-4.7a8.5 8.5 0 1 1 16.2-4.1Z" />
        <path d="m8.2 7.8 1.4 2.6-.9 1c.8 1.5 1.9 2.6 3.5 3.3l1-1 2.7 1.3c-.3 1.4-1.1 2-2.4 1.8-3.7-.6-6.7-3.5-7-6.9-.1-1.1.5-1.8 1.7-2.1Z" />
      </svg>
    </a>
  );
}
