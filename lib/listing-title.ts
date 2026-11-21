// Rapikan judul listing untuk tampilan saja (data asli di database tidak diubah).
// Judul HURUF BESAR semua atau huruf kecil semua diubah ke Title Case;
// judul yang sudah campuran dibiarkan karena kemungkinan sudah ditulis rapi.
const ACRONYMS = new Set([
  "AJB", "BCM", "BSD", "BTN", "DP", "GSR", "HGB", "IMB", "KM", "KPR", "KT",
  "LB", "LT", "PBG", "PLN", "PPJB", "RT", "RW", "SHGB", "SHM", "PDAM",
]);
const SMALL = new Set([
  "di", "dan", "ke", "dari", "yang", "untuk", "dengan", "atau", "per", "&",
]);

function needsNormalizing(title: string) {
  const letters = title.replace(/[^\p{L}]/gu, "");
  if (letters.length < 4) return false;
  const upper = letters.replace(/[^\p{Lu}]/gu, "").length;
  const ratio = upper / letters.length;
  return ratio > 0.6 || ratio === 0;
}

function formatWord(word: string, first: boolean) {
  const bare = word.replace(/[^\p{L}\p{N}]/gu, "");
  const upper = bare.toUpperCase();
  if (ACRONYMS.has(upper)) return word.toUpperCase();
  if (/\d/.test(bare)) return word.toUpperCase();
  const lower = word.toLowerCase();
  if (!first && SMALL.has(lower)) return lower;
  return lower.replace(/\p{L}/u, (c) => c.toUpperCase());
}

export function displayTitle(title: string) {
  const clean = title.replace(/\s+/g, " ").trim();
  if (!needsNormalizing(clean)) return clean;
  return clean
    .split(" ")
    .map((word, i) =>
      word
        .split("-")
        .map((part, j) => formatWord(part, i === 0 && j === 0))
        .join("-"),
    )
    .join(" ");
}
