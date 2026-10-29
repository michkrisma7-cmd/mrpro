"use client";
import { useState } from "react";
import { PartnerForm, type PartnerValues } from "./partner-form";
export function PartnerDetail({
  partner,
}: {
  partner: PartnerValues & { id: string; createdAt: string; updatedAt: string };
}) {
  const [editing, setEditing] = useState(false);
  return (
    <section className="edit-panel">
      <h2>Detail mitra</h2>
      {editing ? (
        <PartnerForm partner={partner} onCancel={() => setEditing(false)} />
      ) : (
        <>
          <dl className="partner-detail">
            {[
              ["Nama lengkap / nama usaha", partner.name],
              ["Nomor WhatsApp", partner.whatsapp],
              ["Domisili / area", partner.domicile],
              ["Wilayah yang dapat dilayani", partner.areas.join(", ")],
              ["Bidang pekerjaan", partner.skills.join(", ")],
              ["Pengalaman kerja", partner.experience],
              [
                "Persetujuan untuk dihubungi",
                partner.consent ? "Disetujui" : "Belum disetujui",
              ],
              [
                "Tanggal pendaftaran",
                new Date(partner.createdAt).toLocaleString("id-ID", {
                  timeZone: "Asia/Jakarta",
                }) + " WIB",
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <button className="button" onClick={() => setEditing(true)}>
            Edit
          </button>
        </>
      )}
    </section>
  );
}
