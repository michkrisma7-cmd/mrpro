"use client";
import { useActionState, useState } from "react";
import { Plus, SlidersHorizontal, Trash2, Pencil, Check } from "lucide-react";
import {
  saveField,
  deleteField,
  moderateProperty,
  saveService,
  saveSettings,
  editProperty,
} from "@/lib/actions";
import type { Field, Listing, Settings, Service } from "@/lib/types";
import { FormMessage, SubmitButton } from "./form-status";
const fieldTypes: Record<Field["type"], string> = {
  TEXT: "Teks",
  NUMBER: "Angka",
  PRICE: "Harga",
  SELECT: "Select",
  MULTISELECT: "Multi select",
};
export function FieldEditor({
  field,
  disabled,
  onClose,
}: {
  field?: Field;
  disabled: boolean;
  onClose?: () => void;
}) {
  const [state, action] = useActionState(saveField, {});
  const [type, setType] = useState(field?.type || "TEXT");
  return (
    <form action={action} className="admin-edit-form">
      <fieldset disabled={disabled} className="plain-fieldset">
        <input type="hidden" name="id" value={field?.id || ""} />
        <div className="form-grid">
          <label>
            Nama field
            <input
              name="name"
              required
              defaultValue={field?.name}
              placeholder="Contoh: Sertifikat"
              maxLength={80}
            />
          </label>
          <label>
            Key field
            <input
              name="key"
              required
              readOnly={Boolean(field)}
              defaultValue={field?.key}
              pattern="[a-z][a-z0-9_]{0,49}"
              placeholder="sertifikat"
            />
            <small>Key dan tipe tidak dapat diubah setelah disimpan.</small>
          </label>
          <label>
            Tipe data
            <select
              name="type"
              value={type}
              onChange={(e) => setType(e.target.value as Field["type"])}
              disabled={Boolean(field)}
            >
              {Object.entries(fieldTypes).map(([key, label]) => (
                <option value={key} key={key}>
                  {label}
                </option>
              ))}
            </select>
            {field && <input type="hidden" name="type" value={field.type} />}
          </label>
          <label>
            Label di kartu
            <input
              name="cardLabel"
              defaultValue={field?.cardLabel}
              placeholder="Otomatis memakai nama field"
              maxLength={80}
            />
          </label>
          <label>
            Urutan
            <input
              name="position"
              type="number"
              min={0}
              max={999}
              defaultValue={field?.position || 0}
            />
          </label>
          {["SELECT", "MULTISELECT"].includes(type) && (
            <label className="full-span">
              Pilihan (satu per baris)
              <textarea
                name="options"
                rows={4}
                required
                defaultValue={field?.options.join("\n")}
                placeholder={"SHM\nHGB\nGirik"}
              />
            </label>
          )}
        </div>
        <div className="toggle-options">
          {[
            ["showInForm", "Tampil di form", field?.showInForm ?? true],
            ["showOnCard", "Tampil di kartu", field?.showOnCard ?? false],
            ["showOnDetail", "Tampil di detail", field?.showOnDetail ?? true],
            ["required", "Wajib diisi", field?.required ?? false],
          ].map(([name, label, value]) => (
            <label className="checkbox-label" key={String(name)}>
              <input
                type="checkbox"
                name={String(name)}
                defaultChecked={Boolean(value)}
              />
              {String(label)}
            </label>
          ))}
        </div>
        <FormMessage state={state} />
        <div className="form-actions">
          <SubmitButton>Simpan Field</SubmitButton>
          {onClose && (
            <button type="button" className="outline-button" onClick={onClose}>
              Tutup
            </button>
          )}
        </div>
      </fieldset>
    </form>
  );
}
function DeleteField({ id, disabled }: { id: string; disabled: boolean }) {
  const [state, action] = useActionState(deleteField, {});
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (
          !confirm(
            "Hapus definisi field ini? Nilai properti lama tetap tersimpan.",
          )
        )
          e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="icon-button danger"
        disabled={disabled}
        aria-label="Hapus field"
      >
        <Trash2 size={16} />
      </button>
      <FormMessage state={state} />
    </form>
  );
}
export function FieldManager({
  fields,
  disabled,
}: {
  fields: Field[];
  disabled: boolean;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  return (
    <>
      <div className="panel-heading">
        <div>
          <h2>Field properti</h2>
          <p>
            Atur informasi yang diminta dan ditampilkan. Galeri, judul, dan
            deskripsi selalu tersedia.
          </p>
        </div>
        <button
          className="button button-small"
          onClick={() => setAdding(!adding)}
        >
          <Plus size={16} />
          Tambah Field
        </button>
      </div>
      {adding && (
        <FieldEditor disabled={disabled} onClose={() => setAdding(false)} />
      )}
      <div className="data-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Field / key</th>
              <th>Tipe</th>
              <th>Form</th>
              <th>Kartu</th>
              <th>Detail</th>
              <th>Wajib</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f) => (
              <tr key={f.id}>
                <td>
                  <strong>{f.name}</strong>
                  <small className="table-subtext">{f.key}</small>
                </td>
                <td>
                  <span className="type-label">{fieldTypes[f.type]}</span>
                </td>
                {[f.showInForm, f.showOnCard, f.showOnDetail, f.required].map(
                  (v, i) => (
                    <td key={i}>
                      {v ? (
                        <Check size={16} className="green" />
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  ),
                )}
                <td>
                  <div className="table-actions">
                    <button
                      className="icon-button"
                      onClick={() => setEditing(editing === f.id ? null : f.id)}
                      aria-label={`Edit ${f.name}`}
                    >
                      <Pencil size={16} />
                    </button>
                    <DeleteField id={f.id} disabled={disabled} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {fields.map(
        (f) =>
          editing === f.id && (
            <div key={f.id} className="edit-panel">
              <h3>Edit {f.name}</h3>
              <FieldEditor
                field={f}
                disabled={disabled}
                onClose={() => setEditing(null)}
              />
            </div>
          ),
      )}
      <div className="notice">
        <SlidersHorizontal size={17} />
        Field yang hanya tampil di form tidak dikirim ke halaman publik. Label
        kartu yang kosong memakai nama field.
      </div>
    </>
  );
}
export function ModerationForm({
  property: p,
  disabled,
}: {
  property: Listing;
  disabled: boolean;
}) {
  const [state, action] = useActionState(moderateProperty, {});
  return (
    <form action={action} className="moderation-form">
      <input type="hidden" name="id" value={p.id} />
      <select
        name="status"
        defaultValue={p.status}
        aria-label="Status listing"
        disabled={disabled}
      >
        <option value="PENDING">Menunggu tinjauan</option>
        <option value="PUBLISHED">Diterbitkan</option>
        <option value="REJECTED">Perlu perbaikan</option>
        <option value="ARCHIVED">Diarsipkan</option>
      </select>
      <label className="checkbox-label">
        <input
          type="checkbox"
          name="featured"
          defaultChecked={p.featured}
          disabled={disabled}
        />
        Pilihan MR
      </label>
      <SubmitButton disabled={disabled}>Simpan</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
export function ServiceEditor({
  service: s,
  disabled,
}: {
  service?: Service;
  disabled: boolean;
}) {
  const [state, action] = useActionState(saveService, {});
  return (
    <form action={action} className="admin-edit-form">
      <fieldset disabled={disabled} className="plain-fieldset">
        <input type="hidden" name="id" value={s?.id || ""} />
        <div className="form-grid">
          <label>
            Jenis layanan
            <input
              name="type"
              required
              minLength={3}
              defaultValue={s?.type}
              placeholder="Renovasi rumah"
            />
          </label>
          <label>
            Nama tukang
            <input
              name="workerName"
              required
              defaultValue={s?.workerName}
              placeholder="Nama tenaga"
            />
          </label>
          <label>
            Harga termurah (Rp)
            <input
              name="minPrice"
              type="number"
              required
              min={0}
              max={2000000000}
              defaultValue={s?.minPrice}
            />
          </label>
          <label>
            Satuan tarif
            <input name="unit" required defaultValue={s?.unit || "hari"} />
          </label>
          <label className="full-span">
            Skill (pisahkan dengan koma)
            <input
              name="skills"
              required
              defaultValue={s?.skills.join(", ")}
              placeholder="Keramik, Bangunan, Renovasi"
            />
          </label>
          <label className="full-span">
            Deskripsi
            <textarea
              name="description"
              required
              minLength={20}
              rows={3}
              defaultValue={s?.description}
            />
          </label>
          <label>
            WhatsApp admin koordinasi
            <input
              name="whatsapp"
              type="tel"
              required
              defaultValue={s?.whatsapp}
              placeholder="628xxxxxxxxxx"
            />
          </label>
        </div>
        <label className="checkbox-label">
          <input
            type="checkbox"
            name="active"
            defaultChecked={s?.active ?? true}
          />
          Layanan aktif dan tampil di katalog
        </label>
        <FormMessage state={state} />
        <SubmitButton>Simpan Layanan</SubmitButton>
      </fieldset>
    </form>
  );
}
export function SettingsForm({
  settings: s,
  disabled,
}: {
  settings: Settings;
  disabled: boolean;
}) {
  const [state, action] = useActionState(saveSettings, {});
  return (
    <form action={action} className="admin-edit-form">
      <fieldset disabled={disabled} className="plain-fieldset">
        <div className="form-grid">
          <label className="full-span">
            Judul hero
            <input
              name="heroTitle"
              required
              maxLength={100}
              defaultValue={s.heroTitle}
            />
          </label>
          <label className="full-span">
            Deskripsi hero
            <textarea
              name="heroDescription"
              required
              minLength={20}
              rows={3}
              maxLength={500}
              defaultValue={s.heroDescription}
            />
          </label>
          <label>
            WhatsApp utama
            <input
              name="whatsapp"
              type="tel"
              defaultValue={s.whatsapp}
              placeholder="628xxxxxxxxxx"
            />
          </label>
          <label>
            Email kontak
            <input name="email" type="email" defaultValue={s.email} />
          </label>
          <label className="full-span">
            Area layanan
            <input name="area" maxLength={120} defaultValue={s.area} />
          </label>
        </div>
        <FormMessage state={state} />
        <SubmitButton>Simpan Pengaturan</SubmitButton>
      </fieldset>
    </form>
  );
}
export function PropertyEditor({
  property: p,
  fields,
  disabled,
}: {
  property: Listing;
  fields: Field[];
  disabled: boolean;
}) {
  const [state, action] = useActionState(editProperty, {});
  return (
    <form action={action} className="admin-edit-form">
      <fieldset disabled={disabled} className="plain-fieldset">
        <input type="hidden" name="id" value={p.id} />
        <div className="form-grid">
          <label className="full-span">
            Judul
            <input name="title" required minLength={8} defaultValue={p.title} />
          </label>
          <label className="full-span">
            Deskripsi
            <textarea
              name="description"
              rows={4}
              minLength={30}
              required
              defaultValue={p.description}
            />
          </label>
          <label>
            WhatsApp
            <input name="whatsapp" required defaultValue={p.whatsapp} />
          </label>
          {fields.map((f) => (
            <div key={f.key}>
              {f.type === "MULTISELECT" ? (
                <fieldset className="checkbox-field">
                  <legend>{f.name}</legend>
                  {f.options.map((o) => (
                    <label className="checkbox-label" key={o}>
                      <input
                        type="checkbox"
                        name={`field_${f.key}`}
                        value={o}
                        defaultChecked={
                          Array.isArray(p.values[f.key]) &&
                          (p.values[f.key] as string[]).includes(o)
                        }
                      />
                      {o}
                    </label>
                  ))}
                </fieldset>
              ) : (
                <label>
                  {f.name}
                  {f.type === "SELECT" ? (
                    <select
                      name={`field_${f.key}`}
                      defaultValue={String(p.values[f.key] ?? "")}
                      required={f.required}
                    >
                      <option value="">Pilih</option>
                      {f.options.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      name={`field_${f.key}`}
                      type={f.type === "TEXT" ? "text" : "number"}
                      min={f.type === "TEXT" ? undefined : 0}
                      step={f.type === "NUMBER" ? "any" : undefined}
                      required={f.required}
                      defaultValue={String(p.values[f.key] ?? "")}
                    />
                  )}
                </label>
              )}
            </div>
          ))}
        </div>
        <FormMessage state={state} />
        <SubmitButton>Simpan Informasi</SubmitButton>
      </fieldset>
    </form>
  );
}
