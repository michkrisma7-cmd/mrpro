import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findArea, findCategory } from "@/lib/areas";
import { getAreaCatalog, getAreaStats } from "@/lib/area-data";
import { landingDescription, landingTitle } from "@/lib/area-content";
import { pageMetadata } from "@/lib/seo";
import { AreaLanding, indexable, landingPath } from "@/components/area-landing";
export const dynamic = "force-dynamic";
type Props = {
  params: Promise<{ area: string; kategori: string }>;
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
async function resolve(params: Props["params"]) {
  const { area: a, kategori } = await params;
  const area = findArea(a);
  const category = findCategory(kategori);
  if (!area || !category) notFound();
  return { area, category };
}
export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { area, category } = await resolve(params);
  const page = pageNumber((await searchParams).page);
  const [catalog, stats] = await Promise.all([
    getAreaCatalog(area.slug, page, category.slug),
    getAreaStats(area.slug, category.slug),
  ]);
  return pageMetadata({
    title: `${landingTitle(area, category)}${page > 1 ? ` — Halaman ${page}` : ""}`,
    description: landingDescription(area, catalog.total, stats, category),
    path: `${landingPath(area, category)}${page > 1 ? `?page=${page}` : ""}`,
    noindex: !indexable(catalog.total) || !catalog.listings.length,
  });
}
export default async function AreaCategoryPage({
  params,
  searchParams,
}: Props) {
  const { area, category } = await resolve(params);
  return (
    <AreaLanding
      area={area}
      category={category}
      page={pageNumber((await searchParams).page)}
    />
  );
}
