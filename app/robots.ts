import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/format";
export default function robots(): MetadataRoute.Robots {
  const live = Boolean(
    process.env.DATABASE_URL &&
    process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://"),
  );
  return {
    rules: {
      userAgent: "*",
      allow: live ? "/" : undefined,
      disallow: live
        ? ["/admin", "/akun", "/login", "/api/", "/titip-properti"]
        : ["/"],
    },
    sitemap: live ? `${siteUrl()}/sitemap.xml` : undefined,
  };
}
