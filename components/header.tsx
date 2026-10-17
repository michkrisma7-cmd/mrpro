"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, Menu, X, UserRound, Heart } from "lucide-react";
import { BrandMark } from "./icons";
export function Header() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="container nav-row">
        <Link className="brand" href="/" aria-label="MR Properti beranda">
          <BrandMark />
          <span>
            mr<span className="brand-light">properti</span>
            <small>RUANG UNTUK CERITA ANDA</small>
          </span>
        </Link>
        <nav
          className={open ? "main-nav is-open" : "main-nav"}
          aria-label="Navigasi utama"
        >
          {[
            ["/", "Beranda"],
            ["/properti", "Properti"],
            ["/layanan", "Layanan Tukang"],
            ["/#tentang", "Tentang Kami"],
          ].map(([href, label]) => (
            <Link
              onClick={() => setOpen(false)}
              className={path === href ? "active" : ""}
              key={href}
              href={href}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="nav-actions">
          <Link
            className="icon-button saved-nav"
            href="/properti?favorit=1"
            aria-label="Properti tersimpan"
          >
            <Heart size={19} />
          </Link>
          <Link href="/akun" className="login-link">
            <UserRound size={17} />
            <span>Masuk</span>
          </Link>
          <Link href="/titip-properti" className="button button-small">
            Titip Properti <ArrowUpRight size={16} />
          </Link>
          <button
            className="icon-button menu-toggle"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Tutup menu" : "Buka menu"}
            aria-expanded={open}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </header>
  );
}
