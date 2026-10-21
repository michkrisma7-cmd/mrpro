"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "./auth";
import { db } from "./db";
import { teamSchema } from "./team-validation";
import type { ActionState } from "./types";

export async function saveTeamMember(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireAdmin();
  const input = teamSchema.safeParse({
    name: form.get("name"),
    expertise: form.get("expertise"),
    experience: form.get("experience"),
    photoId: form.get("photoId"),
    active: form.has("active"),
  });
  if (!input.success) return { error: input.error.issues[0].message };
  const id = String(form.get("id") || "");
  try {
    // Accept a new upload owned by this admin, or retain this member's existing photo.
    const photo = await db().media.findFirst({
      where: {
        id: input.data.photoId,
        OR: [
          { ownerId: user.id },
          ...(id ? [{ teamMembers: { some: { id } } }] : []),
        ],
      },
    });
    if (!photo)
      return { error: "Foto tidak valid. Unggah foto melalui formulir ini." };
    if (id) await db().teamMember.update({ where: { id }, data: input.data });
    else await db().teamMember.create({ data: input.data });
  } catch {
    return { error: "Profil belum berhasil disimpan. Coba lagi." };
  }
  revalidatePath("/tim-kami");
  revalidatePath("/admin");
  redirect("/admin?tab=tim&tersimpan=1");
}

export async function deleteTeamMember(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const id = String(form.get("id") || "");
  if (!id) return { error: "Pilih anggota tim yang ingin dihapus." };
  try {
    await db().teamMember.delete({ where: { id } });
  } catch {
    return { error: "Profil belum berhasil dihapus. Coba lagi." };
  }
  // Keep uploaded media: another listing or profile may still use it.
  revalidatePath("/tim-kami");
  revalidatePath("/admin");
  redirect("/admin?tab=tim&terhapus=1");
}
