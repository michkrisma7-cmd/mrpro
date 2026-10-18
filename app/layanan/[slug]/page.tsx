import type { Metadata } from "next";
import { pageMetadata, breadcrumbs, jsonLd } from "@/lib/seo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Hammer, MessageCircle, ArrowUpRight } from "lucide-react";
import { getServices, getSettings } from "@/lib/data";
import { money, whatsappLink, siteUrl } from "@/lib/format";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const slug = (await params).slug;
  const service = (await getServices()).find((x) => x.slug === slug);
  return service
    ? pageMetadata({
        title: `${service.type} — ${service.workerName} di Cikarang dan Bekasi`,
        description: `${service.type} bersama ${service.workerName} di Cikarang dan Bekasi. Tarif mulai ${money(service.minPrice)} per ${service.unit}. Konsultasi kebutuhan pekerjaan melalui MR Properti.`,
        path: `/layanan/${slug}`,
        images: service.image ? [service.image] : undefined,
      })
    : { title: "Layanan tidak ditemukan", robots: { index: false } };
}
export default async function ServiceDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const slug = (await params).slug;
  const s = (await getServices()).find((x) => x.slug === slug);
  if (!s) notFound();
  const settings = await getSettings();
  const wa = whatsappLink(
    s.whatsapp || settings.whatsapp,
    `Halo, saya ingin konsultasi ${s.type} dengan ${s.workerName}.`,
  );
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: s.type,
    description: s.description,
    provider: { "@type": "Organization", name: "MR Properti" },
    url: `${siteUrl()}/layanan/${s.slug}`,
  };
  return (
    <div className="container page-wrap">
      <div className="breadcrumb">
        <Link href="/">Beranda</Link>
        <span>/</span>
        <Link href="/layanan">Layanan Tukang</Link>
        <span>/</span>
        {s.type}
      </div>
      <div className="detail-layout service-detail">
        <div>
          <span className="large-service-icon">
            <Hammer size={45} strokeWidth={1.5} />
          </span>
          <p className="eyebrow">BANTUAN UNTUK RUMAH ANDA</p>
          <h1>{s.type}</h1>
          <p className="intro-copy">{s.description}</p>
          <section className="detail-section">
            <h2>Kenali tenaga Anda</h2>
            <div className="worker worker-large">
              <span className="worker-avatar">
                {s.workerName.replace(/^Pak /, "").slice(0, 1)}
              </span>
              <span>
                <strong>{s.workerName}</strong>
                <small>Koordinasi pekerjaan melalui admin MR Properti</small>
              </span>
            </div>
          </section>
          <section className="detail-section">
            <h2>Keahlian</h2>
            <div className="skill-list">
              {s.skills.map((skill) => (
                <span key={skill}>
                  <Check size={17} />
                  {skill}
                </span>
              ))}
            </div>
          </section>
          <section className="detail-section">
            <h2>Bagaimana prosesnya?</h2>
            <p>
              Ceritakan kebutuhan pekerjaan melalui WhatsApp. Tim kami membantu
              mencocokkan kebutuhan, lokasi, dan ketersediaan tenaga. Harga dan
              jadwal disepakati sebelum pekerjaan dimulai.
            </p>
          </section>
        </div>
        <aside className="contact-panel">
          <p>Tarif mulai dari</p>
          <strong>
            {money(s.minPrice)}
            <small> / {s.unit}</small>
          </strong>
          <p>
            Biaya akhir menyesuaikan lingkup pekerjaan dan kebutuhan material.
          </p>
          {wa ? (
            <a
              href={wa}
              className="button full-width"
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle size={18} />
              Konsultasi Pekerjaan
              <ArrowUpRight size={17} />
            </a>
          ) : (
            <div className="notice">
              Ini layanan contoh. Kontak pemesanan belum dikonfigurasi.
            </div>
          )}
        </aside>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd([
            schema,
            breadcrumbs([
              { name: "Beranda", path: "/" },
              { name: "Layanan Tukang", path: "/layanan" },
              { name: s.type, path: `/layanan/${s.slug}` },
            ]),
          ]),
        }}
      />
    </div>
  );
}
