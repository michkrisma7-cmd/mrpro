import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { ShieldCheck, Camera, ClipboardCheck, CircleCheck } from "lucide-react";
import { getFields } from "@/lib/data";
import { databaseConfigured } from "@/lib/db";
import { storageConfigured } from "@/lib/storage";
import { PropertyForm } from "@/components/property-form";
export const dynamic = "force-dynamic";
export const metadata: Metadata = pageMetadata({
  title: "Pasang Iklan Properti untuk Jual, Sewa & Over Kredit",
  description:
    "Pasang iklan rumah, tanah, apartemen, dan ruko di seluruh Indonesia melalui MR Properti. Unggah foto dan detail properti tanpa perlu masuk atau daftar akun.",
  path: "/titip-properti",
});
export default async function SubmitProperty() {
  const fields = await getFields();
  const enabled = databaseConfigured;
  return (
    <div className="container page-wrap">
      <div className="breadcrumb">
        <Link href="/">Beranda</Link>
        <span>/</span>Pasang Iklan
      </div>
      <div className="page-heading">
        <p className="eyebrow">LANGKAH PERTAMA MENUJU PELUANG BARU</p>
        <h1>Pasang Iklan Properti</h1>
        <p>
          Iklankan rumah, tanah, apartemen, atau ruko untuk dijual, disewakan,
          maupun over kredit di seluruh Indonesia. Lengkapi harga, lokasi,
          spesifikasi, dan foto properti tanpa perlu masuk atau daftar akun.
        </p>
      </div>
      <div className="submission-layout">
        <div>
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
            Informasi yang lengkap memudahkan kami membantu memasarkan properti
            Anda.
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
              "Langsung tayang",
              "Selama masa uji coba, kiriman baru langsung tampil di katalog. Setelah berhasil, buka tautannya dari pemberitahuan di beranda.",
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
