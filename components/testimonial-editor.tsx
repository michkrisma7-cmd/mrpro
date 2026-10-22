"use client";
import { useActionState, useState } from "react";
import Image from "next/image";
import type { TestimonialProfile } from "@/lib/testimonial-types";
import { saveTestimonial, deleteTestimonial } from "@/lib/testimonial-actions";
import { FormMessage, SubmitButton } from "./form-status";

export function TestimonialEditor({
  member,
  disabled,
  uploadEnabled,
}: {
  member?: TestimonialProfile;
  disabled: boolean;
  uploadEnabled: boolean;
}) {
  const [state, action] = useActionState(saveTestimonial, {});
  const [photoId, setPhotoId] = useState(member?.photoId || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function upload(file?: File) {
    if (!file) return;
    setError("");
    if (
      file.size > 5 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    ) {
      setError("Gunakan JPG, PNG, atau WebP, maksimal 5 MB.");
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/upload", {
        method: "POST",
        body: form,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unggah foto gagal.");
      const id = /^\/api\/media\/([a-z0-9]+)$/.exec(data.url)?.[1];
      if (!id) throw new Error("Respons unggahan tidak valid.");
      setPhotoId(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unggah foto gagal.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form action={action} className="admin-edit-form">
      <fieldset disabled={disabled} className="plain-fieldset">
        <input type="hidden" name="id" value={member?.id || ""} />
        <input type="hidden" name="photoId" value={photoId} />
        <div className="form-grid">
          <label>
            Nama
            <input
              name="name"
              required
              minLength={2}
              maxLength={100}
              defaultValue={member?.name}
            />
          </label>
          <label>
            Kategori
            <input
              name="category"
              required
              minLength={2}
              maxLength={120}
              defaultValue={member?.category}
              placeholder="Contoh: Pembeli Rumah Pertama (KPR)"
            />
          </label>
        </div>
        <label>
          Status konsumen
          <input
            name="status"
            required
            minLength={2}
            maxLength={200}
            defaultValue={member?.status}
          />
        </label>
        <div className="form-grid">
          <label>
            Bintang
            <select name="rating" defaultValue={member?.rating ?? 5}>
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {value} bintang
                </option>
              ))}
            </select>
          </label>
          <label>
            Urutan tampil
            <input
              type="number"
              name="position"
              min={0}
              max={9999}
              required
              defaultValue={member?.position ?? 0}
            />
            <small>Angka lebih kecil tampil lebih dahulu.</small>
          </label>
        </div>
        <label>
          Isi testimoni
          <textarea
            name="quote"
            required
            minLength={10}
            maxLength={3000}
            rows={6}
            defaultValue={member?.quote}
            placeholder="Tuliskan pengalaman konsumen."
          />
        </label>
        <label>
          Foto konsumen
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy || !uploadEnabled}
            onChange={async (e) => {
              const input = e.currentTarget;
              await upload(input.files?.[0]);
              input.value = "";
            }}
          />
          <small>
            JPG, PNG, atau WebP, maksimal 5 MB. Foto profil bersifat opsional.
          </small>
        </label>
        {!uploadEnabled && (
          <p className="notice">
            Unggah foto tersedia setelah penyimpanan S3 dikonfigurasi.
          </p>
        )}
        {busy && <p role="status">Mengunggah foto…</p>}
        {error && (
          <p role="alert" className="form-message error">
            {error}
          </p>
        )}
        {photoId && (
          <button
            type="button"
            className="text-button"
            disabled={busy}
            onClick={() => setPhotoId("")}
          >
            Hapus foto dari testimoni
          </button>
        )}
        {photoId && (
          <Image
            src={`/api/media/${photoId}`}
            alt="Pratinjau foto konsumen"
            width={64}
            height={64}
            className="team-photo-preview"
            unoptimized
          />
        )}
        <label className="checkbox-label">
          <input
            type="checkbox"
            name="active"
            defaultChecked={member?.active ?? true}
          />{" "}
          Tampilkan di beranda
        </label>
        <FormMessage state={state} />
        <SubmitButton disabled={disabled || busy}>
          Simpan Testimoni
        </SubmitButton>
      </fieldset>
    </form>
  );
}

export function TestimonialDeleteForm({
  id,
  name,
  disabled,
}: {
  id: string;
  name: string;
  disabled: boolean;
}) {
  const [state, action] = useActionState(deleteTestimonial, {});
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (
          !window.confirm(
            `Hapus testimoni ${name}? Tindakan ini tidak dapat dibatalkan.`,
          )
        )
          e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <FormMessage state={state} />
      <SubmitButton disabled={disabled}>Hapus Testimoni</SubmitButton>
    </form>
  );
}
