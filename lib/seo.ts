import type { Metadata } from "next";
import { siteUrl } from "./format";
export const brand = "MR Properti";
export const homeTitle = "Jual Beli & Sewa Properti Cikarang dan Bekasi";
export const homeDescription =
  "Cari rumah, tanah, apartemen, dan ruko dijual atau disewa di Cikarang dan Bekasi. Titip properti dan temukan jasa tukang bersama MR Properti.";
export function indexingEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  if (
    env.NODE_ENV !== "production" ||
    env.SEO_INDEXING === "false" ||
    env.VERCEL_ENV === "preview" ||
    !env.DATABASE_URL
  )
    return false;
  try {
    const url = new URL(env.NEXT_PUBLIC_SITE_URL || "");
    return (
      url.protocol === "https:" &&
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    );
  } catch {
    return false;
  }
}
export function pageMetadata({
  title,
  description,
  path,
  images = ["/images/hero.webp"],
  noindex = false,
}: {
  title: string;
  description: string;
  path: string;
  images?: string[];
  noindex?: boolean;
}): Metadata {
  const summary = description.replace(/\s+/g, " ").trim().slice(0, 160);
  const imageUrls = (images.length ? images : ["/images/hero.webp"]).map(
    (image) => new URL(image, siteUrl()).href,
  );
  return {
    title,
    description: summary,
    alternates: { canonical: path },
    robots: {
      index: indexingEnabled() && !noindex,
      follow: true,
      googleBot: {
        index: indexingEnabled() && !noindex,
        follow: true,
        "max-image-preview": "large",
      },
    },
    openGraph: {
      type: "website",
      locale: "id_ID",
      siteName: brand,
      title: `${title} | ${brand}`,
      description: summary,
      url: path,
      images: imageUrls,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${brand}`,
      description: summary,
      images: imageUrls,
    },
  };
}
export function catalogSeo(
  params: Record<string, string | string[] | undefined>,
) {
  const query = new URLSearchParams();
  for (const key of ["q", "jenis", "transaksi", "harga", "urut", "favorit"]) {
    const value = params[key];
    if (typeof value === "string" && value) query.set(key, value);
  }
  const filtered = query.size > 0;
  const page = Math.max(
    1,
    Math.min(
      100000,
      Number.parseInt(
        typeof params.page === "string" ? params.page : "1",
        10,
      ) || 1,
    ),
  );
  if (page > 1) query.set("page", String(page));
  return {
    path: `/properti${query.size ? `?${query}` : ""}`,
    noindex: filtered,
    page,
  };
}
export function breadcrumbs(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: new URL(item.path, siteUrl()).href,
    })),
  };
}
export function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
