import type { Metadata } from "next";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/manrope";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { getSettings } from "@/lib/data";
import { siteUrl } from "@/lib/format";
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "MR Properti — Ruang baru, cerita baru.",
    template: "%s | MR Properti",
  },
  robots: {
    index: Boolean(
      process.env.DATABASE_URL &&
      process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://"),
    ),
    follow: true,
  },
  description:
    "Temukan properti pilihan untuk dijual atau disewa, titipkan properti Anda, dan hubungi jasa tukang untuk kebutuhan rumah. Bersama MR Properti.",
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "MR Properti",
    title: "MR Properti — Ruang baru, cerita baru.",
    description: "Properti pilihan dan layanan untuk setiap rencana Anda.",
    images: [{ url: "/images/hero.webp", width: 1536, height: 1024 }],
  },
  twitter: { card: "summary_large_image" },
};
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const settings = await getSettings();
  return (
    <html lang="id">
      <body>
        <a className="skip-link" href="#konten">
          Langsung ke konten
        </a>
        <Header />
        <main id="konten">{children}</main>
        <Footer settings={settings} />
      </body>
    </html>
  );
}
