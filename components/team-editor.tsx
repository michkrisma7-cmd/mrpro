"use client";
import { useActionState, useState } from "react";
import Image from "next/image";
import type { TeamMember } from "@prisma/client";
import { saveTeamMember, deleteTeamMember } from "@/lib/team-actions";
import { FormMessage, SubmitButton } from "./form-status";

export function TeamEditor({
  member,
  disabled,
  uploadEnabled,
}: {
  member?: TeamMember;
  disabled: boolean;
  uploadEnabled: boolean;
}) {
  const [state, action] = useActionState(saveTeamMember, {});
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
            Nama lengkap
            <input
              name="name"
              required
              minLength={2}
              maxLength={100}
              defaultValue={member?.name}
            />
          </label>
          <label>
            Bidang keahlian
            <input
              name="expertise"
              required
              minLength={2}
              maxLength={200}
              defaultValue={member?.expertise}
              placeholder="Contoh: Kelistrikan dan instalasi AC"
            />
          </label>
        </div>
        <label>
          Pengalaman kerja
          <textarea
            name="experience"
            maxLength={5000}
            rows={2}
            defaultValue={member?.experience}
            placeholder="Contoh: 10 tahun pengalaman"
          />
        </label>
        <label>
          Deskripsi singkat
          <textarea
            name="description"
            rows={3}
            maxLength={2000}
            defaultValue={member?.description}
          />
          <small>
            Ditampilkan maksimal dua baris di kartu; teks lengkap tetap
            tersimpan.
          </small>
        </label>
        <label>
          Deskripsi profil lengkap
          <textarea
            name="fullProfile"
            rows={8}
            maxLength={15000}
            defaultValue={member?.fullProfile}
          />
          <small>Ditampilkan pada popup profil anggota tim.</small>
        </label>
        <label>
          Urutan tampilan
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
        <label>
          Foto anggota tim
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
            JPG, PNG, atau WebP, maksimal 5 MB. Foto potret disarankan.
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
          <Image
            src={`/api/media/${photoId}`}
            alt="Pratinjau foto anggota tim"
            width={160}
            height={200}
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
          Tampilkan di laman Tim Kami
        </label>
        <FormMessage state={state} />
        <SubmitButton disabled={disabled || busy || !photoId}>
          Simpan Anggota Tim
        </SubmitButton>
      </fieldset>
    </form>
  );
}

export function TeamDeleteForm({
  id,
  name,
  disabled,
}: {
  id: string;
  name: string;
  disabled: boolean;
}) {
  const [state, action] = useActionState(deleteTeamMember, {});
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (
          !window.confirm(
            `Hapus profil ${name}? Tindakan ini tidak dapat dibatalkan.`,
          )
        )
          e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <FormMessage state={state} />
      <SubmitButton disabled={disabled}>Hapus Anggota Tim</SubmitButton>
    </form>
  );
}
