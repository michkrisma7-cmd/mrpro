import type { Listing } from "./types";
import { money } from "./format";
import { displayTitle } from "./listing-title";
import { shortMoney } from "./area-content";

// Judul <title> maks 65 karakter. " | MR Properti" ditambahkan hanya bila masih muat.
const TITLE_MAX = 65;
const BRAND = " | MR Properti";
const shortCity = (city: string) =>
  city.replace(/^(kabupaten|kab\.?|kota administrasi|kota)\s+/i, "");
function clip(text: string, max: number) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max + 1);
  const space = cut.lastIndexOf(" ");
  return cut.slice(0, space > max * 0.6 ? space : max).replace(/[\s,–-]+$/, "");
}

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
    [text("kecamatan"), shortCity(text("kota_kabupaten"))]
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
  const fullTitle =
    location && !baseTitle.toLowerCase().includes(location.toLowerCase())
      ? `${baseTitle} di ${location}`
      : baseTitle;
  const topic = [text("jenis"), text("transaksi"), location && `di ${location}`]
    .filter(Boolean)
    .join(" ");
  const kt = number("kamar_tidur");
  const km = number("kamar_mandi");
  const lt = number("luas_tanah");
  const lb = number("luas_bangunan");
  const harga = number("harga");
  // Templat: "<Tipe> <transaksi> di <lokasi>, 2 KT 1 KM, LT 60 m², LB 30 m². Harga Rp …. Lihat foto …"
  const rooms = [kt && `${kt} KT`, km && `${km} KM`].filter(Boolean).join(" ");
  const facts = [rooms, lt && `LT ${lt} m²`, lb && `LB ${lb} m²`].filter(
    Boolean,
  );
  const description = topic
    ? `${[topic, ...facts].join(", ")}.${harga ? ` Harga ${money(harga)}.` : ""} Lihat foto & hubungi pemilik di MR Properti.`
    : listing.description;
  // Templat judul: "<judul> <Tipe> <Transaksi> di <Kecamatan>, <Kota> – Rp 350 juta"
  const priceTag = harga ? ` – ${shortMoney(harga)}` : "";
  const core = `${clip(fullTitle, TITLE_MAX - priceTag.length)}${priceTag}`;
  return {
    title: core,
    description,
    documentTitle:
      core.length + BRAND.length <= TITLE_MAX ? `${core}${BRAND}` : core,
  };
}
