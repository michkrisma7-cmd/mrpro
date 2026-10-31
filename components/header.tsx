"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowUpRight, Menu, X, UserRound, Heart } from "lucide-react";
import { BrandLogo } from "./brand-logo";
export function Header() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const advertRef = useRef<HTMLAnchorElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    const header = headerRef.current;
    const advert = advertRef.current;
    if (!header || !advert) return;
    const measure = () => {
      const bounds = header.getBoundingClientRect();
      header.style.setProperty(
        "--mobile-menu-width",
        `${advert.getBoundingClientRect().left - bounds.left}px`,
      );
      header.style.setProperty("--header-height", `${bounds.height}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    observer.observe(advert);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !navRef.current?.contains(event.target) &&
        !toggleRef.current?.contains(event.target)
      )
        setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return (
    <header className="site-header" ref={headerRef}>
      <div className="container nav-row">
        <Link className="brand" href="/" aria-label="MR Properti beranda">
          <BrandLogo preload />
        </Link>
        <nav
          ref={navRef}
          id="header-navigation"
          className={open ? "main-nav is-open" : "main-nav"}
          aria-label="Navigasi utama"
        >
          {[
            ["/", "Beranda"],
            ["/properti", "Properti"],
            ["/layanan", "Layanan Tukang"],
            ["/blog", "Blog"],
            ["/tim-kami", "Tim Kami"],
            ["/kemitraan", "Kemitraan"],
            ["/syarat-dan-ketentuan", "Syarat dan Ketentuan"],
            ["/tentang-kami", "Tentang Kami"],
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
          <Link
            ref={advertRef}
            href="/titip-properti"
            className={`button button-small ${path === "/" ? "home-neutral-button" : ""}`}
          >
            {path === "/" ? "Pasang Iklan" : "Titip Properti"}{" "}
            <ArrowUpRight size={16} />
          </Link>
          <button
            ref={toggleRef}
            type="button"
            className="icon-button menu-toggle"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Tutup menu" : "Buka menu"}
            aria-expanded={open}
            aria-controls="header-navigation"
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </header>
  );
}
