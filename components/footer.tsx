import { business, businessPhone } from "@/lib/business";
import type { Settings } from "@/lib/types";
import Link from "next/link";
import { BrandLogo } from "./brand-logo";
export function Footer({ settings }: { settings: Settings }) {
  const phone = businessPhone(settings.whatsapp);
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link className="brand" href="/" aria-label="MR Properti beranda">
              <BrandLogo />
            </Link>
          </div>
          <nav className="footer-menu" aria-labelledby="footer-services-title">
            <h3 id="footer-services-title">Layanan</h3>
            <Link href="/properti?transaksi=Dijual">Properti dijual</Link>
            <Link href="/properti?transaksi=Disewa">Properti disewa</Link>
            <Link href="/titip-properti">Pasang Iklan</Link>
            <Link href="/layanan">Layanan tukang</Link>
            <Link href="/layanan?jenis=Renovasi">Renovasi rumah</Link>
          </nav>
          <nav className="footer-menu" aria-labelledby="footer-company-title">
            <h3 id="footer-company-title">MR Properti</h3>
            <Link href="/tentang-kami">Tentang MR Properti</Link>
            <Link href="/tim-kami">Tim Kami</Link>
            <Link href="/kemitraan">Kemitraan</Link>
            <Link href="/kalkulator-kpr">Kalkulator KPR</Link>
            <a
              href="https://linktr.ee/mrpropertix"
              target="_blank"
              rel="noopener noreferrer"
            >
              Akses Media Sosial
            </a>
            <Link href="/login">Masuk ke akun</Link>
            {phone && <a href={`tel:${phone}`}>{phone}</a>}
          </nav>
        </div>
        <div className="footer-bottom">
          <nav className="footer-legal" aria-label="Informasi legal">
            <Link href="/syarat-dan-ketentuan">Syarat &amp; Ketentuan</Link>
            <Link href="/kebijakan-privasi">Kebijakan Privasi</Link>
          </nav>
          <p>
            © {new Date().getFullYear()} {business.name}. Semua hak dilindungi.
          </p>
        </div>
      </div>
    </footer>
  );
}
