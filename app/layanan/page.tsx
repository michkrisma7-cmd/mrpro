import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { ShieldCheck, MessageCircle, Wrench } from "lucide-react";
import { getServices } from "@/lib/data";
import { ServiceCard } from "@/components/service-card";
import { HomeServiceGrid } from "@/components/home-service-grid";
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ jenis?: string }>;
}): Promise<Metadata> {
  const { jenis } = await searchParams;
  return pageMetadata({
    title: "Jasa Tukang & Renovasi Rumah Cikarang dan Bekasi",
    description:
      "Cari jasa tukang renovasi rumah, kelistrikan, baja ringan, kanopi, dan teralis di Cikarang dan Bekasi. Konsultasikan kebutuhan melalui MR Properti.",
    path: `/layanan${jenis ? `?${new URLSearchParams({ jenis })}` : ""}`,
    noindex: Boolean(jenis),
  });
}
export default async function Services({
  searchParams,
}: {
  searchParams: Promise<{ jenis?: string }>;
}) {
  const { jenis } = await searchParams;
  const all = await getServices();
  const services = jenis
    ? all.filter((s) => s.type.toLowerCase().includes(jenis.toLowerCase()))
    : all;
  return (
    <div className="container page-wrap">
      <div className="breadcrumb">
        <Link href="/">Beranda</Link>
        <span>/</span>Layanan Tukang
      </div>
      <div className="page-heading">
        <p className="eyebrow">TENAGA TEPAT, RUMAH LEBIH NYAMAN</p>
        <h1>Urusan rumah, kami bantu.</h1>
        <p>
          Kenali layanannya, pilih kebutuhan Anda, dan biarkan kami membantu
          koordinasinya.
        </p>
      </div>
      <div className="service-process">
        <span>
          <Wrench size={20} />
          1. Pilih jenis pekerjaan
        </span>
        <span>
          <MessageCircle size={20} />
          2. Konsultasi lewat WhatsApp
        </span>
        <span>
          <ShieldCheck size={20} />
          3. Sepakati lingkup & jadwal
        </span>
      </div>
      <HomeServiceGrid detailed />
      {services.length > 0 && (
        <h2 className="service-provider-heading">Tenaga & layanan lainnya</h2>
      )}
      <div className="service-grid">
        {services.map((s, i) => (
          <ServiceCard key={s.id} service={s} index={i} />
        ))}
      </div>
      {jenis && !services.length && (
        <div className="empty-state">
          <h3>Layanan belum tersedia.</h3>
          <Link href="/layanan">Lihat semua layanan</Link>
        </div>
      )}
      <div className="notice service-disclaimer">
        Tarif merupakan harga mulai dari. Biaya akhir, material, lingkup
        pekerjaan, dan jadwal dikonfirmasi bersama sebelum pekerjaan dimulai.
      </div>
    </div>
  );
}
