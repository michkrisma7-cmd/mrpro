import { siteUrl } from "./format";
import type { Settings } from "./types";

// One organization provides the national listing platform and local field services.
// Contacts come only from administrator-managed SiteSettings, never listing members.
export const business = {
  name: "MR Properti",
  description:
    "Platform listing properti di seluruh Indonesia, dengan layanan pekerjaan, perbaikan, dan penataan rumah maupun tempat usaha di Bekasi, Cikarang, Karawang, dan Cikampek.",
  logo: "/brand/mrproperti-logo.png",
  workAreas: ["Bekasi", "Cikarang", "Karawang", "Cikampek"],
};

export const workAreaDescription =
  "Untuk sementara, wilayah layanan pekerjaan kami masih terbatas di Bekasi, Cikarang, Karawang, dan Cikampek. Ketersediaan layanan di setiap lokasi disesuaikan dengan jenis pekerjaan, akses lokasi, dan kesiapan tim.";

export const businessId = () => `${siteUrl()}/#organization`;
export const listingPlatformId = () => `${siteUrl()}/#listing-platform`;
export const workServiceId = () => `${siteUrl()}/#work-services`;

export function businessPhone(value: string) {
  if (!/^[+\d\s().-]+$/.test(value)) return undefined;
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  return /^62[1-9]\d{7,11}$/.test(digits) ? `+${digits}` : undefined;
}

export function businessSchema(settings: Pick<Settings, "whatsapp" | "email">) {
  const telephone = businessPhone(settings.whatsapp);
  return {
    "@type": "Organization",
    "@id": businessId(),
    name: business.name,
    url: siteUrl(),
    description: business.description,
    logo: new URL(business.logo, siteUrl()).href,
    ...(telephone ? { telephone } : {}),
    ...(settings.email ? { email: settings.email } : {}),
  };
}

export function listingPlatformSchema() {
  return {
    "@type": "Service",
    "@id": listingPlatformId(),
    name: "Platform Listing Mr Properti",
    serviceType: "Platform listing jual, beli, sewa, dan over kredit properti",
    url: `${siteUrl()}/properti`,
    areaServed: { "@type": "Country", name: "Indonesia" },
    provider: { "@id": businessId() },
  };
}

export function workServiceSchema() {
  return {
    "@type": "Service",
    "@id": workServiceId(),
    name: "Layanan Pekerjaan Mr Properti",
    serviceType: "Pekerjaan, renovasi, dan perbaikan rumah maupun tempat usaha",
    description: workAreaDescription,
    url: `${siteUrl()}/layanan`,
    areaServed: business.workAreas,
    provider: { "@id": businessId() },
  };
}
