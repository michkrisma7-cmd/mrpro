import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import terms from "@/lib/terms.json";

export const metadata = pageMetadata({
  title: "Kebijakan Privasi",
  description:
    "Ketentuan penggunaan data pribadi dan kerahasiaan dalam layanan MR Properti, termasuk tujuan pemrosesan, pembagian data, serta hak pengguna.",
  path: "/kebijakan-privasi",
});

export default function PrivacyPage() {
  const privacy = terms
    .flatMap((group) => group.sections)
    .find((section) => section.number === 39)!;
  // The final paragraph points readers to this page; keep the substantive clauses here.
  const paragraphs = privacy.paragraphs.slice(0, -1);
  return (
    <article className="container page-wrap legal-page">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Beranda</Link>
        <span>/</span>
        <span aria-current="page">Kebijakan Privasi</span>
      </nav>
      <header className="page-heading">
        <p className="eyebrow">MR PROPERTI</p>
        <h1>Kebijakan Privasi</h1>
        <p>
          Penggunaan data pribadi dan kerahasiaan dalam layanan MR Properti.
        </p>
      </header>
      <div className="legal-content">
        <section className="legal-group" aria-labelledby="privacy-title">
          <h2 id="privacy-title">Data pribadi dan kerahasiaan</h2>
          <div className="legal-clause">
            {paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>
      </div>
      <p className="privacy-related">
        <Link className="text-button" href="/syarat-dan-ketentuan#ketentuan-39">
          Baca Syarat dan Ketentuan terkait data pribadi
        </Link>
      </p>
    </article>
  );
}
