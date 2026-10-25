import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import terms from "@/lib/terms.json";

export const metadata = pageMetadata({
  title: "Syarat dan Ketentuan",
  description:
    "Syarat dan ketentuan penggunaan layanan MR Properti, pemasaran properti, pekerjaan rumah, pembayaran, garansi, dan penyelesaian keluhan.",
  path: "/syarat-dan-ketentuan",
});

export default function TermsPage() {
  return (
    <article className="container page-wrap legal-page">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Beranda</Link>
        <span>/</span>
        <span aria-current="page">Syarat dan Ketentuan</span>
      </nav>
      <header className="page-heading">
        <p className="eyebrow">MR PROPERTI</p>
        <h1>Syarat dan Ketentuan</h1>
        <p>
          Cikarang, <time dateTime="2026-10-20">20 Oktober 2026</time>
        </p>
      </header>
      <nav className="legal-contents" aria-labelledby="legal-contents-title">
        <h2 id="legal-contents-title">Daftar isi</h2>
        <ol>
          {terms.map((group) => (
            <li key={group.id}>
              <a href={`#${group.id}`}>
                {group.title.replace(/^[B-E]\. /, "")}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <div className="legal-content">
        {terms.map((group) => (
          <section
            key={group.id}
            aria-labelledby={group.id}
            className="legal-group"
          >
            <h2 id={group.id}>{group.title}</h2>
            {group.sections.map((section) => (
              <section
                key={section.number}
                aria-labelledby={`ketentuan-${section.number}`}
                className="legal-clause"
              >
                <h3 id={`ketentuan-${section.number}`}>
                  {section.number}. {section.title}
                </h3>
                {section.paragraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </section>
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}
