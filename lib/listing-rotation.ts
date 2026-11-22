// Rolling listing 4x sehari (zona waktu Asia/Jakarta), dihitung langsung di query.
// - Listing baru (tayang ≤ NEW_LISTING_DAYS hari) selalu di atas, terbaru dulu.
// - Listing lain: urutan dasar tanggal tayang lama→baru (id pemecah seri),
//   dibalik pada hari genap sejak 2026-01-01, lalu diputar melingkar sebanyak
//   (putaran × SHIFT_PER_ROUND) mod N. Putaran = hari × 4 + slot (00/06/12/18 WIB).
// Tidak perlu kolom rank, cron, atau n8n: putaran masuk ke kunci cache, jadi
// urutan berganti sendiri tepat di batas slot dan tidak bisa "macet".
import { Prisma } from "@prisma/client";

export const ROUNDS_PER_DAY = 4;
const EPOCH_UTC = Date.UTC(2026, 0, 1);
const DAY_MS = 86_400_000;
const jakartaParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
});

function parts(now: Date) {
  const p = Object.fromEntries(
    jakartaParts.formatToParts(now).map((x) => [x.type, x.value]),
  );
  return {
    y: Number(p.year),
    m: Number(p.month),
    d: Number(p.day),
    h: Number(p.hour),
  };
}

export function rotationDayNumber(now: Date = new Date()): number {
  const { y, m, d } = parts(now);
  return Math.round((Date.UTC(y, m - 1, d) - EPOCH_UTC) / DAY_MS);
}

export function rotationRound(now: Date = new Date()): number {
  // Uji simulasi: LISTING_ROTATION_ROUND=<angka> memaksa putaran.
  const forced = Number.parseInt(process.env.LISTING_ROTATION_ROUND || "", 10);
  if (Number.isFinite(forced)) return forced;
  const { h } = parts(now);
  return (
    rotationDayNumber(now) * ROUNDS_PER_DAY +
    Math.floor(h / (24 / ROUNDS_PER_DAY))
  );
}

function positiveInt(value: string | undefined, fallback: number) {
  const n = Number.parseInt(value || "", 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function rotationSettings() {
  return {
    newListingDays: positiveInt(process.env.NEW_LISTING_DAYS, 7),
    shiftPerRound: positiveInt(process.env.LISTING_SHIFT_PER_ROUND, 18),
  };
}

/** Hari genap = dibalik (terakhir → pertama), hari ganjil = pertama → terakhir. */
export function roundReversed(round: number): boolean {
  return Math.floor(round / ROUNDS_PER_DAY) % 2 === 0;
}

export function roundOffset(round: number, shift: number, n: number): number {
  if (n <= 0) return 0;
  return (((round * shift) % n) + n) % n;
}

/** Referensi murni (dipakai tes & laporan): urutan id listing lama sesuai putaran. */
export function rotateIds(
  baseAscending: string[],
  round: number,
  shift: number,
): string[] {
  const base = roundReversed(round)
    ? [...baseAscending].reverse()
    : baseAscending;
  const off = roundOffset(round, shift, base.length);
  return [...base.slice(off), ...base.slice(0, off)];
}

const published = Prisma.sql`COALESCE("publishedAt", "createdAt")`;

/** ORDER BY untuk urutan default (dipakai katalog, beranda, dan wilayah). */
export function rotationOrderSql(
  round: number,
  settings = rotationSettings(),
): Prisma.Sql {
  const fresh = Prisma.sql`(${published} >= NOW() - make_interval(days => ${settings.newListingDays}::int))`;
  const base = roundReversed(round)
    ? Prisma.sql`${published} DESC, "id" DESC`
    : Prisma.sql`${published} ASC, "id" ASC`;
  const idx = Prisma.sql`(ROW_NUMBER() OVER (PARTITION BY ${fresh} ORDER BY ${base}) - 1)`;
  const n = Prisma.sql`COUNT(*) OVER (PARTITION BY ${fresh})`;
  const shift = Prisma.sql`(${round}::bigint * ${settings.shiftPerRound}::bigint)`;
  return Prisma.sql`CASE WHEN ${fresh} THEN 0 ELSE 1 END ASC,
    CASE WHEN ${fresh} THEN ${published} END DESC NULLS LAST,
    MOD(MOD(${idx} - ${shift}, ${n}) + ${n}, ${n}) ASC,
    "id" ASC`;
}
