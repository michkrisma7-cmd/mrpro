"use client";
import { useActionState, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { PropertyPhotos } from "./property-photos";
import { submitProperty, updateMemberProperty } from "@/lib/actions";
import { SubmitButton, FormMessage } from "./form-status";
import type { Field, Listing } from "@/lib/types";
import { PropertyRegions } from "./property-regions";
import { isRegionKey } from "@/lib/region-config";
export function PropertyForm({
  fields,
  enabled,
  uploadEnabled,
  property,
}: {
  fields: Field[];
  enabled: boolean;
  uploadEnabled: boolean;
  property?: Listing;
}) {
  const [state, action] = useActionState(
    property ? updateMemberProperty : submitProperty,
    {},
  );
  const [photosReady, setPhotosReady] = useState(false);
  return (
    <form
      action={action}
      className="property-form"
      // Failed actions return an error; keep the member's inputs for retry.
      // Successful actions redirect away, so no form reset is needed.
      onReset={(event) => event.preventDefault()}
    >
      <fieldset disabled={!enabled} className="plain-fieldset">
        {property && <input type="hidden" name="id" value={property.id} />}
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
              defaultValue={property?.title ?? ""}
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
              defaultValue={property?.description ?? ""}
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
              defaultValue={property?.whatsapp ?? ""}
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
          <PropertyPhotos
            initialGallery={property?.gallery}
            enabled={uploadEnabled}
            onReady={setPhotosReady}
          />
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
              .filter((f) => f.showInForm && !isRegionKey(f.key))
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
                              defaultChecked={
                                Array.isArray(property?.values[f.key]) &&
                                (property!.values[f.key] as string[]).includes(
                                  o,
                                )
                              }
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
                          defaultValue={String(property?.values[f.key] ?? "")}
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
                          defaultValue={String(property?.values[f.key] ?? "")}
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
                              : f.key === "lokasi"
                                ? "Contoh: Perumahan Melati, Jl. Mawar, Blok A atau patokan"
                                : `Masukkan ${f.name.toLowerCase()}`
                          }
                        />
                      )}
                    </label>
                  )}
                </div>
              ))}
            <PropertyRegions fields={fields} initial={property?.values} />
          </div>
        </div>
        <div className="submit-area">
          <FormMessage state={state} />
          <SubmitButton disabled={!photosReady}>
            {property ? "Simpan Perubahan" : "Tayangkan Properti"}
          </SubmitButton>
          <p>
            <ShieldCheck size={14} />
            {property
              ? "Perubahan disimpan tanpa mengubah status listing Anda."
              : "Selama masa uji coba, properti langsung tayang setelah berhasil dikirim."}
          </p>
        </div>
      </fieldset>
    </form>
  );
}
