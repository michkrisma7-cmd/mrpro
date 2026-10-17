import Link from "next/link";
import { House, ArrowLeft } from "lucide-react";
export default function NotFound() {
  return (
    <div className="container page-wrap">
      <div className="empty-state">
        <House size={44} />
        <p className="eyebrow">404 · RUANG INI BELUM ADA</p>
        <h1>Sepertinya Anda salah alamat.</h1>
        <p>
          Halaman mungkin sudah berpindah atau properti tidak lagi tersedia.
        </p>
        <Link href="/properti" className="button">
          <ArrowLeft size={17} />
          Kembali ke Properti
        </Link>
      </div>
    </div>
  );
}
