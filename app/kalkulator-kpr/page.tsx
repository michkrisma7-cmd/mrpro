import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { ArrowUpRight, ClipboardCheck, Check } from "lucide-react";
import { KprCalculator } from "@/components/kpr-calculator";
import { kprBanks } from "@/lib/kpr";

export const metadata: Metadata = pageMetadata({
  title: "Kalkulator KPR Rumah — Simulasi Cicilan BTN & BSI",
  description:
    "Hitung simulasi cicilan KPR rumah, uang muka, tenor, dan estimasi total pembayaran. Bandingkan ilustrasi BTN konvensional dan BSI syariah.",
  path: "/kalkulator-kpr",
});

export default function KprPage() {
  return (
    <div className="container page-wrap kpr-page">
      <div className="breadcrumb">
        <Link href="/">Beranda</Link>
        <span>/</span>Kalkulator KPR
      </div>
      <div className="page-heading kpr-heading">
        <p className="eyebrow">RENCANAKAN RUMAH, MULAI DARI ANGKANYA</p>
        <h1>Kalkulator KPR</h1>
        <p>
          Rumah impian, rencana yang terukur. Pilih pembiayaan Anda, atur uang
          muka, lalu temukan gambaran cicilan yang nyaman.
        </p>
      </div>
      <KprCalculator />
      <section
        className="kpr-requirements"
        aria-labelledby="kpr-requirements-title"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">SIAPKAN LANGKAH BERIKUTNYA</p>
            <h2 id="kpr-requirements-title">Syarat pengajuan KPR</h2>
            <p>
              Panduan persiapan umum. Daftar dokumen dan ketentuan final
              dikonfirmasi ke masing-masing bank.
            </p>
          </div>
        </div>
        <div className="kpr-requirement-grid">
          {kprBanks.map((bank) => (
            <article className="kpr-panel" key={bank.id}>
              <ClipboardCheck size={25} />
              <h3>{bank.name}</h3>
              <p>{bank.product}</p>
              <ul>
                {bank.requirements.map((item) => (
                  <li key={item}>
                    <Check size={15} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <a
                href={bank.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-button"
              >
                Cek ketentuan resmi {bank.name}
                <ArrowUpRight size={16} />
              </a>
            </article>
          ))}
        </div>
      </section>
      <div className="kpr-next-step">
        <div>
          <h3>Sudah punya gambaran anggaran?</h3>
          <p>Temukan rumah untuk rencana Anda berikutnya.</p>
        </div>
        <Link className="button" href="/properti">
          Jelajahi Properti
          <ArrowUpRight size={17} />
        </Link>
      </div>
    </div>
  );
}
