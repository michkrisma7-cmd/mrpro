import { z } from "zod";

export const chatInput = z
  .object({
    message: z.string().trim().min(1).max(1200),
    history: z
      .array(
        z
          .object({
            role: z.enum(["user", "assistant"]),
            content: z.string().max(2400),
          })
          .strict(),
      )
      .max(6)
      .default([]),
  })
  .strict();
import { handoffReply, type ChatSource } from "./chat-shared";
export {
  handoffReply,
  unavailableReply,
  scopeReply,
  type ChatSource,
  type ChatAnswer,
} from "./chat-shared";

export function queryTokens(query: string) {
  const stop = new Set(
    "apa apakah ada yang dan atau untuk dengan dari saya aku gw gue mau ingin bisa tolong dong nih itu ini nya berapa bagaimana gimana tentang info informasi layanan properti rumah mr cari tahu jelaskan dong di ke ya please".split(
      " ",
    ),
  );
  return [
    ...new Set(
      query
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length >= 2 && !stop.has(t)),
    ),
  ].slice(0, 16);
}
export function rankSources(sources: ChatSource[], query: string, take = 8) {
  const tokens = queryTokens(query);
  const matches = (text: string, token: string) =>
    token.length <= 3
      ? new RegExp(`\\b${token}\\b`, "i").test(text)
      : text.toLowerCase().includes(token);
  return sources
    .map((source) => ({
      source,
      score: tokens.reduce(
        (sum, token) =>
          sum +
          (matches(source.title, token) ? 5 : 0) +
          (matches(source.text, token) ? 1 : 0),
        0,
      ),
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, take)
    .map((row) => row.source);
}

// Explicit unrelated requests stop before a paid model call. Remaining scope is
// checked against retrieved knowledge by the workflow, with a handoff on gaps.
export function outsideChatScope(message: string) {
  return (
    /\b(coding|ngoding|kode program|javascript|typescript|python|react|nextjs|next\.js|html|css|sql|debug|programming|buat(?:kan)? (?:kode|script|website|aplikasi)|politik|pemilu|resep masak|horoskop|ramalan|judi|slot gacor|bitcoin|crypto)\b/i.test(
      message,
    ) ||
    /(?:abaikan|ignore|lupakan).{0,40}(?:instruksi|instruction|prompt|aturan)|(?:system|developer)\s*(?:prompt|message)|jailbreak/i.test(
      message,
    )
  );
}

const modelAnswer = z.object({
  reply: z.string().trim().min(1).max(2400),
  handoff: z.boolean(),
  source_ids: z.array(z.string()).max(8),
});
export function groundedAnswer(raw: unknown, sources: ChatSource[]) {
  const parsed = modelAnswer.safeParse(raw);
  if (!parsed.success) return null;
  const answer = parsed.data;
  const ids = new Set(sources.map((s) => s.id));
  if (answer.source_ids.some((id) => !ids.has(id))) return null;
  if (!answer.handoff && answer.source_ids.length === 0) return null;
  // Navigation and WhatsApp links are assembled by the server, never the model.
  if (/https?:\/\/|www\.|wa\.me|<[^>]*>/i.test(answer.reply)) return null;
  return {
    reply: answer.handoff ? handoffReply : answer.reply,
    handoff: answer.handoff,
    sources: answer.handoff
      ? []
      : sources
          .filter((s) => answer.source_ids.includes(s.id))
          .map(({ title, path }) => ({ title, path })),
  };
}

// ---------------------------------------------------------------------------
// Listing search with filters parsed from the visitor's own words. Pure so the
// chat knowledge loader and its tests share one implementation.

export type ListingFilters = {
  transaksi?: "Dijual" | "Disewa" | "Over Kredit";
  jenis?: "Rumah" | "Apartemen" | "Tanah" | "Ruko" | "Villa";
  maxPrice?: number;
  minPrice?: number;
  bedrooms?: number;
};

export type ListingRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  values: unknown;
};

const priceUnits: Record<string, number> = {
  ribu: 1e3,
  rb: 1e3,
  juta: 1e6,
  jt: 1e6,
  miliar: 1e9,
  milyar: 1e9,
  m: 1e9,
};

export function parseListingFilters(query: string): ListingFilters {
  const q = query.toLowerCase();
  const filters: ListingFilters = {};
  if (
    /\b(over\s*kredit|take\s*over|oper\s*kredit|alih\s*kredit|overkredit)\b/.test(
      q,
    )
  )
    filters.transaksi = "Over Kredit";
  else if (/\b(sewa|disewa|disewakan|kontrak|ngontrak)\b/.test(q))
    filters.transaksi = "Disewa";
  else if (/\b(dijual|jual|beli|membeli)\b/.test(q))
    filters.transaksi = "Dijual";
  if (/\b(apartemen|apartment)\b/.test(q)) filters.jenis = "Apartemen";
  else if (/\b(tanah|kavling|kaveling)\b/.test(q)) filters.jenis = "Tanah";
  else if (/\bruko\b/.test(q)) filters.jenis = "Ruko";
  else if (/\bvilla\b/.test(q)) filters.jenis = "Villa";
  else if (/\brumah\b/.test(q)) filters.jenis = "Rumah";
  const price =
    /(di\s*bawah|dibawah|kurang\s*dari|maks(?:imal)?|max|budget|bujet|sampai|hingga|<|di\s*atas|diatas|lebih\s*dari|minimal|min|>)\s*(?:rp\.?\s*)?(\d+(?:[.,]\d+)?)\s*(juta|jt|miliar|milyar|m|ribu|rb)\b/g;
  for (const [, word, amount, unit] of q.matchAll(price)) {
    const value = Number(amount.replace(",", ".")) * priceUnits[unit];
    if (!Number.isFinite(value) || value <= 0) continue;
    if (/atas|lebih|min|>/.test(word)) filters.minPrice = value;
    else filters.maxPrice = value;
  }
  const bedrooms = q.match(/\b(\d{1,2})\s*(?:kamar(?:\s*tidur)?|kt)\b/);
  if (bedrooms) filters.bedrooms = Number(bedrooms[1]);
  return filters;
}

const filterWords = new Set(
  "dijual jual beli sewa disewa disewakan kontrak over kredit take oper alih overkredit apartemen tanah kavling ruko villa rumah bawah dibawah atas diatas kurang lebih maks maksimal max budget bujet sampai hingga minimal juta miliar milyar ribu harga murah kamar tidur unit listing yang".split(
    " ",
  ),
);

function listingValues(row: ListingRow) {
  return (
    row.values && typeof row.values === "object" ? row.values : {}
  ) as Record<string, unknown>;
}

export function listingLocation(row: ListingRow) {
  const v = listingValues(row);
  return ["lokasi", "kelurahan_desa", "kecamatan", "kota_kabupaten", "provinsi"]
    .map((key) => (typeof v[key] === "string" ? (v[key] as string).trim() : ""))
    .filter(Boolean)
    .join(", ");
}

export function formatPriceShort(value: number) {
  const id = (n: number) =>
    n.toLocaleString("id-ID", { maximumFractionDigits: 2 });
  if (value >= 1e9) return `Rp${id(value / 1e9)} miliar`;
  if (value >= 1e6) return `Rp${id(value / 1e6)} juta`;
  return `Rp${id(value)}`;
}

export function listingSummary(row: ListingRow) {
  const v = listingValues(row);
  const num = (key: string) =>
    typeof v[key] === "number" && Number.isFinite(v[key])
      ? (v[key] as number)
      : null;
  const specs = [
    num("kamar_tidur") !== null && `KT ${num("kamar_tidur")}`,
    num("kamar_mandi") !== null && `KM ${num("kamar_mandi")}`,
    num("luas_tanah") !== null && `LT ${num("luas_tanah")} m²`,
    num("luas_bangunan") !== null && `LB ${num("luas_bangunan")} m²`,
  ].filter(Boolean);
  const harga = num("harga");
  return [
    `Harga: ${harga ? formatPriceShort(harga) : "tanya tim"}`,
    `Transaksi: ${v.transaksi ?? "-"} · Jenis: ${v.jenis ?? "-"}`,
    specs.length ? specs.join(" · ") : "",
    `Lokasi: ${listingLocation(row) || "-"}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Returns null when the question is not about listings. Otherwise returns the
 * best matches (cheapest first) and a note telling the model whether they match
 * exactly or are the nearest alternatives.
 */
export function matchListings(rows: ListingRow[], query: string, take = 5) {
  const filters = parseListingFilters(query);
  const places = rows.map((row) =>
    `${row.title} ${listingLocation(row)}`.toLowerCase(),
  );
  const areaTokens = queryTokens(query).filter(
    (t) =>
      t.length >= 4 &&
      !filterWords.has(t) &&
      !/^\d/.test(t) &&
      places.some((p) => p.includes(t)),
  );
  const asksListing =
    Object.keys(filters).length > 0 ||
    /\b(properti|listing|unit|hunian|perumahan)\b/i.test(query);
  const ownerIntent =
    /\b(iklan|iklankan|mengiklankan|titip|pasang|menitipkan)\b/i.test(query) &&
    !filters.maxPrice &&
    !filters.minPrice &&
    !filters.bedrooms;
  if (!asksListing || ownerIntent) return null;
  const areaHits = (i: number) =>
    areaTokens.filter((t) => places[i].includes(t)).length;
  const v = (row: ListingRow) => listingValues(row);
  const price = (row: ListingRow) =>
    typeof v(row).harga === "number" ? (v(row).harga as number) : Infinity;
  const inArea = (i: number) =>
    !areaTokens.length || areaTokens.some((t) => places[i].includes(t));
  const pick = (strict: boolean, useArea: boolean, useType = true) =>
    rows
      .map((row, i) => ({ row, i }))
      .filter(({ row, i }) => {
        const val = v(row);
        if (useType && filters.transaksi && val.transaksi !== filters.transaksi)
          return false;
        if (useType && filters.jenis && val.jenis !== filters.jenis)
          return false;
        if (useArea && !inArea(i)) return false;
        if (!strict) return true;
        if (filters.maxPrice && !(price(row) <= filters.maxPrice)) return false;
        if (filters.minPrice && !(price(row) >= filters.minPrice)) return false;
        if (filters.bedrooms && v(row).kamar_tidur !== filters.bedrooms)
          return false;
        return true;
      })
      .sort(
        (a, b) => areaHits(b.i) - areaHits(a.i) || price(a.row) - price(b.row),
      )
      .map(({ row }) => row);
  const describe = [
    filters.transaksi,
    filters.jenis,
    areaTokens.length ? `area ${areaTokens.join("/")}` : "",
    filters.bedrooms ? `${filters.bedrooms} kamar tidur` : "",
    filters.maxPrice ? `harga ≤ ${formatPriceShort(filters.maxPrice)}` : "",
    filters.minPrice ? `harga ≥ ${formatPriceShort(filters.minPrice)}` : "",
  ]
    .filter(Boolean)
    .join(", ");
  let matches = pick(true, true);
  let note = `Pencarian listing (${describe || "semua"}): ${matches.length} listing cocok persis.`;
  if (!matches.length) {
    matches = pick(false, true);
    if (!matches.length) matches = pick(false, false);
    if (!matches.length && areaTokens.length)
      matches = pick(false, true, false);
    note = `Pencarian listing (${describe || "semua"}): tidak ada yang cocok persis. Listing di bawah adalah alternatif terdekat; sebutkan bedanya (harga/kamar/wilayah) dengan jujur.`;
  }
  return {
    filters,
    areaTokens,
    exact: !note.includes("tidak ada"),
    note,
    matches: matches.slice(0, take),
  };
}
