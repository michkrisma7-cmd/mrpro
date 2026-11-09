// Increment the storage suffix when the display encoding changes.
export function displayImageKey(masterKey: string): string {
  return `${masterKey}.display-v1.webp`;
}

// Keep canonical media URLs in the database; transform only display consumers.
export function mediaDisplayUrl(source: string): string {
  if (!source.startsWith("/api/media/")) return source;
  const url = new URL(source, "http://media.local");
  if (!/^\/api\/media\/[^/]+$/.test(url.pathname)) return source;
  url.pathname += "/display.webp";
  url.searchParams.delete("variant");
  return `${url.pathname}${url.search}${url.hash}`;
}
