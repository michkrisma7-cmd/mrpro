import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  UsersRound,
  Quote,
  BookOpen,
  House,
  Wrench,
  SlidersHorizontal,
  Settings,
  ArrowUpRight,
  CircleDot,
  Clock3,
  CheckCircle2,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { currentUser, authConfigured } from "@/lib/auth";
import { db, databaseConfigured } from "@/lib/db";
import { getFields, getSettings } from "@/lib/data";
import { demoListings, demoServices } from "@/lib/demo";
import type { Listing, Service } from "@/lib/types";
import {
  FieldManager,
  ModerationForm,
  PropertyEditor,
  ServiceEditor,
  SettingsForm,
} from "@/components/admin-forms";
import { redirect } from "next/navigation";
import { TeamEditor, TeamDeleteForm } from "@/components/team-editor";
import { storageConfigured } from "@/lib/storage";
import {
  TestimonialEditor,
  TestimonialDeleteForm,
} from "@/components/testimonial-editor";
import { initialTestimonials } from "@/lib/testimonials";
import { BlogEditor } from "@/components/blog-editor";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Dashboard Admin",
  robots: { index: false, follow: false },
};
const tabs = [
  ["ringkasan", "Ringkasan", LayoutDashboard],
  ["properti", "Properti & Kiriman", House],
  ["field", "Field Dinamis", SlidersHorizontal],
  ["layanan", "Layanan Tukang", Wrench],
  ["blog", "Blog", BookOpen],
  ["tim", "Tim Kami", UsersRound],
  ["testimoni", "Testimoni", Quote],
  ["pengaturan", "Pengaturan Website", Settings],
] as const;
export default async function Admin({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    edit?: string;
    tersimpan?: string;
    terhapus?: string;
  }>;
}) {
  const user = await currentUser();
  const preview = !authConfigured || !databaseConfigured;
  if (!preview && !user) redirect("/login");
  if (!preview && user?.role !== "ADMIN")
    return (
      <div className="container page-wrap empty-state">
        <ShieldCheck size={40} />
        <h1>Akses khusus administrator.</h1>
        <p>Akun Anda tidak memiliki izin mengelola website.</p>
        <Link className="button" href="/akun">
          Kembali ke akun
        </Link>
      </div>
    );
  const { tab = "ringkasan", edit, tersimpan, terhapus } = await searchParams;
  const [fields, settings] = await Promise.all([getFields(), getSettings()]);
  const properties: Listing[] = preview
    ? demoListings
    : ((await db().property.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
      })) as unknown as Listing[]);
  const services: Service[] = preview
    ? demoServices
    : await db().service.findMany({ orderBy: { createdAt: "desc" } });
  const posts =
    tab === "blog" && !preview
      ? await db().blogPost.findMany({
          orderBy: { createdAt: "desc" },
          take: 200,
        })
      : [];
  const members =
    tab === "tim" && !preview
      ? await db().teamMember.findMany({
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        })
      : [];
  const testimonials =
    tab === "testimoni"
      ? preview
        ? initialTestimonials
        : await db().testimonial.findMany({
            orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
          })
      : [];
  const selected = properties.find((p) => p.id === edit);
  return (
    <div className="admin-shell container">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-heading">
          <span className="admin-monogram">MR</span>
          <div>
            <strong>Workspace</strong>
            <small>Pengelola website</small>
          </div>
        </div>
        <p className="eyebrow">MENU UTAMA</p>
        <nav aria-label="Menu admin">
          {tabs.map(([key, label, Icon]) => (
            <Link
              key={key}
              href={`/admin?tab=${key}`}
              className={tab === key ? "active" : ""}
            >
              <Icon size={18} />
              {label}
              {key === "properti" && (
                <span>
                  {properties.filter((p) => p.status === "PENDING").length}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <ShieldCheck size={19} />
          <p>
            {preview ? "Mode pratinjau" : "Akses administrator"}
            <small>{preview ? "Perubahan dinonaktifkan" : user?.email}</small>
          </p>
        </div>
        <Link href="/" className="text-button">
          Lihat website
          <ArrowUpRight size={15} />
        </Link>
      </aside>
      <div className="admin-main">
        <div className="admin-top">
          <span>
            Workspace <span>/</span>{" "}
            {tabs.find((t) => t[0] === tab)?.[1] || "Ringkasan"}
          </span>
          <span className="admin-user">
            {user?.name || "Pratinjau admin"}
            <span className="worker-avatar">
              {user?.name.slice(0, 1) || "MR"}
            </span>
          </span>
        </div>
        <div className="section-heading admin-title">
          <div>
            <p className="eyebrow">MR PROPERTI · DASHBOARD</p>
            <h1>
              {tab === "ringkasan"
                ? "Semua rencana, satu tempat."
                : tabs.find((t) => t[0] === tab)?.[1]}
            </h1>
            <p>
              Kelola informasi dan hadirkan pengalaman terbaik untuk pengunjung.
            </p>
          </div>
        </div>
        {preview && (
          <div className="notice preview-notice">
            <ShieldCheck size={20} />
            <div>
              <strong>Pratinjau dashboard — hanya baca.</strong>
              <p>
                Hubungkan Neon Auth dan database untuk mengelola data. Semua
                penyimpanan memerlukan sesi admin yang valid.
              </p>
            </div>
            <Link href="/login">
              Login
              <ArrowUpRight size={14} />
            </Link>
          </div>
        )}
        {tab === "ringkasan" && (
          <>
            <div className="stats-grid">
              {[
                [House, "Total properti", properties.length],
                [
                  Clock3,
                  "Menunggu tinjauan",
                  properties.filter((p) => p.status === "PENDING").length,
                ],
                [
                  CheckCircle2,
                  "Diterbitkan",
                  properties.filter((p) => p.status === "PUBLISHED").length,
                ],
                [
                  Wrench,
                  "Layanan aktif",
                  services.filter((s) => s.active).length,
                ],
              ].map(([Icon, label, count]) => {
                const I = Icon as typeof House;
                return (
                  <div className="stat-card" key={String(label)}>
                    <I size={21} />
                    <p>{String(label)}</p>
                    <strong>{String(count)}</strong>
                  </div>
                );
              })}
            </div>
            <div className="admin-panel">
              <div className="panel-heading">
                <div>
                  <h2>Kiriman properti terbaru</h2>
                  <p>Tinjau dan kelola properti yang masuk.</p>
                </div>
                <Link href="/admin?tab=properti" className="text-button">
                  Lihat semua
                  <ArrowUpRight size={16} />
                </Link>
              </div>
              <PropertyTable properties={properties.slice(0, 5)} />
            </div>
            <div className="admin-quick-grid">
              <Link href="/admin?tab=field">
                <SlidersHorizontal size={24} />
                <h3>Field sesuai kebutuhan</h3>
                <p>Atur form, informasi kartu, dan detail properti.</p>
                <ArrowUpRight size={19} />
              </Link>
              <Link href="/admin?tab=layanan">
                <Wrench size={24} />
                <h3>Layanan & tenaga</h3>
                <p>Kelola skill tukang, tarif, dan kontak koordinasi.</p>
                <ArrowUpRight size={19} />
              </Link>
            </div>
          </>
        )}
        {tab === "field" && (
          <div className="admin-panel">
            <FieldManager fields={fields} disabled={preview} />
          </div>
        )}
        {tab === "properti" && (
          <div className="admin-panel">
            <div className="panel-heading">
              <div>
                <h2>Properti & kiriman</h2>
                <p>Periksa isi listing sebelum diterbitkan.</p>
              </div>
              <Link href="/titip-properti" className="outline-button">
                <Plus size={16} />
                Tambah Properti
              </Link>
            </div>
            <PropertyTable properties={properties} />
            {selected && (
              <div className="edit-panel">
                <h2>Tinjau: {selected.title}</h2>
                <div className="review-gallery">
                  {selected.gallery.map((src, i) => (
                    <Image
                      src={src}
                      key={i}
                      alt={`Foto properti ${i + 1}`}
                      width={200}
                      height={140}
                      className="cover"
                      unoptimized
                    />
                  ))}
                </div>
                <ModerationForm property={selected} disabled={preview} />
                <PropertyEditor
                  property={selected}
                  fields={fields}
                  disabled={preview}
                />
              </div>
            )}
          </div>
        )}
        {tab === "layanan" && (
          <div className="admin-panel">
            <div className="panel-heading">
              <div>
                <h2>Layanan & tenaga</h2>
                <p>
                  Tukang tidak perlu akun. Koordinasi pekerjaan melalui WhatsApp
                  admin.
                </p>
              </div>
              <Link
                href="/admin?tab=layanan&edit=baru"
                className="outline-button"
              >
                <Plus size={16} />
                Tambah Layanan
              </Link>
            </div>
            {services.map((s) => (
              <div className="service-admin-row" key={s.id}>
                <div>
                  <strong>{s.type}</strong>
                  <small>
                    {s.workerName} · {s.skills.join(", ")}
                  </small>
                </div>
                <span
                  className={`status-label ${s.active ? "published" : "archived"}`}
                >
                  {s.active ? "Aktif" : "Nonaktif"}
                </span>
                <Link
                  className="text-button"
                  href={`/admin?tab=layanan&edit=${s.id}`}
                >
                  Edit
                  <ArrowUpRight size={15} />
                </Link>
              </div>
            ))}
            {edit && (
              <div className="edit-panel">
                <h3>{edit === "baru" ? "Tambah layanan" : "Edit layanan"}</h3>
                <ServiceEditor
                  key={edit}
                  service={services.find((s) => s.id === edit)}
                  disabled={preview}
                />
              </div>
            )}
          </div>
        )}
        {tab === "blog" && (
          <div className="admin-panel">
            <div className="panel-heading">
              <div>
                <h2>Artikel blog</h2>
                <p>Hanya artikel terbit yang ditampilkan kepada pengunjung.</p>
              </div>
              <Link className="outline-button" href="/admin?tab=blog&edit=baru">
                Tambah Artikel
              </Link>
            </div>
            {tersimpan === "1" && (
              <p role="status">Artikel berhasil disimpan.</p>
            )}
            {posts.map((post) => (
              <div className="service-admin-row" key={post.id}>
                <div>
                  <strong>{post.title}</strong>
                  <small>/blog/{post.slug}</small>
                </div>
                <span
                  className={`status-label ${post.published ? "published" : "archived"}`}
                >
                  {post.published ? "Terbit" : "Draf"}
                </span>
                <Link
                  className="text-button"
                  href={`/admin?tab=blog&edit=${post.id}`}
                >
                  Edit
                </Link>
              </div>
            ))}
            {!posts.length && <p>Belum ada artikel.</p>}
            {edit && (edit === "baru" || posts.some((p) => p.id === edit)) && (
              <div className="edit-panel">
                <h3>{edit === "baru" ? "Tambah artikel" : "Edit artikel"}</h3>
                <BlogEditor
                  key={edit}
                  post={posts.find((p) => p.id === edit)}
                  disabled={preview}
                />
              </div>
            )}
          </div>
        )}
        {tab === "tim" && (
          <div className="admin-panel">
            <div className="panel-heading">
              <div>
                <h2>Anggota tim</h2>
                <p>
                  Kelola nama, keahlian, pengalaman kerja, dan foto. Hanya
                  profil aktif yang ditampilkan kepada pengunjung.
                </p>
              </div>
              <Link className="outline-button" href="/admin?tab=tim&edit=baru">
                <Plus size={16} />
                Tambah Anggota Tim
              </Link>
            </div>
            <Link className="text-button" href="/tim-kami">
              Lihat laman Tim Kami <ArrowUpRight size={16} />
            </Link>
            {tersimpan === "1" && (
              <p role="status">Profil anggota tim berhasil disimpan.</p>
            )}
            {terhapus === "1" && (
              <p role="status">Profil anggota tim berhasil dihapus.</p>
            )}
            {members.map((member) => (
              <div className="service-admin-row" key={member.id}>
                <div>
                  <strong>{member.name}</strong>
                  <small>{member.expertise}</small>
                </div>
                <span
                  className={`status-label ${member.active ? "published" : "archived"}`}
                >
                  {member.active ? "Aktif" : "Disembunyikan"}
                </span>
                <Link
                  className="text-button"
                  href={`/admin?tab=tim&edit=${member.id}`}
                >
                  Edit
                </Link>
              </div>
            ))}
            {!members.length && (
              <p>Belum ada anggota tim. Tambahkan profil pertama Anda.</p>
            )}
            {edit &&
              (edit === "baru" ||
                members.some((member) => member.id === edit)) && (
                <div className="edit-panel">
                  <h3>
                    {edit === "baru"
                      ? "Tambah anggota tim"
                      : "Edit anggota tim"}
                  </h3>
                  <TeamEditor
                    key={edit}
                    member={members.find((member) => member.id === edit)}
                    disabled={preview}
                    uploadEnabled={!preview && storageConfigured}
                  />
                  {edit !== "baru" && (
                    <TeamDeleteForm
                      id={edit}
                      name={members.find((member) => member.id === edit)!.name}
                      disabled={preview}
                    />
                  )}
                </div>
              )}
          </div>
        )}
        {tab === "testimoni" && (
          <div className="admin-panel">
            <div className="panel-heading">
              <div>
                <h2>Testimoni konsumen</h2>
                <p>
                  Kelola isi, bintang, urutan, dan foto profil konsumen di
                  beranda.
                </p>
              </div>
              <Link
                className="outline-button"
                href="/admin?tab=testimoni&edit=baru"
              >
                <Plus size={16} />
                Tambah Testimoni
              </Link>
            </div>
            {tersimpan === "1" && (
              <p role="status">Testimoni berhasil disimpan.</p>
            )}
            {terhapus === "1" && (
              <p role="status">Testimoni berhasil dihapus.</p>
            )}
            {testimonials.map((item) => (
              <div className="service-admin-row" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <small>
                    {item.category} · {item.rating} bintang · Urutan{" "}
                    {item.position}
                  </small>
                </div>
                <span
                  className={`status-label ${item.active ? "published" : "archived"}`}
                >
                  {item.active ? "Aktif" : "Disembunyikan"}
                </span>
                <Link
                  className="text-button"
                  href={`/admin?tab=testimoni&edit=${item.id}`}
                >
                  Edit
                </Link>
              </div>
            ))}
            {!testimonials.length && <p>Belum ada testimoni.</p>}
            {edit &&
              (edit === "baru" ||
                testimonials.some((item) => item.id === edit)) && (
                <div className="edit-panel">
                  <h3>
                    {edit === "baru" ? "Tambah testimoni" : "Edit testimoni"}
                  </h3>
                  <TestimonialEditor
                    key={edit}
                    member={testimonials.find((item) => item.id === edit)}
                    disabled={preview}
                    uploadEnabled={!preview && storageConfigured}
                  />
                  {edit !== "baru" && (
                    <TestimonialDeleteForm
                      id={edit}
                      name={testimonials.find((item) => item.id === edit)!.name}
                      disabled={preview}
                    />
                  )}
                </div>
              )}
          </div>
        )}
        {tab === "pengaturan" && (
          <div className="admin-panel">
            <div className="panel-heading">
              <div>
                <h2>Identitas & konten website</h2>
                <p>
                  Perubahan langsung digunakan pada halaman publik setelah
                  disimpan.
                </p>
              </div>
            </div>
            <SettingsForm settings={settings} disabled={preview} />
          </div>
        )}
      </div>
    </div>
  );
}
function PropertyTable({ properties }: { properties: Listing[] }) {
  const labels: Record<string, string> = {
    PENDING: "Menunggu",
    PUBLISHED: "Diterbitkan",
    REJECTED: "Perlu perbaikan",
    ARCHIVED: "Diarsipkan",
  };
  return (
    <div className="data-table-wrap">
      <table>
        <thead>
          <tr>
            <th>Properti</th>
            <th>Tanggal</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {properties.map((p) => (
            <tr key={p.id}>
              <td>
                <div className="table-property">
                  <Image
                    src={p.gallery[0] || "/images/hero.webp"}
                    alt=""
                    width={62}
                    height={48}
                    className="cover"
                    unoptimized
                  />
                  <div>
                    <strong>{p.title}</strong>
                    <small>{String(p.values.lokasi || "")}</small>
                  </div>
                </div>
              </td>
              <td>{new Date(p.createdAt).toLocaleDateString("id-ID")}</td>
              <td>
                <span className={`status-label ${p.status.toLowerCase()}`}>
                  <CircleDot size={11} />
                  {labels[p.status]}
                </span>
              </td>
              <td>
                <Link
                  className="text-button"
                  href={`/admin?tab=properti&edit=${p.id}`}
                >
                  Tinjau
                  <ArrowUpRight size={15} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!properties.length && (
        <div className="empty-state">
          <p>Belum ada kiriman properti.</p>
        </div>
      )}
    </div>
  );
}
