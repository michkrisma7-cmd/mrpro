"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "./auth";
import { db } from "./db";
import { blogSchema } from "./blog-validation";
import type { ActionState } from "./types";
export async function saveBlogPost(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireAdmin();
  try {
    const input = blogSchema.safeParse({
      title: form.get("title"),
      slug: form.get("slug"),
      excerpt: form.get("excerpt"),
      content: form.get("content"),
      published: form.has("published"),
    });
    if (!input.success) return { error: input.error.issues[0].message };
    const id = String(form.get("id") || "");
    const automaticSlug = !String(form.get("slug") || "").trim();
    const baseSlug = input.data.slug;
    for (let attempt = 0; ; attempt++) {
      try {
        if (id) await db().blogPost.update({ where: { id }, data: input.data });
        else await db().blogPost.create({ data: input.data });
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
      return { error: "Slug sudah digunakan artikel lain." };
    return { error: "Artikel belum berhasil disimpan. Coba lagi." };
  }
  updateTag("blog");
  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath("/blog/[slug]", "page");
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin");
  redirect("/admin?tab=blog&tersimpan=1");
}
