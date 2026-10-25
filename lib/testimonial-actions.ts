"use server";
import { requireAdmin } from "./auth";
import { db } from "./db";
import { testimonialSchema } from "./testimonial-validation";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "./types";
export async function saveTestimonial(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireAdmin();
  const parsed = testimonialSchema.safeParse({
    category: form.get("category"),
    name: form.get("name"),
    status: form.get("status"),
    quote: form.get("quote"),
    rating: form.get("rating"),
    position: form.get("position"),
    photoId: form.get("photoId") || null,
    active: form.has("active"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const id = String(form.get("id") || "");
  try {
    if (parsed.data.photoId) {
      const photo = await db().media.findFirst({
        where: {
          id: parsed.data.photoId,
          OR: [
            { ownerId: user.id },
            ...(id ? [{ testimonials: { some: { id } } }] : []),
          ],
        },
      });
      if (!photo)
        return { error: "Foto tidak valid. Unggah melalui formulir ini." };
    }
    if (id) await db().testimonial.update({ where: { id }, data: parsed.data });
    else await db().testimonial.create({ data: parsed.data });
  } catch {
    return { error: "Testimoni belum berhasil disimpan. Coba lagi." };
  }
  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin?tab=testimoni&tersimpan=1");
}
export async function deleteTestimonial(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const id = String(form.get("id") || "");
  if (!id) return { error: "Pilih testimoni yang ingin dihapus." };
  try {
    await db().testimonial.delete({ where: { id } });
  } catch {
    return { error: "Testimoni belum berhasil dihapus. Coba lagi." };
  }
  // Uploaded media may still be referenced by another profile or property.
  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin?tab=testimoni&terhapus=1");
}
