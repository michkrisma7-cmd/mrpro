// Server module: never import the national dataset into a client component.
import dataset from "../data/regions/indonesia.json";
import {
  activeRegionFields,
  regionKeys,
  regionLevels,
  sortRegions,
  isRegionKey,
  type Region,
  type RegionLevel,
} from "./region-config";
import { parseValues } from "./validation";
import type { Field, Values } from "./types";

const regions = dataset as Record<RegionLevel, Record<string, Region[]>>;
export function getRegions(level: RegionLevel, parent = ""): Region[] {
  return sortRegions(regions[level][parent] ?? [], level, parent);
}
export function validRegion(level: RegionLevel, parent: string, id: string) {
  return (regions[level][parent] ?? []).find((r) => r.id === id);
}

export function parseListingValues(
  fields: Field[],
  form: FormData,
  existing: Values = {},
): Values {
  const editable = fields.filter((f) => f.showInForm && !isRegionKey(f.key));
  const parsed = parseValues(editable, form);
  const result = { ...existing };
  for (const f of editable) delete result[f.key];
  Object.assign(result, parsed);
  const active = activeRegionFields(fields);
  if (!active.length) return result;
  const coded = regionKeys.some((key) => Boolean(existing[`${key}_kode`]));
  const legacy = !coded && regionKeys.some((key) => Boolean(existing[key]));
  if (form.get("region_mode") === "legacy") {
    if (!legacy) throw new Error("Pilih wilayah yang valid.");
    return result; // Keep legacy labels verbatim; do not guess their administrative codes.
  }
  const codes = active.map((f) =>
    String(form.get(`field_${f.key}_kode`) ?? ""),
  );
  const hasSelection = codes.some(Boolean);
  let parent = "";
  for (const [index, f] of active.entries()) {
    const code = codes[index];
    if (!code) {
      if (f.required || hasSelection)
        throw new Error(
          `Pilih ${f.name.toLowerCase()} untuk melengkapi wilayah.`,
        );
      continue;
    }
    const selected = validRegion(regionLevels[index], parent, code);
    if (!selected)
      throw new Error(`Pilihan ${f.name} tidak sesuai wilayah induknya.`);
    result[f.key] = selected.name; // Ignore names supplied by the browser.
    result[`${f.key}_kode`] = selected.id;
    parent = selected.id;
  }
  if (!hasSelection) {
    // Existing legacy records can be saved without forcing a speculative conversion.
    if (legacy && form.get("region_mode") !== "select") return result;
    for (const key of regionKeys) {
      delete result[key];
      delete result[`${key}_kode`];
    }
  } else {
    // A changed parent must not retain hidden descendants from the old hierarchy.
    for (let index = active.length; index < regionKeys.length; index++) {
      const key = regionKeys[index];
      if (
        active.some(
          (f) => existing[`${f.key}_kode`] !== result[`${f.key}_kode`],
        )
      ) {
        delete result[key];
        delete result[`${key}_kode`];
      }
    }
  }
  return result;
}
