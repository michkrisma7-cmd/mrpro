export type ListingShare = {
  slug: string;
  title: string;
  price?: string;
  location?: string;
  image?: string;
};

// Production's canonical host, verified independently of the browser origin.
// A local preview must never put localhost or the beta host in a shared link.
export function listingDetailPath(slug: string) {
  return `/properti/${encodeURIComponent(slug)}`;
}

export function listingShareUrl(slug: string) {
  return new URL(listingDetailPath(slug), "https://mrproperti.com").href;
}

export function listingShareLinks(listing: ListingShare) {
  const url = listingShareUrl(listing.slug);
  const summary = [listing.title, listing.price, listing.location]
    .filter((part) => part?.trim())
    .join("\n");
  const shortSummary = summary.replace(/\s+/g, " ");
  // X weighs many Unicode characters as two, and its URL as 23 characters.
  // At most 120 code points keeps the complete post below 280 even with emoji.
  const points = Array.from(shortSummary);
  const tweet =
    points.length > 120 ? `${points.slice(0, 119).join("")}…` : shortSummary;
  const withQuery = (base: string, params: Record<string, string>) =>
    `${base}?${new URLSearchParams(params)}`;
  return {
    whatsapp: withQuery("https://wa.me/", { text: `${summary}\n${url}` }),
    facebook: withQuery("https://www.facebook.com/sharer/sharer.php", {
      u: url,
    }),
    twitter: withQuery("https://twitter.com/intent/tweet", {
      text: tweet,
      url,
    }),
    telegram: withQuery("https://t.me/share/url", { text: summary, url }),
    email: `mailto:?subject=${encodeURIComponent(listing.title)}&body=${encodeURIComponent([listing.price, listing.location, url].filter(Boolean).join("\n"))}`,
  };
}
