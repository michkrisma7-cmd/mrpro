"use client";
import { useState } from "react";
import {
  Wind,
  PanelsTopLeft,
  House,
  Fence,
  Zap,
  Hammer,
  Layers,
  CookingPot,
  Paintbrush,
  Wrench,
  MapPin,
  ArrowDown,
  Handshake,
  CheckCircle2,
} from "lucide-react";
import { partnerAreas, partnerSkills } from "@/lib/partner-validation";
import { PartnerForm } from "./partner-form";
const icons = [
  Wind,
  PanelsTopLeft,
  House,
  Fence,
  Zap,
  Hammer,
  Layers,
  CookingPot,
  Paintbrush,
  Wrench,
];
const benefits = [
  "Peluang pekerjaan sesuai keahlian dan wilayah.",
  "Lingkup pekerjaan, biaya, dan jadwal dibahas sejak awal.",
  "Koordinasi dengan tim MR Properti.",
  "Kesempatan membangun portofolio hasil pekerjaan.",
];
const steps = [
  "Mengisi formulir.",
  "Verifikasi pengalaman dan diskusi dengan tim.",
  "Menyepakati ketentuan kerja sama.",
  "Menerima penawaran pekerjaan sesuai kebutuhan, keahlian, wilayah, dan ketersediaan.",
];
const requirements = [
  "Nomor WhatsApp aktif.",
  "Domisili jelas.",
  "Memiliki keahlian sesuai bidang yang dipilih.",
  "Bersedia memberikan contoh hasil pekerjaan saat verifikasi.",
  "Bersedia menjelaskan alat kerja dan jumlah anggota tim.",
  "Bersedia mengikuti kesepakatan pekerjaan.",
];
const faqs = [
  [
    "Bagaimana pembagian upah atau komisi?",
    "Nilai upah atau komisi dibahas secara transparan sesuai kesepakatan yang adil. Kami akan berpihak dan mengutamakan yang terbaik agar usaha Anda lancar terlebih dahulu.",
  ],
  [
    "Apakah boleh mendaftar perorangan?",
    "Boleh. Kemitraan terbuka untuk tenaga mandiri, kelompok tukang, dan usaha jasa sesuai bidang keahlian serta hasil verifikasi.",
  ],
  [
    "Apakah setelah mendaftar langsung mendapat pekerjaan?",
    "Pendaftaran akan ditinjau terlebih dahulu. Penawaran pekerjaan mengikuti permintaan pelanggan, kesesuaian keahlian, wilayah, dan ketersediaan mitra. Kemitraan tidak menjamin jumlah pekerjaan atau penghasilan tertentu.",
  ],
  [
    "Bagaimana ketentuan pelaksanaan pekerjaan?",
    "Lingkup pekerjaan, biaya, jadwal, tanggung jawab, dan tahapan pembayaran dibahas serta disepakati sebelum pekerjaan dimulai.",
  ],
];
export function Partnership() {
  const [skills, setSkills] = useState<string[]>([]);
  return (
    <div className="partnership">
      <section className="partner-hero">
        <div className="container partner-hero-grid">
          <div>
            <p className="eyebrow">KEMITRAAN MR PROPERTI</p>
            <h1>Keahlian Anda. Peluang kerja di wilayah Anda.</h1>
            <p>
              Bergabung sebagai mitra tukang, teknisi, atau tim pelaksana. Mari
              melayani kebutuhan perbaikan dan renovasi rumah bersama MR
              Properti.
            </p>
            <a className="button" href="#pendaftaran">
              Daftar Menjadi Mitra <ArrowDown size={17} />
            </a>
          </div>
          <div className="partner-hero-note">
            <Handshake size={60} strokeWidth={1} />
            <h2>
              Bersama, merawat rumah.
              <br />
              Bersama, membangun peluang.
            </h2>
            <p>
              Terbuka untuk tenaga mandiri, kelompok tukang, dan usaha jasa.
            </p>
            <div className="partner-areas">
              {partnerAreas.map((a) => (
                <span key={a}>
                  <MapPin size={14} />
                  {a}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
      <div className="container">
        <section className="partner-section">
          <p className="eyebrow">WILAYAH LAYANAN</p>
          <h2>Dekat dengan tempat Anda berkarya.</h2>
          <p>
            Kemitraan saat ini tersedia di Cikarang, Bekasi, Karawang, dan
            Cikampek.
          </p>
        </section>
        <section className="partner-section">
          <p className="eyebrow">BIDANG PEKERJAAN</p>
          <h2>Apa keahlian Anda?</h2>
          <p>
            Pilih satu atau lebih bidang. Pilihan ini langsung terisi pada
            formulir pendaftaran.
          </p>
          <div className="partner-skill-grid">
            {partnerSkills.map((skill, i) => {
              const Icon = icons[i];
              return (
                <button
                  key={skill}
                  type="button"
                  className={`partner-skill ${skills.includes(skill) ? "selected" : ""}`}
                  aria-pressed={skills.includes(skill)}
                  onClick={() =>
                    setSkills((s) =>
                      s.includes(skill)
                        ? s.filter((v) => v !== skill)
                        : [...s, skill],
                    )
                  }
                >
                  <Icon size={28} strokeWidth={1.5} />
                  <span>{skill}</span>
                  {skills.includes(skill) && <CheckCircle2 size={16} />}
                </button>
              );
            })}
          </div>
        </section>
        <section className="partner-section">
          <p className="eyebrow">MANFAAT KEMITRAAN</p>
          <h2>Kerja sama yang dimulai dengan kejelasan.</h2>
          <div className="partner-benefits">
            {benefits.map((b, i) => (
              <article key={b}>
                <span className="partner-number">0{i + 1}</span>
                <h3>{b}</h3>
              </article>
            ))}
          </div>
        </section>
        <section className="partner-section">
          <p className="eyebrow">ALUR BERGABUNG</p>
          <h2>Langkah awal kita bekerja sama.</h2>
          <ol className="partner-steps">
            {steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </section>
        <section
          className="partner-section partner-registration"
          id="pendaftaran"
        >
          <aside>
            <p className="eyebrow">DAFTAR MENJADI MITRA</p>
            <h2>Mari berkenalan.</h2>
            <p>
              Lengkapi informasi Anda untuk proses verifikasi oleh tim MR
              Properti.
            </p>
            <h3>Persyaratan</h3>
            <ul className="partner-requirements">
              {requirements.map((r) => (
                <li key={r}>
                  <CheckCircle2 size={17} />
                  {r}
                </li>
              ))}
            </ul>
          </aside>
          <div className="partner-form-card">
            <h2>Formulir pendaftaran mitra</h2>
            <p>
              Seluruh field wajib diisi. Data pendaftaran hanya dapat diakses
              admin yang berwenang.
            </p>
            <PartnerForm skills={skills} onSkillsChange={setSkills} />
          </div>
        </section>
        <section className="partner-section partner-faq">
          <p className="eyebrow">PERTANYAAN UMUM</p>
          <h2>Sebelum Anda bergabung.</h2>
          {faqs.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </section>
      </div>
    </div>
  );
}
