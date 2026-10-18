import { createHash, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db, databaseConfigured } from "@/lib/db";
import { blogSchema } from "@/lib/blog-validation";

export const runtime = "nodejs";

const inputSchema = blogSchema
  .extend({
    published: blogSchema.shape.published.default(false),
  })
  .strict();

export async function POST(request: Request) {
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
    post = await db().blogPost.create({ data: input.data });
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

  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath(`/blog/${post.slug}`);
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin");
  return Response.json({ data: post }, { status: 201 });
}
