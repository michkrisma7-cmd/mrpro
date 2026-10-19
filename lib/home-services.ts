import catalog from "./home-services.json";

export const homeServices = catalog.categories;
export const serviceTimeGuide = catalog.timeGuide;
export type HomeService = (typeof homeServices)[number];

export function getHomeService(slug: string) {
  return homeServices.find((service) => service.slug === slug);
}
