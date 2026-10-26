import "./consign-feature.css";
import Link from "next/link";
import { connection } from "next/server";
import Image, { getImageProps } from "next/image";
import { preload } from "react-dom";
import { Suspense } from "react";
import Loading from "./loading";
import {
  ArrowUpRight,
  ArrowRight,
  ShieldCheck,
  BadgeCheck,
  HeartHandshake,
  CircleCheck,
  House,
  MoveUpRight,
  UsersRound,
} from "lucide-react";
import { getFields, getListings, getSettings } from "@/lib/data";
import { databaseConfigured } from "@/lib/db";
import { PropertyCard } from "@/components/property-card";
import { HomeServiceGrid } from "@/components/home-service-grid";
import { HeroSearch } from "@/components/hero-search";
import { whatsappLink } from "@/lib/format";
import { getBlogPosts } from "@/lib/blog";
import { getTestimonials } from "@/lib/testimonials";
import { TestimonialSection } from "@/components/testimonial-section";
import { BlogList } from "@/components/blog-list";
import { pageMetadata, homeTitle, homeDescription, jsonLd } from "@/lib/seo";
import { siteUrl } from "@/lib/format";
export const metadata = pageMetadata({
  title: homeTitle,
  description: homeDescription,
  path: "/",
});
export const revalidate = 60;
const heroImage = {
  src: "/images/hero.webp",
  alt: "Rumah tropis modern dengan taman asri dan pencahayaan alami",
  fill: true,
  sizes: "100vw",
} as const;
const homeFaq = [
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
] as const;

export default function Home() {
  // Discover the LCP image before waiting for database-backed content.
  const { props } = getImageProps(heroImage);
  preload(props.src, {
    as: "image",
    imageSrcSet: props.srcSet,
    imageSizes: props.sizes,
    fetchPriority: "high",
    media: "(min-width: 641px)",
  });
  preload("/images/hero-mobile.webp", {
    as: "image",
    fetchPriority: "high",
    media: "(max-width: 640px)",
  });
  return (
    <>
      <section className="property-hero" aria-labelledby="hero-title">
        <div className="hero-photo property-hero-photo">
          <picture>
            <source
              media="(max-width: 640px)"
              srcSet="/images/hero-mobile.webp"
            />
            <Image
              {...heroImage}
              alt={heroImage.alt}
              loading="eager"
              fetchPriority="high"
              className="cover"
            />
          </picture>
        </div>
        <Suspense
          fallback={
            <div
              className="container property-hero-content"
              role="status"
              aria-label="Menyiapkan pencarian"
            />
          }
        >
          <HeroContent />
        </Suspense>
      </section>
      <Suspense fallback={<Loading />}>
        <HomeContent />
      </Suspense>
    </>
  );
}

async function HeroContent() {
  await connection();
  const [fields, settings] = await Promise.all([getFields(), getSettings()]);
  const wa = whatsappLink(
    settings.whatsapp,
    "Halo MR Properti, saya ingin konsultasi properti.",
  );
  return (
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
  );
}

async function HomeContent() {
  // Database-backed content must wait for a request, including when DATABASE_URL is set during builds.
  await connection();
  const [fields, properties, settings, posts, testimonials] = await Promise.all(
    [
      getFields(),
      getListings(),
      getSettings(),
      getBlogPosts(3),
      getTestimonials(),
    ],
  );
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
                "@type": "RealEstateAgent",
                "@id": `${siteUrl()}/#organization`,
                name: "MR Properti",
                url: siteUrl(),
                logo: `${siteUrl()}/brand/mrproperti-logo.png`,
                image: `${siteUrl()}/images/hero.webp`,
                areaServed: ["Cikarang", "Bekasi"],
                ...(settings.whatsapp ? { telephone: settings.whatsapp } : {}),
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
              {
                "@type": "FAQPage",
                mainEntity: homeFaq.map(([question, answer]) => ({
                  "@type": "Question",
                  name: question,
                  acceptedAnswer: { "@type": "Answer", text: answer },
                })),
              },
            ],
          }),
        }}
      />
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
        className="section container home-property-section"
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
          {properties.slice(0, 9).map((p) => (
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
        <div className="home-property-next">
          <Link className="outline-button" href="/properti">
            Listing selanjutnya <ArrowRight size={18} aria-hidden="true" />
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
          <div className="service-team-action">
            <Link href="/tim-kami" className="button service-team-button">
              <UsersRound size={18} aria-hidden="true" />
              <span>Tim Kami</span>
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
      <section className="consign-feature" aria-labelledby="consign-title">
        <Image
          src="/images/consign-interior.webp"
          alt=""
          fill
          sizes="100vw"
          className="consign-feature-photo"
        />
        <div className="container consign-feature-content">
          <p className="eyebrow">PROPERTI ANDA, PELUANG BARU</p>
          <h2 id="consign-title">
            Punya properti?
            <br />
            Biar kami bantu <span>temukan pemilik barunya.</span>
          </h2>
          <p className="consign-feature-description">
            Titipkan rumah, tanah, atau ruang usaha Anda. Isi informasinya, tim
            kami akan membantu langkah selanjutnya.
          </p>
          <Link className="button" href="/titip-properti">
            Titip Properti Saya <ArrowUpRight size={18} />
          </Link>
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
      <TestimonialSection testimonials={testimonials} />
      <section className="container faq-section">
        <div>
          <p className="eyebrow">BIAR MAKIN YAKIN</p>
          <h2>Hal yang sering ditanyakan.</h2>
        </div>
        <div>
          {homeFaq.map(([q, a]) => (
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
