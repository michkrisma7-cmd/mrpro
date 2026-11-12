import type { Listing } from "./types";

// Use only supplied listing data; never assign a city or transaction by default.
export function listingSearchText(
  listing: Pick<Listing, "title" | "description" | "values">,
) {
  const text = (key: string) =>
    typeof listing.values[key] === "string"
      ? (listing.values[key] as string).trim()
      : "";
  const location =
    [text("kecamatan"), text("kota_kabupaten")]
      .filter((part, index, parts) => part && parts.indexOf(part) === index)
      .join(", ") || text("lokasi");
  const titleParts = [listing.title.trim()];
  for (const part of [text("jenis"), text("transaksi")]) {
    if (
      part &&
      !titleParts.join(" ").toLowerCase().includes(part.toLowerCase())
    )
      titleParts.push(part);
  }
  const baseTitle = titleParts.join(" ");
  const title =
    location && !baseTitle.toLowerCase().includes(location.toLowerCase())
      ? `${baseTitle} di ${location}`
      : baseTitle;
  const topic = [text("jenis"), text("transaksi"), location && `di ${location}`]
    .filter(Boolean)
    .join(" ");
  return {
    title,
    description: topic
      ? `${topic}. ${listing.description}`
      : listing.description,
  };
}
