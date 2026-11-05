import { getRegions } from "@/lib/regions";
import { regionLevels, type RegionLevel } from "@/lib/region-config";
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const level = params.get("level") ?? "provinces";
  const parent = params.get("parent") ?? "";
  const index = (regionLevels as readonly string[]).indexOf(level);
  if (
    index < 0 ||
    (index === 0
      ? parent !== ""
      : !new RegExp(`^\\d{2}${"\\.\\d{2}".repeat(index - 1)}$`).test(parent))
  )
    return Response.json(
      { error: "Permintaan wilayah tidak valid." },
      { status: 400 },
    );
  return Response.json(getRegions(level as RegionLevel, parent), {
    headers: { "Cache-Control": "public, max-age=86400" },
  });
}
