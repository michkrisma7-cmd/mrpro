import type { Field } from "./types";

export const regionKeys = [
  "provinsi",
  "kota_kabupaten",
  "kecamatan",
  "kelurahan_desa",
] as const;
export type RegionKey = (typeof regionKeys)[number];
export const regionLevels = [
  "provinces",
  "regencies",
  "districts",
  "villages",
] as const;
export type RegionLevel = (typeof regionLevels)[number];
export type Region = { id: string; name: string };
export const regionLabels = [
  "Provinsi",
  "Kabupaten/Kota",
  "Kecamatan",
  "Desa/Kelurahan",
];
export const regionPriorities: Record<string, string[]> = {
  "32": ["32.16", "32.75"], // Kabupaten Bekasi, Kota Bekasi
  "36": ["36.03", "36.74"], // Kabupaten Tangerang, Kota Tangerang Selatan
};
export function isRegionKey(key: string): key is RegionKey {
  return (regionKeys as readonly string[]).includes(key);
}
// A child selector needs its visible parent. Hidden admin fields stay hidden.
export function activeRegionFields(fields: Field[]) {
  const result: Field[] = [];
  for (const key of regionKeys) {
    const field = fields.find((f) => f.key === key && f.showInForm);
    if (!field) break;
    result.push(field);
  }
  return result;
}
export const defaultRegionFields: Field[] = regionKeys.map((key, index) => ({
  id: key,
  key,
  name: regionLabels[index],
  type: "TEXT",
  options: [],
  required: false,
  showInForm: true,
  showOnCard: true,
  showOnDetail: true,
  cardLabel: "",
  position: 20 + index,
}));
export function sortRegions(items: Region[], level: RegionLevel, parent = "") {
  const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name, "id"));
  const priority = level === "regencies" ? regionPriorities[parent] : undefined;
  if (!priority) return sorted;
  return [
    ...priority.flatMap((id) => sorted.filter((r) => r.id === id)),
    ...sorted.filter((r) => !priority.includes(r.id)),
  ];
}
