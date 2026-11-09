import { GET as media } from "../route";

// The explicit WebP path is eligible for standard CDN image caching. Access and
// public/private cache headers remain controlled by the canonical media route.
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const url = new URL(request.url);
  url.searchParams.set("variant", "display");
  return media(new Request(url, request), context);
}
