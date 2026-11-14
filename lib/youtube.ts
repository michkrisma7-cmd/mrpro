// Store only a validated video ID. Never store iframe markup or arbitrary URLs.
export function isYoutubeVideoId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{11}$/.test(value);
}

export function youtubeVideoId(value: string): string | null {
  const input = value.trim();
  if (!input) return null;
  const invalid = () =>
    new Error(
      "Link YouTube tidak valid. Gunakan tautan video YouTube, youtu.be, atau Shorts.",
    );
  if (input.length > 2048) throw invalid();
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
  } catch {
    throw invalid();
  }
  if (
    !/^https?:$/.test(url.protocol) ||
    url.username ||
    url.password ||
    url.port
  )
    throw invalid();
  const host = url.hostname.toLowerCase();
  let id: string | null = null;
  if (host === "youtu.be") {
    id = /^\/([A-Za-z0-9_-]{11})\/?$/.exec(url.pathname)?.[1] ?? null;
  } else if (
    ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(host)
  ) {
    if (url.pathname === "/watch" && url.searchParams.getAll("v").length === 1)
      id = url.searchParams.get("v");
    else
      id =
        /^\/(?:shorts|embed)\/([A-Za-z0-9_-]{11})\/?$/.exec(
          url.pathname,
        )?.[1] ?? null;
  }
  if (!isYoutubeVideoId(id)) throw invalid();
  return id;
}
