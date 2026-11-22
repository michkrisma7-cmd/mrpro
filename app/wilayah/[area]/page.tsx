import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findArea } from "@/lib/areas";
import { getAreaCatalog, getAreaStats } from "@/lib/area-data";
import { landingDescription, landingTitle } from "@/lib/area-content";
import { pageMetadata } from "@/lib/seo";
import { AreaLanding, indexable, landingPath } from "@/components/area-landing";
export const dynamic = "force-dynamic";
type Props = {
  params: Promise<{ area: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
function pageNumber(raw: string | string[] | undefined) {
  return Math.max(
    1,
    Math.min(
      100000,
      Number.parseInt(typeof raw === "string" ? raw : "1", 10) || 1,
    ),
  );
}
export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const area = findArea((await params).area);
  if (!area) notFound();
  const page = pageNumber((await searchParams).page);
  const [catalog, stats] = await Promise.all([
    getAreaCatalog(area.slug, page),
    getAreaStats(area.slug),
  ]);
  return pageMetadata({
    title: `${landingTitle(area)}${page > 1 ? ` — Halaman ${page}` : ""}`,
    description: landingDescription(area, catalog.total, stats),
    path: `${landingPath(area)}${page > 1 ? `?page=${page}` : ""}`,
    // Halaman tipis (< 3 listing aktif) tidak diindeks.
    noindex: !indexable(catalog.total) || !catalog.listings.length,
  });
}
export default async function AreaPage({ params, searchParams }: Props) {
  const area = findArea((await params).area);
  if (!area) notFound();
  return (
    <AreaLanding area={area} page={pageNumber((await searchParams).page)} />
  );
}
