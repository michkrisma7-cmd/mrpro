import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { partnerAreas, partnerSkills } from "@/lib/partner-validation";
import { PartnerDetail } from "./partner-detail";
import type { Prisma } from "@prisma/client";
export type PartnerSearch = {
  q?: string;
  wilayah?: string;
  bidang?: string;
  detail?: string;
  halaman?: string;
};
export async function PartnerAdmin({ params }: { params: PartnerSearch }) {
  await requireAdmin();
  const q = (params.q || "").trim().slice(0, 150);
  const phoneQuery = q.replace(/[\s().-]/g, "");
  const whatsappQuery = phoneQuery.startsWith("08")
    ? `+62${phoneQuery.slice(1)}`
    : phoneQuery;
  const area = partnerAreas.find((a) => a === params.wilayah);
  const skill = partnerSkills.find((s) => s === params.bidang);
  const page = Math.min(100000, Math.max(1, Number(params.halaman) || 1));
  const where: Prisma.PartnerWhereInput = {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { whatsapp: { contains: whatsappQuery } },
          ],
        }
      : {}),
    ...(area ? { areas: { has: area } } : {}),
    ...(skill ? { skills: { has: skill } } : {}),
  };
  let content;
  try {
    const [partners, count, selected] = await Promise.all([
      db().partner.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        skip: (Math.floor(page) - 1) * 30,
        take: 30,
      }),
      db().partner.count({ where }),
      params.detail
        ? db().partner.findUnique({ where: { id: params.detail } })
        : null,
    ]);
    const href = (values: Record<string, string>) =>
      `/admin?${new URLSearchParams({ tab: "mitra", q, ...(area ? { wilayah: area } : {}), ...(skill ? { bidang: skill } : {}), ...values })}`;
    content = (
      <>
        <p>{count} pendaftaran ditemukan.</p>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama / usaha</th>
                <th>WhatsApp</th>
                <th>Domisili</th>
                <th>Wilayah layanan</th>
                <th>Bidang</th>
                <th>Pengalaman</th>
                <th>Tanggal daftar (WIB)</th>
                <th>Kelola</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.whatsapp}</td>
                  <td>{p.domicile}</td>
                  <td>{p.areas.join(", ")}</td>
                  <td>{p.skills.join(", ")}</td>
                  <td>{p.experience}</td>
                  <td>
                    {p.createdAt.toLocaleDateString("id-ID", {
                      timeZone: "Asia/Jakarta",
                    })}
                  </td>
                  <td>
                    <Link
                      className="text-button"
                      href={href({ detail: p.id, halaman: String(page) })}
                    >
                      Detail / Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!partners.length && <p>Belum ada mitra yang sesuai pencarian.</p>}
        <div className="partner-form-actions">
          {page > 1 && (
            <Link
              className="outline-button"
              href={href({ halaman: String(page - 1) })}
            >
              Sebelumnya
            </Link>
          )}
          {page * 30 < count && (
            <Link
              className="outline-button"
              href={href({ halaman: String(page + 1) })}
            >
              Berikutnya
            </Link>
          )}
        </div>
        {selected && (
          <PartnerDetail
            key={selected.id}
            partner={{
              ...selected,
              createdAt: selected.createdAt.toISOString(),
              updatedAt: selected.updatedAt.toISOString(),
            }}
          />
        )}
        {params.detail && !selected && (
          <p role="alert">Data mitra tidak ditemukan.</p>
        )}
      </>
    );
  } catch {
    content = (
      <p role="alert">
        Data mitra belum dapat dimuat. Periksa koneksi database dan penerapan
        migrasi Partner.
      </p>
    );
  }
  return (
    <div className="admin-panel">
      <div className="panel-heading">
        <div>
          <h2>Daftar mitra</h2>
          <p>
            Data pendaftar bersifat privat dan hanya dapat diakses
            administrator.
          </p>
        </div>
      </div>
      <form className="form-grid" method="get">
        <input type="hidden" name="tab" value="mitra" />
        <label>
          Cari nama, nama usaha, atau WhatsApp
          <input
            name="q"
            maxLength={150}
            defaultValue={q}
            placeholder="Nama atau nomor WhatsApp"
          />
        </label>
        <label>
          Filter wilayah layanan
          <select name="wilayah" defaultValue={area || ""}>
            <option value="">Semua wilayah</option>
            {partnerAreas.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </label>
        <label>
          Filter bidang pekerjaan
          <select name="bidang" defaultValue={skill || ""}>
            <option value="">Semua bidang</option>
            {partnerSkills.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <div className="partner-form-actions">
          <button className="button">Cari / Filter</button>
          <Link className="outline-button" href="/admin?tab=mitra">
            Reset
          </Link>
        </div>
      </form>
      {content}
    </div>
  );
}
