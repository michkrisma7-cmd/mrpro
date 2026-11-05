import type { Field, Values } from "./types";
import { regionKeys } from "./region-config";
export function propertyLocation(
  values: Values,
  fields: Field[],
  visibility: "showOnCard" | "showOnDetail",
) {
  const keys = ["lokasi", ...[...regionKeys].reverse()];
  const parts: string[] = [];
  for (const key of keys) {
    if (!fields.some((f) => f.key === key && f[visibility])) continue;
    const value = String(values[key] ?? "").trim();
    if (!value) continue;
    const normalized = value.toLocaleLowerCase("id");
    if (
      !parts.some((part) =>
        part
          .toLocaleLowerCase("id")
          .split(/\s*,\s*/)
          .includes(normalized),
      )
    )
      parts.push(value);
  }
  return parts.join(", ");
}
