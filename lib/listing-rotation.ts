// Rotasi urutan listing harian (zona waktu Asia/Jakarta).
// Hari genap sejak 2026-01-01 = lama→baru (ASC), hari ganjil = baru→lama (DESC),
// supaya listing di ujung mana pun bergantian tampil di atas.
export type RotationDirection = "asc" | "desc";

const EPOCH_UTC = Date.UTC(2026, 0, 1);
const DAY_MS = 86_400_000;
const jakartaDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function rotationDayNumber(now: Date = new Date()): number {
  const [y, m, d] = jakartaDate.format(now).split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - EPOCH_UTC) / DAY_MS);
}

export function rotationDirection(now: Date = new Date()): RotationDirection {
  // Untuk uji simulasi: LISTING_ROTATION_FORCE=asc|desc memaksa arah.
  const forced = process.env.LISTING_ROTATION_FORCE;
  if (forced === "asc" || forced === "desc") return forced;
  return Math.abs(rotationDayNumber(now)) % 2 === 0 ? "asc" : "desc";
}
