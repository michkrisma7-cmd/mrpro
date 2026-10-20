import "server-only";
import { db, databaseConfigured } from "./db";
import { homeServices, serviceTimeGuide } from "./home-services";
import { queryTokens, rankSources, type ChatSource } from "./chat";

// Approved public service catalogue stays in sync with the service detail pages.
const serviceSources: ChatSource[] = homeServices.flatMap((category) =>
  category.jobs.map((job, i) => ({
    id: `catalog:${category.slug}:${i}`,
    title: `${job.title} — ${category.name}`,
    path: `/layanan/${category.slug}`,
    text: [
      job.description,
      ...job.details.map((d) => `${d.label}: ${d.text}`),
    ].join("\n"),
  })),
);

export async function getChatKnowledge(query: string) {
  if (!databaseConfigured) throw new Error("Knowledge database unavailable");
  const tokens = queryTokens(query).slice(0, 8);
  const client = db();
  const fieldsPromise = client.propertyField.findMany({
    where: { OR: [{ showOnCard: true }, { showOnDetail: true }] },
    select: { key: true, name: true },
  });
  const [settings, fields, listings, services, posts] = await Promise.all([
    client.siteSettings.findUnique({ where: { id: "main" } }),
    fieldsPromise,
    fieldsPromise.then((publicFields) =>
      client.property.findMany({
        where: {
          status: "PUBLISHED",
          ...(tokens.length
            ? {
                OR: tokens.flatMap((token) => [
                  { title: { contains: token, mode: "insensitive" as const } },
                  ...publicFields
                    .filter((f) =>
                      [
                        "lokasi",
                        "proyek",
                        "nama_proyek",
                        "jenis",
                        "transaksi",
                      ].includes(f.key),
                    )
                    .map((f) => ({
                      values: {
                        path: [f.key],
                        string_contains: token,
                        mode: "insensitive" as const,
                      },
                    })),
                ]),
              }
            : {}),
        },
        take: 8,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          values: true,
        },
      }),
    ),
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
      text: "Pemilik dapat masuk atau daftar akun lalu mengisi form Titip Properti, melengkapi informasi dan mengunggah foto properti. Pantau kiriman di halaman Akun. Hubungi tim untuk bantuan pemasaran.",
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
    ...listings.map((p) => ({
      id: `property:${p.id}`,
      title: p.title,
      path: `/properti/${p.slug}`,
      text: `${p.description.slice(0, 1500)}\n${fields
        .filter((f) => Object.hasOwn(p.values as object, f.key))
        .map(
          (f) =>
            `${f.name}: ${JSON.stringify((p.values as Record<string, unknown>)[f.key])}`,
        )
        .join("\n")}\nKetersediaan dan harga final perlu konfirmasi tim.`,
    })),
    ...posts.map((p) => ({
      id: `blog:${p.id}`,
      title: p.title,
      path: `/blog/${p.slug}`,
      text: p.excerpt,
    })),
  ];
  const overview = sources[0];
  const matches = rankSources(sources.slice(1), query, 7);
  return {
    brand: "MR Properti",
    sources: [overview, ...matches],
    whatsapp: settings?.whatsapp || "",
    partial: true,
  };
}
