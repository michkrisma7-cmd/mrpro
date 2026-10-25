"use server";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser, requireAdmin } from "./auth";
import { db } from "./db";
import { getFields } from "./data";
import { sendFacebookWebhook } from "./facebook-post";
import {
  basePropertySchema,
  parseValues,
  fieldSchema,
  actionError,
  phoneSchema,
} from "./validation";
import type { ActionState } from "./types";
function refresh() {
  updateTag("properties");
  updateTag("content");
  revalidatePath("/properti/[slug]", "page");
  revalidatePath("/sitemap.xml");
  ["/", "/properti", "/layanan", "/titip-properti", "/akun", "/admin"].forEach(
    (p) => revalidatePath(p),
  );
}
export async function submitProperty(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  try {
    const input = basePropertySchema.parse({
      title: form.get("title"),
      description: form.get("description"),
      whatsapp: form.get("whatsapp"),
      gallery: JSON.parse(String(form.get("gallery") || "[]")),
    });
    const owned = await db().media.count({
      where: {
        ownerId: user.id,
        id: { in: input.gallery.map((p) => p.split("/").pop()!) },
      },
    });
    if (owned !== new Set(input.gallery).size)
      return { error: "Foto harus berasal dari unggahan Anda sendiri." };
    const fields = await getFields();
    const values = parseValues(fields, form);
    const slug =
      input.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") +
      "-" +
      crypto.randomUUID().slice(0, 8);
    await db().property.create({
      // Trial policy: new consignment listings publish immediately until instructed otherwise.
      data: { ...input, values, slug, ownerId: user.id, status: "PUBLISHED" },
    });
    refresh();
  } catch (e) {
    return { error: actionError(e) };
  }
  redirect("/akun?terkirim=1");
}
export async function saveField(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireAdmin();
  try {
    const input = fieldSchema.parse({
      key: form.get("key"),
      name: form.get("name"),
      type: form.get("type"),
      options: [
        ...new Set(
          String(form.get("options") || "")
            .split("\n")
            .map((v) => v.trim())
            .filter(Boolean),
        ),
      ],
      required: form.has("required"),
      showInForm: form.has("showInForm"),
      showOnCard: form.has("showOnCard"),
      showOnDetail: form.has("showOnDetail"),
      cardLabel: form.get("cardLabel") || "",
      position: Number(form.get("position") || 0),
    });
    const id = String(form.get("id") || "");
    if (id) {
      const old = await db().propertyField.findUniqueOrThrow({ where: { id } });
      if (old.key !== input.key || old.type !== input.type)
        return {
          error:
            "Key dan tipe field tersimpan tidak dapat diubah. Buat field baru untuk tipe lain.",
        };
      await db().propertyField.update({ where: { id }, data: input });
    } else await db().propertyField.create({ data: input });
    refresh();
    return { success: "Pengaturan field disimpan." };
  } catch (e) {
    return { error: actionError(e) };
  }
}
export async function deleteField(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireAdmin();
  try {
    await db().propertyField.delete({
      where: { id: z.string().parse(form.get("id")) },
    });
    refresh();
    return { success: "Field dihapus. Nilai lama tetap tersimpan." };
  } catch (e) {
    return { error: actionError(e) };
  }
}
export async function moderateProperty(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireAdmin();
  try {
    const id = z.string().min(1).parse(form.get("id"));
    const status = z
      .enum(["PENDING", "PUBLISHED", "REJECTED", "ARCHIVED"])
      .parse(form.get("status"));
    let facebookResult: "disabled" | "accepted" | "failed" = "disabled";
    if (status === "PUBLISHED") {
      const listing = await db().property.findUniqueOrThrow({ where: { id } });
      basePropertySchema.parse(listing);
      const fields = await getFields();
      const validationForm = new FormData();
      for (const [key, value] of Object.entries(
        listing.values as Record<string, string | number | string[]>,
      )) {
        for (const item of Array.isArray(value) ? value : [value])
          validationForm.append(`field_${key}`, String(item));
      }
      parseValues(fields, validationForm);
      // Only the request that changes a non-published status can send a webhook.
      const changed = await db().property.updateMany({
        where: { id, status: { not: "PUBLISHED" } },
        data: { status, featured: form.has("featured") },
      });
      if (changed.count === 1)
        facebookResult = await sendFacebookWebhook(listing, fields);
      else
        await db().property.update({
          where: { id },
          data: { featured: form.has("featured") },
        });
    } else {
      await db().property.update({
        where: { id },
        data: { status, featured: form.has("featured") },
      });
    }
    refresh();
    return {
      success:
        facebookResult === "failed"
          ? "Properti diterbitkan, tetapi pengiriman ke webhook Facebook gagal."
          : "Status properti diperbarui.",
    };
  } catch (e) {
    return { error: actionError(e) };
  }
}
export async function saveService(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireAdmin();
  try {
    const input = z
      .object({
        type: z.string().trim().min(3).max(100),
        workerName: z.string().trim().min(2).max(100),
        description: z.string().trim().min(20).max(4000),
        minPrice: z.number().int().min(0).max(2e9),
        unit: z.string().min(1).max(30),
        skills: z.array(z.string().min(1).max(100)).min(1).max(30),
        whatsapp: phoneSchema,
        active: z.boolean(),
      })
      .parse({
        type: form.get("type"),
        workerName: form.get("workerName"),
        description: form.get("description"),
        minPrice: Number(form.get("minPrice")),
        unit: form.get("unit"),
        skills: String(form.get("skills") || "")
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
        whatsapp: form.get("whatsapp"),
        active: form.has("active"),
      });
    const id = String(form.get("id") || "");
    if (id) await db().service.update({ where: { id }, data: input });
    else
      await db().service.create({
        data: {
          ...input,
          slug:
            input.type.toLowerCase().replace(/[^a-z0-9]+/g, "-") +
            "-" +
            crypto.randomUUID().slice(0, 8),
        },
      });
    refresh();
    return { success: "Layanan berhasil disimpan." };
  } catch (e) {
    return { error: actionError(e) };
  }
}
export async function saveSettings(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireAdmin();
  try {
    const input = z
      .object({
        heroTitle: z.string().min(5).max(100),
        heroDescription: z.string().min(20).max(500),
        whatsapp: z.union([phoneSchema, z.literal("")]),
        email: z.union([z.email(), z.literal("")]),
        area: z.string().max(120),
      })
      .parse(
        Object.fromEntries(
          ["heroTitle", "heroDescription", "whatsapp", "email", "area"].map(
            (k) => [k, String(form.get(k) || "")],
          ),
        ),
      );
    await db().siteSettings.upsert({
      where: { id: "main" },
      create: { id: "main", ...input },
      update: input,
    });
    refresh();
    return { success: "Pengaturan website disimpan." };
  } catch (e) {
    return { error: actionError(e) };
  }
}
export async function editProperty(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  try {
    const id = z.string().min(1).parse(form.get("id"));
    const existing = await db().property.findUniqueOrThrow({ where: { id } });
    const input = basePropertySchema.parse({
      title: form.get("title"),
      description: form.get("description"),
      whatsapp: form.get("whatsapp"),
      gallery: existing.gallery,
    });
    const fields = await getFields();
    const values = {
      ...(existing.values as Record<string, string | number | string[]>),
      ...parseValues(
        fields.map((f) => ({ ...f, showInForm: true })),
        form,
      ),
    };
    for (const f of fields) {
      if (
        !form.get(`field_${f.key}`) &&
        form.getAll(`field_${f.key}`).length === 0
      )
        delete values[f.key];
    }
    await db().property.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description,
        whatsapp: input.whatsapp,
        values,
      },
    });
    void admin;
    refresh();
    return { success: "Informasi properti disimpan." };
  } catch (e) {
    return { error: actionError(e) };
  }
}
