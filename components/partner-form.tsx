"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  partnerAreas,
  partnerSkills,
  partnerExperience,
  partnerSchema,
} from "@/lib/partner-validation";
export type PartnerValues = {
  name: string;
  whatsapp: string;
  domicile: string;
  areas: string[];
  skills: string[];
  experience: string;
  consent: boolean;
};
const empty: PartnerValues = {
  name: "",
  whatsapp: "",
  domicile: "",
  areas: [],
  skills: [],
  experience: "",
  consent: false,
};
export function PartnerForm({
  partner,
  skills,
  onSkillsChange,
  onCancel,
}: {
  partner?: PartnerValues & { id: string };
  skills?: string[];
  onSkillsChange?: (skills: string[]) => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [values, setValues] = useState<PartnerValues>(partner || empty);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const locked = useRef(false);
  const submissionId = useRef("");
  const selectedSkills = skills ?? values.skills;
  function toggle(key: "areas" | "skills", value: string) {
    const list = key === "skills" ? selectedSkills : values.areas;
    const next = list.includes(value)
      ? list.filter((v) => v !== value)
      : [...list, value];
    if (key === "skills" && onSkillsChange) onSkillsChange(next);
    else setValues((v) => ({ ...v, [key]: next }));
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current) return;
    setError("");
    const input = partnerSchema.safeParse({
      ...values,
      skills: selectedSkills,
    });
    if (!input.success) {
      setError(input.error.issues[0].message);
      return;
    }
    locked.current = true;
    setPending(true);
    if (!submissionId.current) submissionId.current = crypto.randomUUID();
    try {
      const response = await fetch(
        partner ? `/api/mitra/${partner.id}` : "/api/mitra",
        {
          method: partner ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...input.data,
            submissionId: submissionId.current,
          }),
        },
      );
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(
          result.error || "Data belum berhasil disimpan. Silakan coba lagi.",
        );
      setSuccess(true);
      if (partner) router.refresh();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Koneksi terputus. Silakan coba lagi. Isian Anda tidak dihapus.",
      );
    } finally {
      locked.current = false;
      setPending(false);
    }
  }
  if (success)
    return (
      <div className="notice partner-success" role="status">
        <h3>
          {partner
            ? "Perubahan berhasil disimpan."
            : "Pendaftaran berhasil disimpan."}
        </h3>
        <p>
          {partner
            ? "Data daftar dan detail mitra telah diperbarui."
            : "Tim MR Properti akan meninjau pendaftaran dan menghubungi Anda terkait kemitraan."}
        </p>
        {partner && (
          <button className="outline-button" onClick={onCancel}>
            Kembali ke detail
          </button>
        )}
      </div>
    );
  return (
    <form onSubmit={submit} className="partner-form">
      <fieldset className="plain-fieldset" disabled={pending}>
        <div className="form-grid">
          <label>
            Nama lengkap / nama usaha
            <input
              required
              minLength={2}
              maxLength={150}
              autoComplete="name"
              value={values.name}
              onChange={(e) =>
                setValues((v) => ({ ...v, name: e.target.value }))
              }
            />
          </label>
          <label>
            Nomor WhatsApp
            <input
              required
              type="tel"
              maxLength={30}
              autoComplete="tel"
              placeholder="081234567890 atau +6281234567890"
              value={values.whatsapp}
              onChange={(e) =>
                setValues((v) => ({ ...v, whatsapp: e.target.value }))
              }
            />
          </label>
          <label>
            Domisili / area
            <select
              required
              value={values.domicile}
              onChange={(e) =>
                setValues((v) => ({ ...v, domicile: e.target.value }))
              }
            >
              <option value="">Pilih domisili</option>
              {partnerAreas.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
            <small>Lokasi asal Anda.</small>
          </label>
          <label>
            Pengalaman kerja
            <select
              required
              value={values.experience}
              onChange={(e) =>
                setValues((v) => ({ ...v, experience: e.target.value }))
              }
            >
              <option value="">Pilih pengalaman</option>
              {partnerExperience.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>
          <fieldset className="checkbox-field full-span">
            <legend>Wilayah yang dapat dilayani (wajib)</legend>
            <div className="checkbox-options">
              {partnerAreas.map((a) => (
                <label key={a}>
                  <input
                    type="checkbox"
                    checked={values.areas.includes(a)}
                    onChange={() => toggle("areas", a)}
                  />
                  {a}
                </label>
              ))}
            </div>
            <small>Pilih satu atau lebih area yang mampu Anda layani.</small>
          </fieldset>
          <fieldset className="checkbox-field full-span">
            <legend>Bidang pekerjaan (wajib)</legend>
            <div className="checkbox-options">
              {partnerSkills.map((a) => (
                <label key={a}>
                  <input
                    type="checkbox"
                    checked={selectedSkills.includes(a)}
                    onChange={() => toggle("skills", a)}
                  />
                  {a}
                </label>
              ))}
            </div>
            <small>Pilih satu atau lebih bidang sesuai keahlian Anda.</small>
          </fieldset>
          <label className="checkbox-label full-span">
            <input
              required
              type="checkbox"
              checked={values.consent}
              onChange={(e) =>
                setValues((v) => ({ ...v, consent: e.target.checked }))
              }
            />
            Saya menyetujui untuk dihubungi terkait kemitraan oleh MR Properti.
          </label>
        </div>
      </fieldset>
      {error && (
        <p className="form-message error" role="alert">
          {error}
        </p>
      )}
      <div className="partner-form-actions">
        <button className="button" disabled={pending}>
          {pending
            ? "Menyimpan…"
            : partner
              ? "Simpan Perubahan"
              : "Kirim Pendaftaran"}
        </button>
        {partner && (
          <button
            type="button"
            className="outline-button"
            disabled={pending}
            onClick={onCancel}
          >
            Batal
          </button>
        )}
      </div>
    </form>
  );
}
