"use client";
import { useActionState, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { PropertyPhotos } from "./property-photos";
import { submitProperty } from "@/lib/actions";
import { SubmitButton, FormMessage } from "./form-status";
import type { Field } from "@/lib/types";
export function PropertyForm({
  fields,
  enabled,
  uploadEnabled,
}: {
  fields: Field[];
  enabled: boolean;
  uploadEnabled: boolean;
}) {
  const [state, action] = useActionState(submitProperty, {});
  const [photosReady, setPhotosReady] = useState(false);
  return (
    <form action={action} className="property-form">
      <fieldset disabled={!enabled} className="plain-fieldset">
        <div className="form-section">
          <div className="form-section-title">
            <span>01</span>
            <div>
              <h2>Ceritakan tentang properti Anda</h2>
              <p>
                Informasi yang jelas membantu calon pembeli mengenal properti.
              </p>
            </div>
          </div>
          <label>
            Judul properti <span className="required">*</span>
            <input
              name="title"
              required
              minLength={8}
              maxLength={150}
              placeholder="Contoh: Rumah tropis 2 lantai di Bintaro"
            />
          </label>
          <label>
            Deskripsi <span className="required">*</span>
            <textarea
              name="description"
              required
              minLength={30}
              maxLength={10000}
              rows={5}
              placeholder="Ceritakan kondisi, keunggulan, dan lingkungan properti Anda…"
            />
          </label>
          <label>
            Nomor WhatsApp <span className="required">*</span>
            <input
              name="whatsapp"
              type="tel"
              autoComplete="tel"
              required
              placeholder="08xxxxxxxxxx"
            />
            <small>
              Nomor ini ditampilkan di detail properti setelah listing
              diterbitkan.
            </small>
          </label>
        </div>
        <div className="form-section">
          <div className="form-section-title">
            <span>02</span>
            <div>
              <h2>Galeri properti</h2>
            </div>
          </div>
          <PropertyPhotos enabled={uploadEnabled} onReady={setPhotosReady} />
        </div>
        <div className="form-section">
          <div className="form-section-title">
            <span>03</span>
            <div>
              <h2>Detail & spesifikasi</h2>
              <p>Lengkapi informasi sesuai properti Anda.</p>
            </div>
          </div>
          <div className="form-grid">
            {fields
              .filter((f) => f.showInForm)
              .map((f) => (
                <div
                  key={f.key}
                  className={f.type === "MULTISELECT" ? "full-span" : ""}
                >
                  {f.type === "MULTISELECT" ? (
                    <fieldset className="checkbox-field">
                      <legend>
                        {f.name}
                        {f.required && <span className="required"> *</span>}
                      </legend>
                      <div className="checkbox-options">
                        {f.options.map((o) => (
                          <label key={o}>
                            <input
                              type="checkbox"
                              name={`field_${f.key}`}
                              value={o}
                            />
                            {o}
                          </label>
                        ))}
                      </div>
                      {f.required && (
                        <small>
                          Pilih minimal satu. Pilihan diperiksa saat dikirim.
                        </small>
                      )}
                    </fieldset>
                  ) : (
                    <label>
                      {f.name}
                      {f.required && <span className="required"> *</span>}
                      {f.type === "SELECT" ? (
                        <select
                          name={`field_${f.key}`}
                          required={f.required}
                          defaultValue=""
                        >
                          <option value="" disabled>
                            Pilih {f.name.toLowerCase()}
                          </option>
                          {f.options.map((o) => (
                            <option key={o}>{o}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          name={`field_${f.key}`}
                          required={f.required}
                          type={f.type === "TEXT" ? "text" : "number"}
                          min={f.type === "TEXT" ? undefined : 0}
                          step={
                            f.type === "NUMBER"
                              ? "any"
                              : f.type === "PRICE"
                                ? "1"
                                : undefined
                          }
                          maxLength={f.type === "TEXT" ? 2000 : undefined}
                          placeholder={
                            f.type === "PRICE"
                              ? "Rp · Masukkan angka tanpa titik"
                              : `Masukkan ${f.name.toLowerCase()}`
                          }
                        />
                      )}
                    </label>
                  )}
                </div>
              ))}
          </div>
        </div>
        <div className="submit-area">
          <label className="checkbox-label">
            <input type="checkbox" required />
            Saya menyatakan informasi yang saya kirim benar dan menyetujui
            penayangan nomor WhatsApp untuk keperluan properti ini.
          </label>
          <FormMessage state={state} />
          <SubmitButton disabled={!photosReady || !uploadEnabled}>
            Tayangkan Properti
          </SubmitButton>
          <p>
            <ShieldCheck size={14} />
            Selama masa uji coba, properti langsung tayang setelah berhasil
            dikirim.
          </p>
        </div>
      </fieldset>
    </form>
  );
}
