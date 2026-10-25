import { createHash, timingSafeEqual, randomUUID } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { db, databaseConfigured } from "@/lib/db";
import { z } from "zod";
import { blogFields, prepareBlogInput } from "@/lib/blog-validation";

export const runtime = "nodejs";

const inputSchema = z.preprocess(
  prepareBlogInput,
  blogFields
    .extend({ published: blogFields.shape.published.default(false) })
    .strict(),
);

function authorize(request: Request) {
  const expected = process.env.BLOG_API_KEY;
  if (!expected)
    return Response.json(
      { message: "API blog belum dikonfigurasi." },
      { status: 503 },
    );

  const provided = request.headers.get("x-api-key");
  if (
    !provided ||
    !timingSafeEqual(
      createHash("sha256").update(provided).digest(),
      createHash("sha256").update(expected).digest(),
    )
  )
    return Response.json({ message: "API key tidak valid." }, { status: 401 });

  if (!databaseConfigured)
    return Response.json(
      { message: "Database belum tersedia." },
      { status: 503 },
    );

  return null;
}

// Includes drafts so an automation does not regenerate an existing slot.
export async function GET(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;
  const params = new URL(request.url).searchParams;
  const slug = params.get("slug");
  if (slug !== null && !blogFields.shape.slug.safeParse(slug).success)
    return Response.json({ message: "Slug tidak valid." }, { status: 400 });
  try {
    const [posts, existing] = await Promise.all([
      db().blogPost.findMany({
        take: 100,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: { id: true, title: true, slug: true },
      }),
      slug
        ? db().blogPost.findUnique({ where: { slug }, select: { id: true } })
        : null,
    ]);
    return Response.json(
      { data: posts, slotExists: Boolean(existing) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return Response.json(
      { message: "Riwayat artikel belum tersedia." },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;

  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  )
    return Response.json(
      { message: "Gunakan Content-Type application/json." },
      { status: 415 },
    );

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { message: "Body JSON tidak valid." },
      { status: 400 },
    );
  }
  const input = inputSchema.safeParse(body);
  if (!input.success)
    return Response.json(
      { message: "Data artikel tidak valid.", errors: input.error.issues },
      { status: 400 },
    );

  let post;
  try {
    const automaticSlug = !String(
      (body as Record<string, unknown>).slug || "",
    ).trim();
    const baseSlug = input.data.slug;
    for (let attempt = 0; ; attempt++) {
      try {
        post = await db().blogPost.create({ data: input.data });
        break;
      } catch (error) {
        if (
          !automaticSlug ||
          attempt >= 3 ||
          !error ||
          typeof error !== "object" ||
          !("code" in error) ||
          error.code !== "P2002"
        )
          throw error;
        input.data.slug = `${baseSlug}-${randomUUID().slice(0, 8)}`;
      }
    }
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    )
      return Response.json(
        { message: "Slug sudah digunakan artikel lain." },
        { status: 409 },
      );
    return Response.json(
      { message: "Artikel belum berhasil disimpan." },
      { status: 500 },
    );
  }

  revalidateTag("blog", { expire: 0 });
  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath(`/blog/${post.slug}`);
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin");
  return Response.json({ data: post }, { status: 201 });
}
