import catalog from "./home-services.json";

export const homeServices = catalog.categories;
export const serviceTimeGuide = catalog.timeGuide;
export type HomeService = (typeof homeServices)[number];

// Search phrases describe the actual work offered on each existing service page.
const searchTitles: Record<string, string> = {
  ac: "Jasa Servis dan Pasang AC",
  plafon: "Jasa Pasang Plafon",
  kanopi: "Jasa Pasang Kanopi",
  pagar: "Jasa Pembuatan dan Perbaikan Pagar",
  kelistrikan: "Jasa Instalasi dan Perbaikan Listrik Rumah",
  "baja-ringan": "Jasa Pasang Atap Baja Ringan",
  "dak-peningkatan-rumah": "Jasa Dak dan Peningkatan Rumah",
  "kitchen-set": "Jasa Pembuatan Kitchen Set",
  pengecatan: "Jasa Pengecatan Rumah",
  "perbaikan-rumah": "Jasa Renovasi dan Perbaikan Rumah",
};

export function homeServiceSearchTitle(service: HomeService) {
  return searchTitles[service.slug] || `Jasa ${service.name}`;
}

export function getHomeService(slug: string) {
  return homeServices.find((service) => service.slug === slug);
}
