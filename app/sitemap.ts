import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/format";
import { db, databaseConfigured } from "@/lib/db";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (
    !databaseConfigured ||
    !process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://")
  )
    return [];
  const [properties, services] = await Promise.all([
    db().property.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
    }),
    db().service.findMany({ where: { active: true }, select: { slug: true } }),
  ]);
  return [
    { url: siteUrl(), changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl()}/properti`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl()}/layanan`, changeFrequency: "weekly", priority: 0.8 },
    ...properties.map((p) => ({
      url: `${siteUrl()}/properti/${p.slug}`,
      lastModified: p.updatedAt,
      priority: 0.8,
    })),
    ...services.map((s) => ({
      url: `${siteUrl()}/layanan/${s.slug}`,
      priority: 0.7,
    })),
  ];
}
