import { displayValue, filled, whatsappLink } from "./format";
import type { Field, Values } from "./types";

export function facebookPayload(
  property: {
    title: string;
    slug: string;
    description: string;
    whatsapp: string;
    values: unknown;
    gallery: string[];
  },
  fields: Field[],
  origin: string,
) {
  const base = new URL(origin);
  if (
    base.protocol !== "https:" ||
    ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname)
  )
    throw new Error("NEXT_PUBLIC_SITE_URL harus berupa URL HTTPS publik.");
  const values = property.values as Values;
  const details = fields
    .filter(
      (field) =>
        (field.showOnCard || field.showOnDetail) && filled(values[field.key]),
    )
    .map((field) => `${field.name}: ${displayValue(field, values[field.key])}`);
  const contact = whatsappLink(
    property.whatsapp,
    `Halo, saya tertarik dengan ${property.title}`,
  );
  return {
    image_urls: property.gallery.map((path) => new URL(path, base.origin).href),
    message: [
      "🏡 Properti baru di MR Properti",
      property.title,
      details.join("\n"),
      property.description.trim().slice(0, 1000),
      contact ? `Hubungi via WhatsApp: ${contact}` : "",
      "Lihat foto dan informasi lengkap melalui tautan berikut.",
    ]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 12000),
    link: new URL(`/properti/${encodeURIComponent(property.slug)}`, base.origin)
      .href,
  };
}

// Called only after a real status transition in the admin publication action.
// No queue or automatic retry: the n8n webhook forwards this payload to Facebook.
export async function sendFacebookWebhook(
  property: Parameters<typeof facebookPayload>[0] & { id: string },
  fields: Field[],
): Promise<"disabled" | "accepted" | "failed"> {
  const webhookUrl = process.env.N8N_FACEBOOK_WEBHOOK_URL;
  if (!webhookUrl) return "disabled";
  try {
    const secret = process.env.N8N_FACEBOOK_WEBHOOK_SECRET;
    if (!secret || new URL(webhookUrl).protocol !== "https:")
      throw new Error("Konfigurasi webhook belum lengkap.");
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": secret },
      body: JSON.stringify({
        event: "property.published",
        propertyId: property.id,
        ...facebookPayload(
          property,
          fields,
          process.env.NEXT_PUBLIC_SITE_URL || "",
        ),
      }),
      signal: AbortSignal.timeout(10000),
      redirect: "error",
    });
    if (!response.ok) throw new Error("Webhook menolak request.");
    return "accepted";
  } catch {
    console.error("Webhook Facebook gagal untuk properti", property.id);
    return "failed";
  }
}
