import { siteUrl } from "./format";
import type { Settings } from "./types";

// Identity and service scope supported by /tentang-kami and the existing brand asset.
// Contacts come only from administrator-managed SiteSettings, never listing members.
export const business = {
  name: "MR Properti",
  description:
    "Mitra pemasaran properti untuk jual, beli, dan sewa, serta layanan perbaikan dan penataan rumah maupun tempat usaha.",
  logo: "/brand/mrproperti-logo.png",
  areaServed: ["Bekasi", "Cikarang", "Karawang", "Cikampek"],
};

export const businessId = () => `${siteUrl()}/#organization`;

export function businessPhone(value: string) {
  if (!/^[+\d\s().-]+$/.test(value)) return undefined;
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  return /^62[1-9]\d{7,11}$/.test(digits) ? `+${digits}` : undefined;
}

export function businessSchema(settings: Pick<Settings, "whatsapp" | "email">) {
  const telephone = businessPhone(settings.whatsapp);
  return {
    "@type": "RealEstateAgent",
    "@id": businessId(),
    name: business.name,
    url: siteUrl(),
    description: business.description,
    logo: new URL(business.logo, siteUrl()).href,
    areaServed: business.areaServed,
    ...(telephone ? { telephone } : {}),
    ...(settings.email ? { email: settings.email } : {}),
  };
}
