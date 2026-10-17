import { getPublishedByIds } from "@/lib/data";
export async function GET(request: Request) {
  const ids = (new URL(request.url).searchParams.get("ids") || "")
    .split(",")
    .filter((x) => /^[a-zA-Z0-9_-]{1,60}$/.test(x))
    .slice(0, 100);
  return Response.json(await getPublishedByIds(ids), {
    headers: { "Cache-Control": "private, max-age=30" },
  });
}
