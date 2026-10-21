import Link from "next/link";
import { HomeServiceIcon } from "./home-service-icon";
import { ArrowLeft, ArrowUpRight, Clock3, MessageCircle } from "lucide-react";
import { type HomeService, serviceTimeGuide } from "@/lib/home-services";
import { getSettings } from "@/lib/data";
import { siteUrl, whatsappLink } from "@/lib/format";
import { breadcrumbs, jsonLd } from "@/lib/seo";

export async function HomeServiceDetail({ service }: { service: HomeService }) {
  const settings = await getSettings();
  const wa = whatsappLink(
    settings.whatsapp,
    `Halo MR Properti, saya ingin konsultasi layanan ${service.name}.`,
  );
  return (
    <article className="container page-wrap home-service-detail">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Beranda</Link>
        <span>/</span>
        <Link href="/layanan">Layanan</Link>
        <span>/</span>
        <span aria-current="page">{service.name}</span>
      </nav>
      <header className="page-heading">
        <p className="eyebrow">PERBAIKAN & PEMELIHARAAN RUMAH</p>
        <div className="home-service-introduction">
          <div className="home-service-identity">
            <HomeServiceIcon slug={service.slug} />
            <h1>{service.name}</h1>
          </div>
          <div className="home-service-copy">
            <p className="home-service-summary">{service.summary}</p>
            <div className="home-service-description">
              {service.description.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
        </div>
      </header>
      <div className="home-service-detail-layout">
        <div>
          <section
            aria-labelledby="service-work-title"
            className="home-service-work"
          >
            <h2 id="service-work-title">Pilihan pekerjaan</h2>
            {service.jobs.map((job, index) => (
              <details
                key={job.title}
                className="home-service-job"
                open={index === 0}
              >
                <summary>{job.title}</summary>
                <div className="home-service-job-body">
                  <p>{job.description}</p>
                  <dl>
                    {job.details.map((detail) => (
                      <div key={detail.label}>
                        <dt>{detail.label}</dt>
                        <dd>{detail.text}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </details>
            ))}
          </section>
          <section
            className="home-service-prices"
            aria-labelledby="service-price-title"
          >
            <h2 id="service-price-title">Uraian harga {service.name}</h2>
            <p className="home-service-price-note">
              Estimasi biaya menyesuaikan kondisi lokasi, lingkup pekerjaan, dan
              kebutuhan material. Konfirmasikan harga akhir sebelum pekerjaan
              dimulai.
            </p>
            {service.priceGroups.map((group) => (
              <div className="home-service-table" key={group.title}>
                <table>
                  <caption>{group.title}</caption>
                  <thead>
                    <tr>
                      <th scope="col">Pekerjaan / material</th>
                      <th scope="col">Estimasi biaya</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((item) => (
                      <tr key={item.label}>
                        <th scope="row">{item.label}</th>
                        <td>{item.price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </section>
        </div>
        <aside className="home-service-guide">
          <h2>
            <Clock3 size={21} aria-hidden="true" /> Panduan estimasi waktu
          </h2>
          <ul>
            {serviceTimeGuide.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
          {wa ? (
            <a
              href={wa}
              className="button full-width"
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle size={18} /> Konsultasi layanan{" "}
              <ArrowUpRight size={17} />
            </a>
          ) : (
            <p className="notice">Kontak konsultasi belum tersedia.</p>
          )}
          <Link href="/layanan" className="text-button">
            <ArrowLeft size={16} /> Semua layanan
          </Link>
        </aside>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd([
            {
              "@context": "https://schema.org",
              "@type": "Service",
              name: service.name,
              description: service.jobs.map((job) => job.title).join(", "),
              url: `${siteUrl()}/layanan/${service.slug}`,
              provider: { "@type": "Organization", name: "MR Properti" },
            },
            breadcrumbs([
              { name: "Beranda", path: "/" },
              { name: "Layanan", path: "/layanan" },
              { name: service.name, path: `/layanan/${service.slug}` },
            ]),
          ]),
        }}
      />
    </article>
  );
}
