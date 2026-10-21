import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/format";
import { db } from "@/lib/db";
import { indexingEnabled } from "@/lib/seo";
import { homeServices } from "@/lib/home-services";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!indexingEnabled()) return [];
  const [properties, services, posts] = await Promise.all([
    db().property.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true, gallery: true },
    }),
    db().service.findMany({ where: { active: true }, select: { slug: true } }),
    db().blogPost.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
    }),
  ]);
  return [
    { url: siteUrl(), changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl()}/properti`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl()}/layanan`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl()}/tim-kami`, changeFrequency: "monthly", priority: 0.6 },
    {
      url: `${siteUrl()}/kebijakan-privasi`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${siteUrl()}/syarat-dan-ketentuan`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    { url: `${siteUrl()}/blog`, changeFrequency: "weekly", priority: 0.7 },
    ...posts.map((p) => ({
      url: `${siteUrl()}/blog/${p.slug}`,
      lastModified: p.updatedAt,
      priority: 0.6,
    })),
    {
      url: `${siteUrl()}/kalkulator-kpr`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    ...properties.map((p) => ({
      url: `${siteUrl()}/properti/${p.slug}`,
      images: p.gallery.map((src) => new URL(src, siteUrl()).href),
      lastModified: p.updatedAt,
      priority: 0.8,
    })),
    ...homeServices.map((service) => ({
      url: `${siteUrl()}/layanan/${service.slug}`,
      priority: 0.7,
    })),
    ...services
      .filter(
        (service) =>
          !homeServices.some((category) => category.slug === service.slug),
      )
      .map((s) => ({
        url: `${siteUrl()}/layanan/${s.slug}`,
        priority: 0.7,
      })),
  ];
}
