import type { Field, Values } from "./types";
export const money = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
export function displayValue(
  field: Pick<Field, "type">,
  value: Values[string],
) {
  return Array.isArray(value)
    ? value.join(", ")
    : field.type === "PRICE"
      ? money(Number(value))
      : String(value);
}
export const filled = (value: unknown) =>
  value !== undefined &&
  value !== null &&
  value !== "" &&
  (!Array.isArray(value) || value.length > 0);
export function whatsappLink(phone: string, message: string) {
  let n = phone.replace(/\D/g, "");
  if (n.startsWith("0")) n = "62" + n.slice(1);
  return /^\d{9,15}$/.test(n)
    ? `https://wa.me/${n}?text=${encodeURIComponent(message)}`
    : null;
}
export function siteUrl() {
  // Read the server runtime value so one Docker image can serve beta and production.
  const runtimeUrl = Reflect.get(process.env, "NEXT_PUBLIC_SITE_URL") as
    string | undefined;
  try {
    return new URL(runtimeUrl || "http://localhost:3000").origin;
  } catch {
    return "http://localhost:3000";
  }
}
