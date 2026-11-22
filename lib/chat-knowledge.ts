import "server-only";
import { db, databaseConfigured } from "./db";
import { homeServices, serviceTimeGuide } from "./home-services";
import {
  listingSummary,
  matchListings,
  queryTokens,
  rankSources,
  type ChatSource,
  type ListingRow,
} from "./chat";

// Approved public service catalogue stays in sync with the service detail pages.
const serviceSources: ChatSource[] = homeServices.flatMap((category) => [
  ...category.jobs.map((job, i) => ({
    id: `catalog:${category.slug}:${i}`,
    title: `${job.title} — ${category.name}`,
    path: `/layanan/${category.slug}`,
    text: [
      job.description,
      ...job.details.map((d) => `${d.label}: ${d.text}`),
    ].join("\n"),
  })),
  // Price table shown on the service page; jobs without a row here have no
  // published price, so the chat must say so instead of guessing.
  ...(category.priceGroups.length
    ? [
        {
          id: `catalog:${category.slug}:harga`,
          title: `Daftar harga ${category.name}`,
          path: `/layanan/${category.slug}`,
          text: [
            `Daftar harga ${category.name} (perkiraan, harga final dikonfirmasi tim). Pekerjaan yang tidak ada di daftar ini belum punya harga tercantum.`,
            ...category.priceGroups.flatMap((g) => [
              `${g.title}:`,
              ...g.items.map((it) => `- ${it.label}: ${it.price}`),
            ]),
          ].join("\n"),
        },
      ]
    : []),
]);

export async function getChatKnowledge(query: string) {
  if (!databaseConfigured) throw new Error("Knowledge database unavailable");
  const tokens = queryTokens(query).slice(0, 8);
  const client = db();
  const [settings, listings, services, posts] = await Promise.all([
    client.siteSettings.findUnique({ where: { id: "main" } }),
    client.property.findMany({
      where: { status: "PUBLISHED" },
      take: 500,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        values: true,
      },
    }),
    client.service.findMany({
      where: { active: true },
      take: 100,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        type: true,
        skills: true,
        description: true,
        minPrice: true,
        unit: true,
      },
    }),
    client.blogPost.findMany({
      where: {
        published: true,
        ...(tokens.length
          ? {
              OR: tokens.map((token) => ({
                title: { contains: token, mode: "insensitive" as const },
              })),
            }
          : {}),
      },
      take: 4,
      orderBy: { createdAt: "desc" },
      select: { id: true, slug: true, title: true, excerpt: true },
    }),
  ]);
  const sources: ChatSource[] = [
    {
      id: "site:overview",
      title: "Tentang MR Properti",
      path: "/#tentang",
      text: `MR Properti membantu pencarian properti dijual dan disewa serta layanan tukang dan perawatan rumah. ${settings?.heroDescription || ""}\nArea layanan: ${settings?.area || "Konfirmasi ke tim melalui WhatsApp"}. Jenis layanan: ${homeServices.map((s) => s.name).join(", ")}.`,
    },
    {
      id: "site:contact",
      title: "Konsultasi dengan tim",
      path: "/#tentang",
      text: "Untuk pemesanan jasa, survei, negosiasi, kepastian ketersediaan properti, harga final dan permintaan bantuan manusia, hubungi tim MR Properti melalui WhatsApp. Jadwal dan kepastian transaksi dikonfirmasi tim.",
    },
    {
      id: "site:consign",
      title: "Titip properti",
      path: "/titip-properti",
      text: "Pemilik dapat mengisi formulir Pasang Iklan tanpa masuk atau daftar akun, melengkapi informasi dan mengunggah foto properti. Member dapat memantau kiriman di halaman Akun. Hubungi tim untuk bantuan pemasaran.",
    },
    {
      id: "site:kpr",
      title: "Kalkulator KPR",
      path: "/kalkulator-kpr",
      text: "Simulasi cicilan KPR (harga, uang muka/DP, tenor, bunga) bisa dihitung sendiri di halaman Kalkulator KPR. Hasilnya perkiraan; persetujuan dan bunga final mengikuti bank.",
    },
    {
      id: "site:time",
      title: "Panduan waktu layanan",
      path: "/layanan",
      text: serviceTimeGuide.join("\n"),
    },
    ...serviceSources,
    ...services.map((s) => ({
      id: `service:${s.id}`,
      title: s.type,
      path: `/layanan/${s.slug}`,
      text: `${s.description.slice(0, 1800)}\nKeahlian: ${s.skills.join(", ")}. Tarif mulai Rp${s.minPrice} per ${s.unit}; harga final dikonfirmasi tim.`,
    })),
    ...posts.map((p) => ({
      id: `blog:${p.id}`,
      title: p.title,
      path: `/blog/${p.slug}`,
      text: p.excerpt,
    })),
  ];
  const listingSource = (p: ListingRow): ChatSource => ({
    id: `property:${p.id}`,
    title: p.title,
    path: `/properti/${p.slug}`,
    text: `${listingSummary(p)}\n${p.description.slice(0, 500)}\nKetersediaan dan harga final perlu konfirmasi tim.`,
  });
  const overview = sources[0];
  const listingSearch = matchListings(listings, query, 5);
  const matches = listingSearch
    ? [
        {
          id: "site:listing-search",
          title: "Hasil pencarian listing",
          path: "/properti",
          text: `${listingSearch.note}\nTotal listing aktif di situs: ${listings.length}. Semua listing bisa dilihat di halaman Properti.`,
        },
        ...listingSearch.matches.map(listingSource),
        ...rankSources(sources.slice(1), query, 2),
      ]
    : rankSources(
        [...sources.slice(1), ...listings.map(listingSource)],
        query,
        7,
      );
  return {
    brand: "MR Properti",
    sources: [overview, ...matches],
    whatsapp: settings?.whatsapp || "",
    partial: true,
  };
}
