import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/format";
import { indexingEnabled } from "@/lib/seo";
export const dynamic = "force-dynamic";
export default function robots(): MetadataRoute.Robots {
  const live = indexingEnabled();
  return {
    rules: {
      userAgent: "*",
      allow: live ? ["/", "/api/media/"] : undefined,
      disallow: live ? ["/api/"] : ["/"],
    },
    sitemap: live ? `${siteUrl()}/sitemap.xml` : undefined,
  };
}
