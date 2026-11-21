import type { Listing } from "./types";
import { money } from "./format";
import { displayTitle } from "./listing-title";

// Use only supplied listing data; never assign a city or transaction by default.
export function listingSearchText(
  listing: Pick<Listing, "title" | "description" | "values">,
) {
  const text = (key: string) =>
    typeof listing.values[key] === "string"
      ? (listing.values[key] as string).trim()
      : "";
  const number = (key: string) => {
    const n = Number(listing.values[key]);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  const location =
    [text("kecamatan"), text("kota_kabupaten")]
      .filter((part, index, parts) => part && parts.indexOf(part) === index)
      .join(", ") || text("lokasi");
  const titleParts = [displayTitle(listing.title)];
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
  // Templat: "<Tipe> <transaksi> di <lokasi>, 2 KT, LT 60 m², harga Rp …. Lihat foto …"
  const kt = number("kamar_tidur");
  const lt = number("luas_tanah");
  const lb = number("luas_bangunan");
  const harga = number("harga");
  const facts = [
    kt && `${kt} KT`,
    lt && `LT ${lt} m²`,
    !lt && lb && `LB ${lb} m²`,
    harga && `harga ${money(harga)}`,
  ].filter(Boolean);
  const description = topic
    ? `${[topic, ...facts].join(", ")}. Lihat foto & hubungi pemilik di MR Properti.`
    : listing.description;
  return { title, description };
}
