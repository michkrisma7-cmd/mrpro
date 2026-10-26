import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, House, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { SignOutButton } from "@/components/auth-form";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Akun Saya",
  robots: { index: false, follow: false },
};
export default async function Account({
  searchParams,
}: {
  searchParams: Promise<{ terkirim?: string }>;
}) {
  const user = await requireUser();
  const properties = await db().property.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
  });
  const { terkirim } = await searchParams;
  const labels: Record<string, string> = {
    PENDING: "Menunggu tinjauan",
    PUBLISHED: "Tayang",
    REJECTED: "Perlu perbaikan",
    ARCHIVED: "Diarsipkan",
  };
  return (
    <div className="container page-wrap">
      <div className="section-heading">
        <div>
          <p className="eyebrow">RUANG PERSONAL ANDA</p>
          <h1>Halo, {user.name}.</h1>
          <p>Pantau setiap langkah properti yang Anda titipkan.</p>
        </div>
        <SignOutButton />
      </div>
      {terkirim && (
        <p className="form-message success">
          <ShieldCheck size={20} />
          Properti berhasil dikirim dan langsung tayang di katalog.
        </p>
      )}
      <div className="account-toolbar">
        <h2>
          Properti saya <span className="count-pill">{properties.length}</span>
        </h2>
        <div>
          {user.role === "ADMIN" && (
            <Link href="/admin" className="outline-button">
              Dashboard admin
              <ArrowUpRight size={16} />
            </Link>
          )}
          <Link href="/titip-properti" className="button">
            Titip Properti
            <ArrowUpRight size={17} />
          </Link>
        </div>
      </div>
      {properties.length ? (
        <div className="data-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Properti</th>
                <th>Dikirim</th>
                <th>Status</th>
                <th>Tautan</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.title}</strong>
                  </td>
                  <td>{p.createdAt.toLocaleDateString("id-ID")}</td>
                  <td>
                    <span className={`status-label ${p.status.toLowerCase()}`}>
                      {labels[p.status]}
                    </span>
                  </td>
                  <td>
                    <Link
                      href={`/akun/properti/${p.id}/foto`}
                      className="text-button"
                    >
                      Edit foto
                    </Link>
                    {p.status === "PUBLISHED" ? (
                      <Link
                        href={`/properti/${p.slug}`}
                        className="text-button"
                      >
                        Lihat
                        <ArrowUpRight size={15} />
                      </Link>
                    ) : (
                      "Belum dipublikasikan"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <House size={40} />
          <h3>Mulai peluang pertama Anda.</h3>
          <p>
            Belum ada properti yang dititipkan. Siapkan foto dan informasi
            properti Anda.
          </p>
          <Link href="/titip-properti" className="button">
            Titip Properti Pertama
            <ArrowUpRight size={17} />
          </Link>
        </div>
      )}
    </div>
  );
}
