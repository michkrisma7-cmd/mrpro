import Link from "next/link";
import { ArrowUpRight, MapPin, Mail } from "lucide-react";
import { BrandMark } from "./icons";
import type { Settings } from "@/lib/types";
import { whatsappLink } from "@/lib/format";
export function Footer({ settings }: { settings: Settings }) {
  const wa = whatsappLink(
    settings.whatsapp,
    "Halo MR Properti, saya ingin berkonsultasi.",
  );
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Link className="brand" href="/">
              <BrandMark />
              <span>
                mr<span className="brand-light">properti</span>
                <small>RUANG UNTUK CERITA ANDA</small>
              </span>
            </Link>
            <p>
              Lebih dari sekadar properti.
              <br />
              Partner untuk setiap rencana Anda.
            </p>
            <span className="footer-location">
              <MapPin size={15} />
              {settings.area}
            </span>
          </div>
          <div>
            <h3>Temukan Ruang</h3>
            <Link href="/properti?transaksi=Dijual">Properti dijual</Link>
            <Link href="/properti?transaksi=Disewa">Properti disewa</Link>
            <Link href="/titip-properti">Titip properti</Link>
          </div>
          <div>
            <h3>Untuk Rumah Anda</h3>
            <Link href="/layanan">Layanan tukang</Link>
            <Link href="/layanan?jenis=Renovasi">Renovasi rumah</Link>
            <Link href="/#tentang">Tentang MR Properti</Link>
            <Link href="/tim-kami">Tim Kami</Link>
            <Link href="/kalkulator-kpr">Kalkulator KPR</Link>
          </div>
          <div>
            <h3>Mari Terhubung</h3>
            {wa ? (
              <a href={wa} target="_blank" rel="noopener noreferrer">
                Konsultasi WhatsApp <ArrowUpRight size={14} />
              </a>
            ) : (
              <Link href="/titip-properti">
                Kirim kebutuhan Anda <ArrowUpRight size={14} />
              </Link>
            )}
            {settings.email && (
              <a href={`mailto:${settings.email}`}>
                <Mail size={14} />
                {settings.email}
              </a>
            )}
            <Link href="/login">
              Masuk ke akun <ArrowUpRight size={14} />
            </Link>
            <Link href="/syarat-dan-ketentuan">Syarat dan Ketentuan</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} MR Properti. Setiap ruang punya cerita.
          </span>
          <span>Dibuat untuk langkah baru Anda. </span>
        </div>
      </div>
    </footer>
  );
}
