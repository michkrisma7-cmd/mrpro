import { siteUrl } from "./format";

export function listingPreviewImage(gallery: string[], title: string) {
  const url = new URL(gallery[0] || "/images/hero.webp", siteUrl());
  if (
    url.origin === siteUrl() &&
    /^\/api\/media\/[a-z0-9]+$/.test(url.pathname)
  ) {
    url.searchParams.set("variant", "share");
    return {
      url: url.href,
      width: 1200,
      height: 630,
      type: "image/jpeg",
      alt: title,
    };
  }
  // Preserve legacy public/local cover URLs; do not fetch arbitrary URLs on the server.
  return { url: url.href, alt: title };
}
