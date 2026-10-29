"use client";
import Link from "next/link";
import { useState } from "react";
import {
  AirVent,
  PanelsTopLeft,
  Umbrella,
  Fence,
  Zap,
  Triangle,
  Layers,
  CookingPot,
  PaintRoller,
  House,
  MapPin,
  ArrowRight,
  ClipboardCheck,
  Handshake,
  Check,
} from "lucide-react";
import { partnerAreas, partnerSkills } from "@/lib/partner-validation";
import { PartnerForm } from "./partner-form";
const icons = [
  AirVent,
  PanelsTopLeft,
  Umbrella,
  Fence,
  Zap,
  Triangle,
  Layers,
  CookingPot,
  PaintRoller,
  House,
];
const benefits = [
  [
    "Keahlian yang sesuai",
    "Permintaan pekerjaan dicocokkan dengan bidang, area, dan ketersediaan mitra.",
  ],
  [
    "Kesepakatan tertulis",
    "Lingkup kerja, material, upah, dan tahapan pembayaran disepakati sebelum mulai.",
  ],
  [
    "Portofolio yang berkembang",
    "Dokumentasikan hasil pekerjaan dengan izin pelanggan sebagai rekam jejak keahlian.",
  ],
];
const steps = [
  ["Daftarkan diri", "Isi kontak, keahlian, dan wilayah layanan."],
  ["Verifikasi & diskusi", "Tim meninjau pengalaman dan contoh hasil kerja."],
  [
    "Sepakati kerja sama",
    "Bahas aturan, tanggung jawab, dan mekanisme pembayaran.",
  ],
  ["Terima penugasan", "Penawaran pekerjaan mengikuti kebutuhan yang sesuai."],
];
const requirements = [
  "Nomor WhatsApp aktif dan domisili jelas.",
  "Pengalaman sesuai bidang yang dipilih.",
  "Foto hasil pekerjaan untuk tahap verifikasi.",
  "Informasi alat kerja dan jumlah anggota tim.",
  "Kesediaan mengikuti kesepakatan pekerjaan.",
];
const faqs = [
  [
    "Apakah boleh mendaftar perorangan?",
    "Boleh. Kemitraan terbuka untuk tenaga mandiri, kelompok tukang, dan usaha jasa sesuai bidang keahlian serta hasil verifikasi.",
  ],
  [
    "Bagaimana pembagian upah atau komisi?",
    "Nilai upah atau komisi dibahas secara transparan sesuai kesepakatan yang adil. Kami akan berpihak dan mengutamakan yang terbaik agar usaha Anda lancar terlebih dahulu.",
  ],
  [
    "Apakah mitra langsung mendapat pekerjaan?",
    "Penugasan mengikuti permintaan pelanggan, kesesuaian keahlian, wilayah, dan ketersediaan mitra setelah verifikasi.",
  ],
  [
    "Bagaimana tanggung jawab hasil pekerjaan?",
    "Standar hasil, keselamatan kerja, penanganan keluhan, dan ketentuan perbaikan ditetapkan dalam kesepakatan masing-masing pekerjaan.",
  ],
];
export function Partnership() {
  const [skills, setSkills] = useState<string[]>([]);
  return (
    <div id="mr-mitra">
      <nav className="mitra-breadcrumb small" aria-label="Breadcrumb">
        <Link href="/">Beranda</Link>
        <span> / </span>
        <span aria-current="page">Kemitraan</span>
      </nav>
      <div className="hero">
        <div>
          <div className="eyebrow">KEMITRAAN MR PROPERTI</div>
          <h1>
            Keahlian Anda.
            <br />
            Peluang kerja
            <br />
            di wilayah Anda.
          </h1>
          <p>
            Bergabung sebagai mitra tukang, teknisi, atau tim pelaksana. Mari
            melayani kebutuhan perbaikan dan renovasi rumah bersama MR Properti.
          </p>
          <div className="actions">
            <a className="action" href="#mr-daftar">
              Daftar menjadi mitra <ArrowRight size={20} aria-hidden="true" />
            </a>
            <a className="action secondary" href="#mr-layanan">
              Lihat 10 bidang
            </a>
          </div>
          <span className="small">
            Untuk tenaga mandiri, kelompok tukang, dan usaha jasa lokal.
          </span>
        </div>
        <div className="board">
          <div className="eyebrow">BERKEMBANG BERSAMA</div>
          <h3>Anda fokus pada hasil pekerjaan.</h3>
          <p>
            MR Properti membantu mengoordinasikan kebutuhan pelanggan dengan
            keahlian mitra.
          </p>
          {[
            [
              MapPin,
              "Pekerjaan sesuai jangkauan",
              "Pilih area yang mampu Anda layani",
            ],
            [
              ClipboardCheck,
              "Lingkup pekerjaan disepakati",
              "Rincian kerja, biaya, dan jadwal dibahas di awal",
            ],
            [
              Handshake,
              "Koordinasi dengan tim lokal",
              "Komunikasi dari survei sampai serah terima",
            ],
          ].map(([Icon, title, text]) => {
            const I = Icon as typeof MapPin;
            return (
              <div className="board-row" key={String(title)}>
                <span className="icon">
                  <I aria-hidden="true" />
                </span>
                <div>
                  {String(title)}
                  <br />
                  <span className="small">{String(text)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <section className="area-section">
        <div className="eyebrow">DEKAT LOKASI, MUDAH KOORDINASI</div>
        <h2>Empat wilayah. Satu jaringan kerja.</h2>
        <p>
          Pendaftaran kemitraan dan penugasan dibatasi pada empat area berikut.
        </p>
        <div className="locations">
          {partnerAreas.map((a) => (
            <span key={a}>{a}</span>
          ))}
        </div>
      </section>
      <section id="mr-layanan" className="tinted">
        <h2>Pilih bidang keahlian Anda</h2>
        <p>
          Klik bidang untuk memasukkannya ke formulir. Anda boleh memilih lebih
          dari satu sesuai kemampuan.
        </p>
        <div className="services" id="mr-services">
          {partnerSkills.map((skill, i) => {
            const Icon = icons[i];
            const selected = skills.includes(skill);
            return (
              <button
                key={skill}
                type="button"
                className="service"
                aria-pressed={selected}
                onClick={() =>
                  setSkills((s) =>
                    s.includes(skill)
                      ? s.filter((v) => v !== skill)
                      : [...s, skill],
                  )
                }
              >
                <Icon aria-hidden="true" />
                <span>{skill}</span>
                {selected && (
                  <Check
                    className="selected-mark"
                    size={14}
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>
        <div
          className="small selection-summary"
          id="mr-selection"
          aria-live="polite"
        >
          {skills.length
            ? `${skills.length} bidang dipilih: ${skills.join(", ")}`
            : "Belum ada bidang dipilih."}
        </div>
      </section>
      <section>
        <h2>Kemitraan yang jelas sejak awal</h2>
        <div className="benefits">
          {benefits.map(([title, text]) => (
            <div key={title}>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>
      <section id="mr-cara" className="tinted">
        <h2>Langkah menjadi mitra</h2>
        <ol className="steps">
          {steps.map(([title, text], i) => (
            <li key={title}>
              <span className="stepnum" aria-hidden="true">
                {i + 1}
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </section>
      <section id="mr-daftar" className="registration">
        <div>
          <div className="eyebrow">MARI BERKENALAN</div>
          <h2>
            Jadilah bagian dari
            <br />
            mitra MR Properti.
          </h2>
          <p>
            Kami membuka kesempatan bagi tenaga berpengalaman yang mengutamakan
            kerapian, tanggung jawab, dan komunikasi.
          </p>
          <h3>Yang perlu disiapkan</h3>
          <ul className="requirements">
            {requirements.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <div className="mitra-notice small">
            Pendaftaran akan ditinjau terlebih dahulu. Kemitraan tidak menjamin
            jumlah pekerjaan atau penghasilan tertentu.
          </div>
        </div>
        <PartnerForm skills={skills} onSkillsChange={setSkills} />
      </section>
      <section id="mr-faq" className="tinted">
        <h2>Pertanyaan seputar kemitraan</h2>
        {faqs.map(([q, a], i) => (
          <details key={q} open={i === 1}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </section>
    </div>
  );
}
