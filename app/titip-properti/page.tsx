import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import {
  ArrowUpRight,
  ShieldCheck,
  Camera,
  ClipboardCheck,
  CircleCheck,
} from "lucide-react";
import { getFields } from "@/lib/data";
import { currentUser } from "@/lib/auth";
import { databaseConfigured } from "@/lib/db";
import { storageConfigured } from "@/lib/storage";
import { PropertyForm } from "@/components/property-form";
export const dynamic = "force-dynamic";
export const metadata: Metadata = pageMetadata({
  title: "Titip Jual & Sewa Properti Cikarang dan Bekasi",
  description:
    "Titipkan properti di Cikarang dan Bekasi bersama MR Properti. Kirim informasi dan foto untuk ditinjau tim kami.",
  path: "/titip-properti",
  noindex: true,
});
export default async function SubmitProperty() {
  const [fields, user] = await Promise.all([getFields(), currentUser()]);
  const enabled = Boolean(user && databaseConfigured);
  return (
    <div className="container page-wrap">
      <div className="breadcrumb">
        <Link href="/">Beranda</Link>
        <span>/</span>Titip Properti
      </div>
      <div className="page-heading">
        <p className="eyebrow">LANGKAH PERTAMA MENUJU PELUANG BARU</p>
        <h1>Properti Anda, kami bantu.</h1>
        <p>
          Ceritakan tentang properti Anda. Kami bantu mempertemukannya dengan
          orang yang tepat.
        </p>
      </div>
      <div className="submission-layout">
        <div>
          {!user && (
            <div className="login-notice">
              <div>
                <strong>Masuk untuk menitipkan properti.</strong>
                <p>Simpan dan pantau status kiriman dari akun Anda.</p>
              </div>
              <Link href="/login?lanjut=titip" className="button button-small">
                Masuk / Daftar
                <ArrowUpRight size={16} />
              </Link>
            </div>
          )}
          <PropertyForm
            fields={fields}
            enabled={enabled}
            uploadEnabled={enabled && storageConfigured}
          />
        </div>
        <aside className="submission-guide">
          <span className="service-icon">
            <ShieldCheck size={27} />
          </span>
          <h3>Mulai dengan informasi yang tepat.</h3>
          <p>
            Informasi yang lengkap memudahkan kami meninjau dan membantu
            memasarkan properti Anda.
          </p>
          {[
            [
              Camera,
              "Foto yang bercerita",
              "Gunakan foto terang, jelas, dan menampilkan kondisi sebenarnya.",
            ],
            [
              ClipboardCheck,
              "Detail yang lengkap",
              "Cantumkan spesifikasi dan keunggulan properti secara akurat.",
            ],
            [
              CircleCheck,
              "Tinjauan oleh tim kami",
              "Status kiriman bisa Anda pantau dari halaman akun.",
            ],
          ].map(([Icon, title, desc]) => {
            const I = Icon as typeof Camera;
            return (
              <div className="guide-item" key={String(title)}>
                <I size={20} />
                <div>
                  <strong>{String(title)}</strong>
                  <p>{String(desc)}</p>
                </div>
              </div>
            );
          })}
          <small>
            Jangan masukkan dokumen kepemilikan, nomor identitas, atau data
            sensitif dalam deskripsi dan foto publik.
          </small>
        </aside>
      </div>
    </div>
  );
}
