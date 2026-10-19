import Link from "next/link";
import { connection } from "next/server";
import Image from "next/image";
import {
  ArrowUpRight,
  ArrowRight,
  ShieldCheck,
  BadgeCheck,
  HeartHandshake,
  CircleCheck,
  House,
  MoveUpRight,
  KeyRound,
  Check,
} from "lucide-react";
import { getFields, getListings, getSettings } from "@/lib/data";
import { databaseConfigured } from "@/lib/db";
import { PropertyCard } from "@/components/property-card";
import { HomeServiceGrid } from "@/components/home-service-grid";
import { HeroSearch } from "@/components/hero-search";
import { whatsappLink } from "@/lib/format";
import { getBlogPosts } from "@/lib/blog";
import { BlogList } from "@/components/blog-list";
import { pageMetadata, homeTitle, homeDescription, jsonLd } from "@/lib/seo";
import { siteUrl } from "@/lib/format";
export const metadata = pageMetadata({
  title: homeTitle,
  description: homeDescription,
  path: "/",
});
export const revalidate = 60;
export default async function Home() {
  // Database-backed content must wait for a request, including when DATABASE_URL is set during builds.
  await connection();
  const [fields, properties, settings, posts] = await Promise.all([
    getFields(),
    getListings(),
    getSettings(),
    getBlogPosts(3),
  ]);
  const wa = whatsappLink(
    settings.whatsapp,
    "Halo MR Properti, saya ingin konsultasi properti.",
  );
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                "@id": `${siteUrl()}/#organization`,
                name: "MR Properti",
                url: siteUrl(),
                ...(settings.email ? { email: settings.email } : {}),
              },
              {
                "@type": "WebSite",
                "@id": `${siteUrl()}/#website`,
                name: "MR Properti",
                url: siteUrl(),
                inLanguage: "id-ID",
                publisher: { "@id": `${siteUrl()}/#organization` },
              },
            ],
          }),
        }}
      />
      <section className="property-hero" aria-labelledby="hero-title">
        <div className="hero-photo property-hero-photo">
          <Image
            src="/images/hero.webp"
            alt="Rumah tropis modern dengan taman asri dan pencahayaan alami"
            fill
            priority
            sizes="100vw"
            className="cover"
          />
        </div>
        <div className="container property-hero-content">
          <div className="property-hero-heading">
            <p className="eyebrow">PARTNER UNTUK SETIAP RENCANA</p>
            <h1 id="hero-title">{settings.heroTitle}</h1>
          </div>
          <HeroSearch
            types={
              fields.find(
                (f) => f.key === "jenis" && (f.showOnCard || f.showOnDetail),
              )?.options || []
            }
          />
          <div className="hero-actions property-hero-actions">
            <Link href="/kalkulator-kpr" className="button">
              Kalkulator KPR <ArrowUpRight size={17} />
            </Link>
            <Link href={wa || "/#tentang"} className="text-button">
              Kenali kami <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
      <div className="trust-strip home-trust-strip">
        <div className="container trust-strip-inner">
          <span>
            <ShieldCheck />
            Informasi properti yang transparan
          </span>
          <span>
            <HeartHandshake />
            Pendampingan di setiap langkah
          </span>
          <span>
            <BadgeCheck />
            Kebutuhan rumah, satu partner
          </span>
        </div>
      </div>
      <section
        className="section container"
        id="properti"
        aria-label="Properti terbaru"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">PILIHAN UNTUK LANGKAH BARU</p>
            <h2>
              Temukan ruang yang <span>tepat.</span>
            </h2>
            <p>Jelajahi pilihan properti, temukan yang terasa seperti rumah.</p>
          </div>
          <Link className="outline-button" href="/properti">
            Semua Properti <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="catalog-tabs">
          <Link className="active" href="/properti">
            Semua Properti
          </Link>
          <Link href="/properti?jenis=Rumah">Rumah</Link>
          <Link href="/properti?jenis=Apartemen">Apartemen</Link>
          <Link href="/properti?jenis=Tanah">Tanah</Link>
          <Link href="/properti?jenis=Ruko">Ruko</Link>
          <span className="listing-note">
            {!databaseConfigured
              ? "Koleksi inspirasi · data contoh"
              : "Pilihan properti terbaru"}
          </span>
        </div>
        <div className="property-grid">
          {properties.slice(0, 3).map((p) => (
            <PropertyCard key={p.id} property={p} fields={fields} />
          ))}
        </div>
        {!properties.length && (
          <div className="empty-state">
            <House />
            <h3>Ruang baru segera hadir.</h3>
            <p>Jadilah yang pertama menitipkan properti Anda.</p>
            <Link className="button" href="/titip-properti">
              Titip properti
            </Link>
          </div>
        )}
        <div className="section-footnote">
          <CircleCheck size={15} />
          Butuh bantuan memilih?{" "}
          <Link href={wa || "/titip-properti"}>
            Ceritakan kebutuhan Anda <ArrowUpRight size={13} />
          </Link>
        </div>
      </section>
      <section className="services-section">
        <div className="container section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">RUMAH NYAMAN, TANPA REPOT</p>
              <h2>
                Ada yang perlu <span>dibereskan?</span>
              </h2>
              <p>
                Dari renovasi hingga perbaikan kecil, temukan tenaga yang tepat.
              </p>
            </div>
            <Link href="/layanan" className="outline-button">
              Jelajahi Layanan <ArrowUpRight size={17} />
            </Link>
          </div>
          <HomeServiceGrid />
          <div className="service-note">
            <ShieldCheck size={17} />
            <span>
              Konsultasikan pekerjaan Anda. Kami bantu hubungkan dengan tukang
              yang sesuai.
            </span>
          </div>
        </div>
      </section>
      <section className="section container">
        <div className="consign-banner">
          <div className="consign-art">
            <span className="art-circle" />
            <House size={110} strokeWidth={0.8} />
            <span className="art-key">
              <KeyRound size={30} />
            </span>
            <span className="art-check">
              <Check size={22} />
            </span>
          </div>
          <div>
            <p className="eyebrow">PROPERTI ANDA, PELUANG BARU</p>
            <h2>
              Punya properti?
              <br />
              Biar kami bantu <span>temukan pemilik barunya.</span>
            </h2>
            <p>
              Titipkan rumah, tanah, atau ruang usaha Anda. Isi informasinya,
              <br className="desktop-only" /> tim kami akan membantu langkah
              selanjutnya.
            </p>
            <Link className="button" href="/titip-properti">
              Titip Properti Saya <ArrowUpRight size={18} />
            </Link>
          </div>
          <ArrowUpRight
            className="banner-decoration"
            size={65}
            strokeWidth={0.8}
            aria-hidden="true"
          />
        </div>
      </section>
      <section className="section container about-section" id="tentang">
        <div>
          <p className="eyebrow">KENALI MR PROPERTI</p>
          <h2>
            Rencana besar,
            <br />
            dimulai dari <span>rasa percaya.</span>
          </h2>
          <p>
            Kami percaya setiap orang berhak menemukan ruang yang tepat. MR
            Properti hadir untuk mempertemukan kebutuhan Anda dengan properti
            dan layanan rumah yang sesuai.
          </p>
          <Link href="/titip-properti" className="text-button">
            Mari mulai percakapan <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="steps">
          {[
            [
              "01",
              "Ceritakan kebutuhan Anda",
              "Cari rumah, jual properti, atau butuh bantuan tukang? Kami siap mendengarkan.",
            ],
            [
              "02",
              "Temukan pilihan yang sesuai",
              "Jelajahi informasi yang jelas dan pilih yang paling cocok untuk rencana Anda.",
            ],
            [
              "03",
              "Wujudkan langkah berikutnya",
              "Hubungi kami lewat WhatsApp. Kami bantu koordinasikan prosesnya.",
            ],
          ].map(([n, title, desc]) => (
            <div className="step" key={n}>
              <span>{n}</span>
              <div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
              <MoveUpRight size={19} />
            </div>
          ))}
        </div>
      </section>
      <section className="section container" id="blog">
        <div className="section-heading">
          <div>
            <p className="eyebrow">JURNAL MR PROPERTI</p>
            <h2>Inspirasi & panduan rumah.</h2>
          </div>
          <Link className="outline-button" href="/blog">
            Semua Artikel <ArrowUpRight size={17} />
          </Link>
        </div>
        <BlogList posts={posts} />
      </section>
      <section className="container faq-section">
        <div>
          <p className="eyebrow">BIAR MAKIN YAKIN</p>
          <h2>Hal yang sering ditanyakan.</h2>
        </div>
        <div>
          {[
            [
              "Bagaimana cara menjadwalkan survei properti?",
              "Buka detail properti dan tekan tombol WhatsApp. Tim kami akan membantu mencocokkan jadwal Anda dengan pemilik properti.",
            ],
            [
              "Apakah saya bisa menitipkan properti di sini?",
              "Tentu. Buat akun, isi formulir Titip Properti, dan unggah foto. Selama masa uji coba, kiriman baru langsung tayang di katalog setelah berhasil dikirim.",
            ],
            [
              "Bagaimana cara memesan jasa tukang?",
              "Pilih layanan yang dibutuhkan dan hubungi admin melalui WhatsApp. Kami membantu koordinasi kebutuhan dan jadwal dengan tukang.",
            ],
            [
              "Apakah harga layanan sudah termasuk material?",
              "Harga yang tampil adalah tarif mulai dari. Rincian jasa, material, dan lingkup pekerjaan disepakati melalui konsultasi sebelum pekerjaan dimulai.",
            ],
          ].map(([q, a]) => (
            <details key={q}>
              <summary>
                {q}
                <span>+</span>
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
      <section className="container final-cta">
        <div>
          <span className="eyebrow">SETIAP RENCANA LAYAK DIWUJUDKAN</span>
          <h2>Langkah baru Anda, dimulai di sini.</h2>
          <p>
            Properti impian atau rumah yang lebih nyaman. Mari wujudkan bersama.
          </p>
        </div>
        <Link className="button button-cream" href={wa || "/properti"}>
          {wa ? "Konsultasi Sekarang" : "Jelajahi Properti"}
          <ArrowUpRight size={19} />
        </Link>
      </section>
    </>
  );
}
